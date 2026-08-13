import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { generateBookingRef, generateExchangeCode, pickFreePosition } from "@/lib/pasallave";
import { sendPushToUser } from "@/lib/push.server";

type TypedSupabase = SupabaseClient<Database>;

// ---------- helpers ----------

function nowIso() {
  return new Date().toISOString();
}

function in48Hours() {
  const d = new Date();
  d.setHours(d.getHours() + 48);
  return d.toISOString();
}

function normalizeCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function hyphenatedCode(value: string) {
  const clean = normalizeCode(value);
  if (clean.length === 6) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return clean;
}

function codeSearchConditions(field: string, code: string) {
  const clean = normalizeCode(code);
  const hyp = hyphenatedCode(code);
  if (clean === hyp) return `${field}.eq.${clean}`;
  return `${field}.eq.${clean},${field}.eq.${hyp}`;
}

function codesMatch(a: string | null, b: string) {
  if (!a) return false;
  return normalizeCode(a) === normalizeCode(b);
}

async function isAdmin(context: { supabase: TypedSupabase; userId: string }) {
  const { data } = await context.supabase.rpc("is_admin");
  return !!data;
}

async function loadAdminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function reservePosition(supabase: TypedSupabase, kioskId: string) {
  const { data: kiosk } = await supabase
    .from("kiosks")
    .select("positions")
    .eq("id", kioskId)
    .maybeSingle();
  if (!kiosk) throw new Error("Punto no encontrado");
  // A locker is occupied only while a key is physically inside it:
  // status 'deposited' (waiting for the guest) or 'completed' (guest returned it).
  const { data: taken } = await supabase
    .from("key_exchanges")
    .select("locker_position")
    .eq("kiosk_id", kioskId)
    .in("status", ["deposited", "completed"])
    .gt("locker_position", 0);
  const position = pickFreePosition(
    kiosk.positions,
    (taken ?? [])
      .map((x: { locker_position: number | null }) => x.locker_position ?? 0)
      .filter(Boolean),
  );
  if (position === 0) throw new Error("No hay posiciones libres");
  return position;
}

// ---------- expire old one-use exchanges ----------

export const expireOneUseExchanges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const supabaseAdmin = await loadAdminClient();
    await supabaseAdmin.rpc("expire_one_use_exchanges");

    // Notify hosts about newly overdue stays (one notification per booking)
    const { data: expired } = await supabaseAdmin
      .from("key_exchanges")
      .select("booking_ref, keys(host_id, name)")
      .eq("status", "expired")
      .limit(100);
    for (const row of expired ?? []) {
      const key = (row as unknown as { keys: { host_id: string | null; name: string } | null })
        .keys;
      if (!key?.host_id) continue;
      const { data: already } = await supabaseAdmin
        .from("notifications")
        .select("id")
        .eq("host_id", key.host_id)
        .eq("type", "expired")
        .eq("booking_ref", row.booking_ref)
        .maybeSingle();
      if (already) continue;
      const message = `La estadía ${row.booking_ref} de "${key.name}" venció. Podés renovarla con días extra.`;
      await supabaseAdmin.from("notifications").insert({
        host_id: key.host_id,
        type: "expired",
        booking_ref: row.booking_ref,
        message,
      });
      const { data: hostRow } = await supabaseAdmin
        .from("hosts")
        .select("user_id")
        .eq("id", key.host_id)
        .maybeSingle();
      if (hostRow?.user_id) {
        await sendPushToUser(supabaseAdmin, hostRow.user_id, {
          title: "Pasallave · estadía vencida",
          body: message,
          tag: `exchange-expired`,
          data: { url: "/host" },
        });
      }
    }

    return { ok: true };
  });

// ---------- key creation ----------

const createKeySchema = z.object({
  name: z.string().trim().min(1).max(80),
  propertyName: z.string().trim().max(300).optional().nullable(),
  hostId: z.string().uuid(),
  kioskId: z.string().uuid(),
  subscriptionType: z.enum(["one_use", "monthly", "pro"]),
});

export const createKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createKeySchema.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context);
    if (!admin) {
      const { data: myHost } = await context.supabase.rpc("my_host_id");
      if (!myHost || myHost !== data.hostId) throw new Error("Forbidden");
    }
    const supabaseAdmin = await loadAdminClient();

    // Verify host and kiosk exist
    const [{ data: host }, { data: kiosk }] = await Promise.all([
      supabaseAdmin.from("hosts").select("id").eq("id", data.hostId).maybeSingle(),
      supabaseAdmin.from("kiosks").select("id").eq("id", data.kioskId).maybeSingle(),
    ]);
    if (!host) throw new Error("Anfitrión no encontrado");
    if (!kiosk) throw new Error("Punto no encontrado");

    // Insert key — every key gets a fixed, unique deposit code (host side)
    const depositCode = generateExchangeCode();
    const { data: key, error: keyError } = await supabaseAdmin
      .from("keys")
      .insert({
        name: data.name,
        property_name: data.propertyName ?? null,
        host_id: data.hostId,
        kiosk_id: data.kioskId,
        subscription_type: data.subscriptionType,
        deposit_code: depositCode,
      })
      .select("*")
      .single();
    if (keyError || !key) throw new Error(keyError?.message ?? "No se pudo crear la llave");

    // Every plan starts with an exchange ready to be deposited.
    const bidiCode = generateExchangeCode();
    const bookingRef = generateBookingRef();
    const { data: exchange, error: exError } = await supabaseAdmin
      .from("key_exchanges")
      .insert({
        key_id: key.id,
        kiosk_id: data.kioskId,
        booking_ref: bookingRef,
        locker_position: 0,
        deposit_code: depositCode,
        pickup_code: bidiCode,
        return_code: bidiCode,
        status: "waiting_deposit",
        check_in: null,
        check_out: null,
      })
      .select("id")
      .single();
    if (exError || !exchange)
      throw new Error(exError?.message ?? "No se pudo crear el intercambio");

    if (data.subscriptionType === "pro") {
      // Pro guest access code: one reusable access code that covers deposit and pickup
      const { error: acError } = await supabaseAdmin.from("access_codes").insert({
        key_id: key.id,
        code: generateExchangeCode(),
        role: "guest",
        reusable: true,
        scope: "both",
        status: "active",
      });
      if (acError) throw acError;
    }

    return { keyId: key.id, exchangeId: exchange.id, bookingRef };
  });

// ---------- exchange edit (host / admin) ----------

const updateExchangeSchema = z.object({
  exchangeId: z.string().uuid(),
  checkIn: z.string().optional().nullable(),
  checkOut: z.string().optional().nullable(),
  pickupTime: z.string().optional().nullable(),
  guestName: z.string().trim().max(80).optional().nullable(),
});

const EDITABLE_STATUSES = ["created", "waiting_deposit", "deposited"];

export const updateExchange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateExchangeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: exchange } = await supabase
      .from("key_exchanges")
      .select("*, keys!inner(host_id)")
      .eq("id", data.exchangeId)
      .maybeSingle();
    if (!exchange) throw new Error("Intercambio no encontrado");
    const key = (exchange as unknown as { keys: { host_id: string } }).keys;

    const admin = await isAdmin(context);
    const { data: myHost } = await supabase.rpc("my_host_id");
    if (!admin && myHost !== key.host_id) throw new Error("No tenés permiso para este intercambio");

    if (!EDITABLE_STATUSES.includes(exchange.status)) {
      throw new Error("La estadía ya no se puede editar");
    }

    const { error } = await supabase
      .from("key_exchanges")
      .update({
        check_in: data.checkIn || null,
        check_out: data.checkOut || null,
        pickup_time: data.pickupTime || null,
      })
      .eq("id", data.exchangeId);
    if (error) throw error;

    await supabase.from("access_log").insert({
      key_id: exchange.key_id,
      action: "exchange_updated",
      role: "host",
      person_name: data.guestName ?? null,
    });

    return { ok: true };
  });

// ---------- exchange creation (host) ----------

const createExchangeSchema = z.object({
  keyId: z.string().uuid(),
  checkIn: z.string().optional().nullable(),
  checkOut: z.string().optional().nullable(),
  pickupTime: z.string().optional().nullable(),
  guestName: z.string().trim().max(80).optional().nullable(),
});

export const createExchange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createExchangeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load key and verify ownership (host or admin)
    const { data: key } = await supabase
      .from("keys")
      .select("*")
      .eq("id", data.keyId)
      .maybeSingle();
    if (!key) throw new Error("Llave no encontrada");
    if (key.locked) throw new Error("La llave está bloqueada");

    const admin = await isAdmin(context);
    const { data: myHost } = await supabase.rpc("my_host_id");
    if (!admin && myHost !== key.host_id) throw new Error("No tenés permiso para esta llave");

    // The locker position is assigned at deposit time, not now.
    const bookingRef = generateBookingRef();

    // Fixed deposit code per key (all plans). Backfill if the key predates this rule.
    let depositCode = key.deposit_code;
    if (!depositCode) {
      depositCode = generateExchangeCode();
      await supabase.from("keys").update({ deposit_code: depositCode }).eq("id", key.id);
    }

    // Single bidirectional code: the guest uses it to pick up AND to return.
    const bidiCode = generateExchangeCode();

    const { data: exchange, error } = await supabase
      .from("key_exchanges")
      .insert({
        key_id: key.id,
        kiosk_id: key.kiosk_id,
        booking_ref: bookingRef,
        locker_position: 0,
        deposit_code: depositCode,
        pickup_code: bidiCode,
        return_code: bidiCode,
        pickup_time: data.pickupTime ?? null,
        check_in: data.checkIn ?? null,
        check_out: data.checkOut ?? null,
        status: "waiting_deposit",
      })
      .select("*")
      .single();
    if (error || !exchange) throw new Error(error?.message ?? "No se pudo crear el intercambio");

    await supabase.from("access_log").insert({
      key_id: key.id,
      action: "exchange_created",
      role: "host",
      person_name: data.guestName ?? null,
    });

    return { exchangeId: exchange.id, bookingRef } as { exchangeId: string; bookingRef: string };
  });

// ---------- renew an expired one-use exchange ----------

const renewExchangeSchema = z.object({
  exchangeId: z.string().uuid(),
  extraDays: z.number().int().min(0).max(30),
});

export const renewExchange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => renewExchangeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: exchange } = await supabase
      .from("key_exchanges")
      .select("*, keys!inner(subscription_type, host_id)")
      .eq("id", data.exchangeId)
      .maybeSingle();
    if (!exchange) throw new Error("Intercambio no encontrado");
    const key = (exchange as unknown as { keys: { subscription_type: string; host_id: string } })
      .keys;
    if (key.subscription_type !== "one_use")
      throw new Error("Solo se pueden renovar intercambios de un solo uso");
    if (exchange.status !== "expired")
      throw new Error("Solo se pueden renovar intercambios vencidos");

    const { data: myHost } = await supabase.rpc("my_host_id");
    const admin = await isAdmin(context);
    if (!admin && myHost !== key.host_id) throw new Error("No tenés permiso para este intercambio");

    // Update billing row for the host, adding extra days
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    const { data: billing } = await supabase
      .from("billing")
      .select("id, extra_days, extra_amount")
      .eq("host_id", key.host_id)
      .eq("period", period)
      .maybeSingle();

    const extraDays = data.extraDays;
    const { data: extraRow } = await supabase
      .from("plan_prices")
      .select("amount")
      .eq("plan", "extra_day")
      .maybeSingle();
    const extraAmount = extraDays * (extraRow?.amount ?? 1500);

    if (billing) {
      await supabase
        .from("billing")
        .update({
          extra_days: (billing.extra_days ?? 0) + extraDays,
          extra_amount: (billing.extra_amount ?? 0) + extraAmount,
        })
        .eq("id", billing.id);
    } else {
      await supabase.from("billing").insert({
        host_id: key.host_id,
        period,
        extra_days: extraDays,
        extra_amount: extraAmount,
        status: "pending",
      });
    }

    // Reset status to created and extend timeline
    const { error } = await supabase
      .from("key_exchanges")
      .update({ status: "created", created_at: nowIso() })
      .eq("id", data.exchangeId);
    if (error) throw error;

    return { ok: true };
  });

// ---------- access code management (pro) ----------

const createAccessCodeSchema = z.object({
  keyId: z.string().uuid(),
  scope: z.enum(["deposit", "pickup", "both"]),
  role: z.enum(["guest", "cleaning", "maintenance", "other"]).default("guest"),
  personName: z.string().trim().max(80).optional().nullable(),
  hasValidity: z.boolean().default(false),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
  timeFrom: z.string().optional().nullable(),
  timeTo: z.string().optional().nullable(),
  reusable: z.boolean().default(true),
});

export const createAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createAccessCodeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: key } = await supabase
      .from("keys")
      .select("*")
      .eq("id", data.keyId)
      .maybeSingle();
    if (!key) throw new Error("Llave no encontrada");

    const { data: myHost } = await supabase.rpc("my_host_id");
    const admin = await isAdmin(context);
    if (!admin && myHost !== key.host_id) throw new Error("No tenés permiso para esta llave");
    if (key.subscription_type !== "pro")
      throw new Error("Los códigos de acceso solo aplican al plan Pro");

    const code = generateExchangeCode();
    const { error } = await supabase.from("access_codes").insert({
      key_id: key.id,
      code,
      role: data.role,
      person_name: data.personName ?? null,
      has_validity: data.hasValidity,
      valid_from: data.validFrom ?? null,
      valid_to: data.validTo ?? null,
      time_from: data.timeFrom ?? null,
      time_to: data.timeTo ?? null,
      reusable: data.reusable,
      scope: data.scope,
      status: "active",
    });
    if (error) throw error;
    return { code };
  });

const toggleAccessCodeSchema = z.object({
  codeId: z.string().uuid(),
  status: z.enum(["active", "inactive"]),
});

export const toggleAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => toggleAccessCodeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: code } = await supabase
      .from("access_codes")
      .select("*, keys!inner(host_id)")
      .eq("id", data.codeId)
      .maybeSingle();
    if (!code) throw new Error("Código no encontrado");
    const key = (code as unknown as { keys: { host_id: string } }).keys;

    const { data: myHost } = await supabase.rpc("my_host_id");
    const admin = await isAdmin(context);
    if (!admin && myHost !== key.host_id) throw new Error("No tenés permiso para este código");

    const { error } = await supabase
      .from("access_codes")
      .update({ status: data.status })
      .eq("id", data.codeId);
    if (error) throw error;
    return { ok: true };
  });

// ---------- code validation at kiosk ----------

const validateCodeSchema = z.object({
  code: z.string().trim().min(3).max(12),
});

export const validateCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => validateCodeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: myKioskId } = await supabase.rpc("my_kiosk_id");
    if (!myKioskId) throw new Error("No tenés un punto asignado");
    const { runCodeValidation } = await import("@/lib/exchange.server");
    return runCodeValidation(supabase, myKioskId, data.code);
  });

// ---------- associate overview (occupancy + commissions) ----------

export const associateOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: associateId } = await supabase.rpc("my_associate_id");
    if (!associateId) throw new Error("No sos asociado");

    const supabaseAdmin = await loadAdminClient();

    const { data: kiosks } = await supabaseAdmin
      .from("kiosks")
      .select("id, name, category, positions, commission_percent, address")
      .eq("associate_id", associateId)
      .order("name");

    const kioskIds = (kiosks ?? []).map((k) => k.id);
    if (kioskIds.length === 0) return { kiosks: [], exchanges: [] };

    const { data: exchanges } = await supabaseAdmin
      .from("key_exchanges")
      .select(
        "id, kiosk_id, booking_ref, status, created_at, locker_position, keys(name, subscription_type)",
      )
      .in("kiosk_id", kioskIds)
      .order("created_at", { ascending: false })
      .limit(200);

    const activeStatuses = ["created", "waiting_deposit", "deposited", "picked_up"];
    const withOccupancy = (kiosks ?? []).map((k) => ({
      ...k,
      used: (exchanges ?? []).filter(
        (e) => e.kiosk_id === k.id && activeStatuses.includes(e.status),
      ).length,
    }));

    return {
      kiosks: withOccupancy,
      exchanges: (exchanges ?? []).slice(0, 20).map((e) => ({
        id: e.id,
        kiosk_id: e.kiosk_id,
        booking_ref: e.booking_ref,
        status: e.status,
        created_at: e.created_at,
        keyName: (e as unknown as { keys: { name: string } | null }).keys?.name ?? "—",
        plan:
          (e as unknown as { keys: { subscription_type: string } | null }).keys
            ?.subscription_type ?? "",
      })),
    };
  });

// ---------- public (anon) client ----------

function publicClient(): TypedSupabase {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input as RequestInfo, { ...init, headers: h });
      },
    },
  });
}

export type PublicKiosk = {
  id: string;
  name: string;
  address: string | null;
  category: string;
  custom_category: string | null;
  positions: number;
  is_24h: boolean;
  schedule: Record<string, { open: string; close: string } | null> | null;
  lat: number | null;
  lng: number | null;
  free_positions: number;
};

export const listPublicKiosks = createServerFn({ method: "GET" }).handler(async () => {
  const supabasePublic = publicClient();
  const { data, error } = await (
    supabasePublic.rpc as unknown as (
      fn: string,
    ) => Promise<{ data: PublicKiosk[] | null; error: { message: string } | null }>
  )("search_kiosks_public");
  if (error) return { kiosks: [] as PublicKiosk[], error: error.message };
  return { kiosks: data ?? [], error: null as string | null };
});

export type BoardingPass = {
  booking_ref: string;
  status: string;
  locker_position: number;
  deposit_code: string;
  pickup_code: string | null;
  pickup_time: string | null;
  check_in: string | null;
  check_out: string | null;
  key_name: string | null;
  property_name: string | null;
  kiosk_name: string | null;
  kiosk_address: string | null;
  kiosk_is_24h: boolean | null;
  kiosk_schedule: Record<string, { open: string; close: string } | null> | null;
  kiosk_lat: number | null;
  kiosk_lng: number | null;
};

export const getBoardingPass = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ ref: z.string().trim().min(3).max(16) }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabasePublic = publicClient();
    const { data: rows } = await (
      supabasePublic.rpc as unknown as (
        fn: string,
        args: Record<string, string>,
      ) => Promise<{ data: BoardingPass[] | null; error: { message: string } | null }>
    )("boarding_pass", { _ref: data.ref });
    return { pass: rows?.[0] ?? null };
  });

export const joinWaitlist = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        address: z.string().trim().min(3).max(200),
        email: z.string().trim().email(),
        name: z.string().trim().max(80).optional().nullable(),
        phone: z.string().trim().max(40).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabasePublic = publicClient();
    const { error } = await supabasePublic.from("waitlist").insert({
      address: data.address,
      email: data.email,
      name: data.name ?? null,
      phone: data.phone ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- billing generation (admin) ----------

async function loadPlanAmounts(): Promise<Record<string, number>> {
  const supabaseAdmin = await loadAdminClient();
  const { data } = await supabaseAdmin.from("plan_prices").select("plan, amount");
  const map: Record<string, number> = { one_use: 7500, monthly: 30000, pro: 0 };
  for (const row of data ?? []) map[row.plan] = row.amount ?? 0;
  return map;
}

export const generateBillingPeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ period: z.string().regex(/^\d{4}-\d{2}$/) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden");
    const supabaseAdmin = await loadAdminClient();
    const PLAN_AMOUNT = await loadPlanAmounts();
    const period = data.period;
    const from = `${period}-01T00:00:00.000Z`;
    const toDate = new Date(`${period}-01T00:00:00.000Z`);
    toDate.setMonth(toDate.getMonth() + 1);
    const to = toDate.toISOString();

    const [{ data: hosts }, { data: keys }, { data: exchanges }, { data: pro }] = await Promise.all(
      [
        supabaseAdmin.from("hosts").select("id"),
        supabaseAdmin.from("keys").select("id, host_id, kiosk_id, subscription_type"),
        supabaseAdmin
          .from("key_exchanges")
          .select("id, key_id, kiosk_id, created_at")
          .gte("created_at", from)
          .lt("created_at", to),
        supabaseAdmin.from("pro_agreements").select("host_id, monthly_price, status"),
      ],
    );

    let hostRows = 0;
    for (const host of hosts ?? []) {
      const hostKeys = (keys ?? []).filter((k) => k.host_id === host.id);
      if (hostKeys.length === 0) continue;
      const hostKeyIds = hostKeys.map((k) => k.id);
      const hostExchanges = (exchanges ?? []).filter(
        (e) => e.key_id && hostKeyIds.includes(e.key_id),
      );

      const proDeal = (pro ?? []).find((p) => p.host_id === host.id && p.status === "active");
      const plan = proDeal
        ? "pro"
        : hostKeys.some((k) => k.subscription_type === "monthly")
          ? "monthly"
          : "one_use";

      let amount = 0;
      if (proDeal) {
        amount = proDeal.monthly_price ?? 0;
      } else {
        for (const k of hostKeys) {
          if (k.subscription_type === "monthly") amount += PLAN_AMOUNT["monthly"]!;
        }
        const oneUseKeyIds = hostKeys
          .filter((k) => k.subscription_type === "one_use")
          .map((k) => k.id);
        amount +=
          hostExchanges.filter((e) => e.key_id && oneUseKeyIds.includes(e.key_id)).length *
          PLAN_AMOUNT["one_use"]!;
      }

      const { data: existing } = await supabaseAdmin
        .from("billing")
        .select("id, extra_days, extra_amount")
        .eq("host_id", host.id)
        .eq("period", period)
        .maybeSingle();

      const payload = {
        host_id: host.id,
        period,
        plan,
        keys_count: hostKeys.length,
        exchanges_count: hostExchanges.length,
        amount,
      };
      if (existing) {
        await supabaseAdmin.from("billing").update(payload).eq("id", existing.id);
      } else {
        await supabaseAdmin.from("billing").insert({ ...payload, status: "pending" });
      }
      hostRows += 1;
    }

    // Point commissions
    const { data: kiosks } = await supabaseAdmin.from("kiosks").select("id, commission_percent");
    let kioskRows = 0;
    for (const kiosk of kiosks ?? []) {
      const kioskExchanges = (exchanges ?? []).filter((e) => e.kiosk_id === kiosk.id);
      const revenue = kioskExchanges.reduce((sum, e) => {
        const key = (keys ?? []).find((k) => k.id === e.key_id);
        if (!key) return sum;
        return sum + (PLAN_AMOUNT[key.subscription_type] ?? 0);
      }, 0);
      const total = Math.round((revenue * (kiosk.commission_percent ?? 0)) / 100);

      const { data: existing } = await supabaseAdmin
        .from("point_commissions")
        .select("id")
        .eq("kiosk_id", kiosk.id)
        .eq("period", period)
        .maybeSingle();
      const payload = {
        kiosk_id: kiosk.id,
        period,
        plans_revenue: revenue,
        commission_percent: kiosk.commission_percent,
        total,
      };
      if (existing) {
        await supabaseAdmin.from("point_commissions").update(payload).eq("id", existing.id);
      } else {
        await supabaseAdmin.from("point_commissions").insert({ ...payload, status: "pending" });
      }
      kioskRows += 1;
    }

    return { hostRows, kioskRows, period };
  });

// ---------- simulated payment ----------

export const payBilling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ billingId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row } = await supabase
      .from("billing")
      .select("id, host_id, amount, extra_amount, status")
      .eq("id", data.billingId)
      .maybeSingle();
    if (!row) throw new Error("Factura no encontrada");

    const admin = await isAdmin(context);
    const { data: myHost } = await supabase.rpc("my_host_id");
    if (!admin && myHost !== row.host_id) throw new Error("No tenés permiso para esta factura");
    if (row.status === "paid") return { ok: true, alreadyPaid: true };

    const supabaseAdmin = await loadAdminClient();
    const { error } = await supabaseAdmin
      .from("billing")
      .update({ status: "paid", paid_at: nowIso() })
      .eq("id", row.id);
    if (error) throw error;

    const { data: hostRow } = await supabaseAdmin
      .from("hosts")
      .select("user_id")
      .eq("id", row.host_id ?? "")
      .maybeSingle();
    let notifyPush = true;
    if (hostRow?.user_id) {
      const { data: prefs } = await supabaseAdmin
        .from("profiles")
        .select("notify_push")
        .eq("id", hostRow.user_id)
        .maybeSingle();
      notifyPush = prefs?.notify_push ?? true;
    }
    const message = `Pago registrado por ${(row.amount ?? 0) + (row.extra_amount ?? 0)} ARS.`;
    if (notifyPush) {
      await supabaseAdmin.from("notifications").insert({
        host_id: row.host_id,
        type: "payment",
        message,
      });
      if (hostRow?.user_id) {
        await sendPushToUser(supabaseAdmin, hostRow.user_id, {
          title: "Pasallave · pago confirmado",
          body: message,
          tag: `payment`,
          data: { url: "/checkout" },
        });
      }
    }

    return { ok: true, alreadyPaid: false };
  });

// ---------- pro agreements (admin) ----------

export const saveProAgreement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional().nullable(),
        hostId: z.string().uuid(),
        monthlyPrice: z.number().int().min(0),
        keysIncluded: z.number().int().min(0),
        discountPercent: z.number().int().min(0).max(100),
        startDate: z.string().optional().nullable(),
        status: z.enum(["active", "paused", "ended"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden");
    const supabaseAdmin = await loadAdminClient();
    const payload = {
      host_id: data.hostId,
      monthly_price: data.monthlyPrice,
      keys_included: data.keysIncluded,
      discount_percent: data.discountPercent,
      start_date: data.startDate || null,
      status: data.status,
    };
    const { error } = data.id
      ? await supabaseAdmin.from("pro_agreements").update(payload).eq("id", data.id)
      : await supabaseAdmin.from("pro_agreements").insert(payload);
    if (error) throw error;
    return { ok: true };
  });

export const deleteProAgreement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden");
    const supabaseAdmin = await loadAdminClient();
    const { error } = await supabaseAdmin.from("pro_agreements").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
