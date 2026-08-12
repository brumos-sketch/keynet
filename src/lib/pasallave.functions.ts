import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  generateBookingRef,
  generateExchangeCode,
  generateKioskCode,
  pickFreePosition,
} from "@/lib/pasallave";

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
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
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

async function assertAdmin(context: { supabase: TypedSupabase; userId: string }) {
  if (!(await isAdmin(context))) throw new Error("Forbidden");
}

async function loadAdminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function reservePosition(supabase: TypedSupabase, kioskId: string) {
  const { data: kiosk } = await supabase.from("kiosks").select("positions").eq("id", kioskId).maybeSingle();
  if (!kiosk) throw new Error("Punto no encontrado");
  const { data: taken } = await supabase
    .from("key_exchanges")
    .select("locker_position")
    .eq("kiosk_id", kioskId)
    .in("status", ["created", "waiting_deposit", "deposited", "picked_up"]);
  const position = pickFreePosition(
    kiosk.positions,
    (taken ?? []).map((x: { locker_position: number | null }) => x.locker_position ?? 0).filter(Boolean),
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
    return { ok: true };
  });

// ---------- key creation ----------

const createKeySchema = z.object({
  name: z.string().trim().min(1).max(80),
  propertyName: z.string().trim().max(120).optional().nullable(),
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

    // Insert key
    let depositCode: string | null = null;
    if (data.subscriptionType !== "one_use") {
      depositCode = generateExchangeCode(); // fixed deposit code for monthly/pro
    }
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

    // For monthly create a "free" exchange with a bidirectional return code
    if (data.subscriptionType === "monthly") {
      const returnCode = generateExchangeCode();
      const { error: exError } = await supabaseAdmin.from("key_exchanges").insert({
        key_id: key.id,
        kiosk_id: data.kioskId,
        booking_ref: generateBookingRef(),
        locker_position: 0,
        deposit_code: depositCode!,
        pickup_code: returnCode,
        return_code: returnCode,
        status: "created",
        check_in: null,
        check_out: null,
      });
      if (exError) throw exError;
    }

    if (data.subscriptionType === "pro") {
      // Pro guest access code: one reusable access code that covers deposit and pickup
      const { error: acError } = await supabaseAdmin.from("access_codes").insert({
        key_id: key.id,
        code: generateKioskCode().replace("PP-", "").slice(0, 6),
        role: "guest",
        reusable: true,
        scope: "both",
        status: "active",
      });
      if (acError) throw acError;
    }

    return { keyId: key.id };
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
    const { data: key } = await supabase.from("keys").select("*").eq("id", data.keyId).maybeSingle();
    if (!key) throw new Error("Llave no encontrada");
    if (key.locked) throw new Error("La llave está bloqueada");

    const admin = await isAdmin(context);
    const { data: myHost } = await supabase.rpc("my_host_id");
    if (!admin && myHost !== key.host_id) throw new Error("No tenés permiso para esta llave");

    const position = await reservePosition(supabase, key.kiosk_id!);
    const bookingRef = generateBookingRef();

    let depositCode: string;
    let pickupCode: string;
    let returnCode: string | null = null;

    if (key.subscription_type === "monthly") {
      // Monthly uses the fixed deposit code and a bidirectional return code
      depositCode = key.deposit_code!;
      returnCode = generateExchangeCode();
      pickupCode = returnCode;
    } else if (key.subscription_type === "pro") {
      // Pro uses an access code for both deposit and pickup
      const { data: codes } = await supabase
        .from("access_codes")
        .select("code")
        .eq("key_id", key.id)
        .eq("status", "active")
        .eq("scope", "both")
        .limit(1);
      if (!codes || codes.length === 0) throw new Error("No hay código de acceso Pro activo para esta llave");
      depositCode = codes[0]!.code;
      pickupCode = codes[0]!.code;
    } else {
      // one_use
      depositCode = generateExchangeCode();
      pickupCode = generateExchangeCode();
    }

    const { data: exchange, error } = await supabase
      .from("key_exchanges")
      .insert({
        key_id: key.id,
        kiosk_id: key.kiosk_id,
        booking_ref: bookingRef,
        locker_position: position,
        deposit_code: depositCode,
        pickup_code: pickupCode,
        return_code: returnCode,
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
    const key = (exchange as unknown as { keys: { subscription_type: string; host_id: string } }).keys;
    if (key.subscription_type !== "one_use") throw new Error("Solo se pueden renovar intercambios de un solo uso");
    if (exchange.status !== "expired") throw new Error("Solo se pueden renovar intercambios vencidos");

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
    const extraAmount = extraDays * 1500; // EXTRA_DAY_PRICE

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
    const { data: key } = await supabase.from("keys").select("*").eq("id", data.keyId).maybeSingle();
    if (!key) throw new Error("Llave no encontrada");

    const { data: myHost } = await supabase.rpc("my_host_id");
    const admin = await isAdmin(context);
    if (!admin && myHost !== key.host_id) throw new Error("No tenés permiso para esta llave");
    if (key.subscription_type !== "pro") throw new Error("Los códigos de acceso solo aplican al plan Pro");

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
    const { data: code } = await supabase.from("access_codes").select("*, keys!inner(host_id)").eq("id", data.codeId).maybeSingle();
    if (!code) throw new Error("Código no encontrado");
    const key = (code as unknown as { keys: { host_id: string } }).keys;

    const { data: myHost } = await supabase.rpc("my_host_id");
    const admin = await isAdmin(context);
    if (!admin && myHost !== key.host_id) throw new Error("No tenés permiso para este código");

    const { error } = await supabase.from("access_codes").update({ status: data.status }).eq("id", data.codeId);
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

    const clean = normalizeCode(data.code);
    const cleanHyphenated = clean.length === 6 ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean;
    const now = nowIso();
    const today = new Date().toISOString().slice(0, 10);
    const currentTime = new Date().toISOString().slice(11, 16); // HH:MM

    // 1. Pro access codes first
    const { data: accessCodes } = await supabase
      .from("access_codes")
      .select("*, keys!inner(id, kiosk_id, host_id, subscription_type)")
      .or(codeSearchConditions("code", clean))
      .eq("status", "active")
      .eq("keys.kiosk_id", myKioskId);
    if (accessCodes && accessCodes.length > 0) {
      const ac = accessCodes[0]!;
      const key = (ac as unknown as { keys: { id: string; kiosk_id: string; host_id: string; subscription_type: string } }).keys;

      // validity check
      if (ac.has_validity) {
        if (ac.valid_from && today < ac.valid_from) throw new Error("El código aún no es válido");
        if (ac.valid_to && today > ac.valid_to) throw new Error("El código expiró");
        if (ac.time_from && currentTime < ac.time_from) throw new Error("El código aún no es válido en este horario");
        if (ac.time_to && currentTime > ac.time_to) throw new Error("El código ya no es válido en este horario");
      }

      // Find or create an exchange for this access code
      const { data: activeExchanges } = await supabase
        .from("key_exchanges")
        .select("*")
        .eq("key_id", key.id)
        .in("status", ["created", "waiting_deposit", "deposited", "picked_up"])
        .order("created_at", { ascending: false });
      const active = activeExchanges?.[0];

      if (ac.scope === "deposit") {
        if (active && (active.status === "waiting_deposit" || active.status === "created")) {
          await supabase
            .from("key_exchanges")
            .update({ status: "deposited", deposited_at: now })
            .eq("id", active.id);
          return { action: "deposited", position: active.locker_position, bookingRef: active.booking_ref };
        }
        // No active exchange: create a free one
        const position = await reservePosition(supabase, myKioskId);
        const { data: created } = await supabase
          .from("key_exchanges")
          .insert({
            key_id: key.id,
            kiosk_id: myKioskId,
            booking_ref: generateBookingRef(),
            locker_position: position,
            deposit_code: clean,
            pickup_code: clean,
            status: "deposited",
            deposited_at: now,
          })
          .select("*")
          .single();
        return { action: "deposited", position, bookingRef: created?.booking_ref ?? null };
      }

      if (ac.scope === "pickup") {
        if (!active || active.status !== "deposited") throw new Error("No hay llave depositada para retirar con este código");
        await supabase.from("key_exchanges").update({ status: "picked_up", picked_up_at: now }).eq("id", active.id);
        return { action: "picked_up", position: active.locker_position, bookingRef: active.booking_ref };
      }

      // scope === both
      if (!active) {
        const position = await reservePosition(supabase, myKioskId);
        const { data: created } = await supabase
          .from("key_exchanges")
          .insert({
            key_id: key.id,
            kiosk_id: myKioskId,
            booking_ref: generateBookingRef(),
            locker_position: position,
            deposit_code: clean,
            pickup_code: clean,
            status: "deposited",
            deposited_at: now,
          })
          .select("*")
          .single();
        return { action: "deposited", position, bookingRef: created?.booking_ref ?? null };
      }
      if (active.status === "waiting_deposit" || active.status === "created") {
        await supabase.from("key_exchanges").update({ status: "deposited", deposited_at: now }).eq("id", active.id);
        return { action: "deposited", position: active.locker_position, bookingRef: active.booking_ref };
      }
      if (active.status === "deposited") {
        await supabase.from("key_exchanges").update({ status: "picked_up", picked_up_at: now }).eq("id", active.id);
        return { action: "picked_up", position: active.locker_position, bookingRef: active.booking_ref };
      }
      if (active.status === "picked_up") {
        await supabase.from("key_exchanges").update({ status: "completed", returned_at: now }).eq("id", active.id);
        return { action: "completed", position: active.locker_position, bookingRef: active.booking_ref };
      }
      throw new Error("El intercambio ya fue completado");
    }

    // 2. Fixed deposit codes (monthly keys)
    const { data: keys } = await supabase
      .from("keys")
      .select("*")
      .or(codeSearchConditions("deposit_code", clean))
      .eq("kiosk_id", myKioskId);
    if (keys && keys.length > 0) {
      const key = keys[0]!;
      if (key.subscription_type === "monthly") {
        // Find or create the monthly free exchange
        const { data: existing } = await supabase
          .from("key_exchanges")
          .select("*")
          .eq("key_id", key.id)
          .or(codeSearchConditions("deposit_code", clean))
          .in("status", ["created", "waiting_deposit", "deposited", "picked_up"])
          .order("created_at", { ascending: false })
          .maybeSingle();
        if (existing) {
          if (existing.status === "waiting_deposit" || existing.status === "created") {
            await supabase.from("key_exchanges").update({ status: "deposited", deposited_at: now }).eq("id", existing.id);
            return { action: "deposited", position: existing.locker_position, bookingRef: existing.booking_ref };
          }
          if (existing.status === "deposited") {
            await supabase.from("key_exchanges").update({ status: "picked_up", picked_up_at: now }).eq("id", existing.id);
            return { action: "picked_up", position: existing.locker_position, bookingRef: existing.booking_ref };
          }
          if (existing.status === "picked_up") {
            await supabase.from("key_exchanges").update({ status: "completed", returned_at: now }).eq("id", existing.id);
            return { action: "completed", position: existing.locker_position, bookingRef: existing.booking_ref };
          }
        }
        // create free monthly exchange
        const position = await reservePosition(supabase, myKioskId);
        const returnCode = generateExchangeCode();
        const { data: created } = await supabase
          .from("key_exchanges")
          .insert({
            key_id: key.id,
            kiosk_id: myKioskId,
            booking_ref: generateBookingRef(),
            locker_position: position,
            deposit_code: clean,
            pickup_code: returnCode,
            return_code: returnCode,
            status: "deposited",
            deposited_at: now,
          })
          .select("*")
          .single();
        return { action: "deposited", position, bookingRef: created?.booking_ref ?? null };
      }
    }

    // 3. Exchange codes (one_use deposit/pickup, monthly return_code)
    const { data: exchanges } = await supabase
      .from("key_exchanges")
      .select("*, keys!inner(subscription_type)")
      .eq("kiosk_id", myKioskId)
      .or(
        `${codeSearchConditions("deposit_code", clean)},` +
          `${codeSearchConditions("pickup_code", clean)},` +
          `${codeSearchConditions("return_code", clean)}`,
      );
    if (exchanges && exchanges.length > 0) {
      const ex = exchanges[0]!;
      const key = (ex as unknown as { keys: { subscription_type: string } }).keys;

      const returnCodeMatch =
        ex.return_code ?? (key.subscription_type !== "one_use" ? ex.pickup_code : null);

      if (codesMatch(ex.deposit_code, clean)) {
        if (ex.status !== "waiting_deposit" && ex.status !== "created") throw new Error("Esta llave ya fue depositada o el intercambio terminó");
        await supabase.from("key_exchanges").update({ status: "deposited", deposited_at: now }).eq("id", ex.id);
        return { action: "deposited", position: ex.locker_position, bookingRef: ex.booking_ref };
      }
      // For monthly/pro the same code can return and then pick up; try return first when picked_up.
      if (codesMatch(returnCodeMatch, clean)) {
        if (ex.status === "picked_up") {
          await supabase.from("key_exchanges").update({ status: "completed", returned_at: now }).eq("id", ex.id);
          return { action: "completed", position: ex.locker_position, bookingRef: ex.booking_ref };
        }
        if (ex.status !== "deposited") throw new Error("No hay llave retirada para devolver");
      }
      if (codesMatch(ex.pickup_code, clean)) {
        if (ex.status !== "deposited") throw new Error("No hay llave depositada para retirar");
        await supabase.from("key_exchanges").update({ status: "picked_up", picked_up_at: now }).eq("id", ex.id);
        return { action: "picked_up", position: ex.locker_position, bookingRef: ex.booking_ref };
      }
      if (codesMatch(returnCodeMatch, clean)) {
        throw new Error("No hay llave retirada para devolver");
      }
    }

    throw new Error("Código no encontrado o no válido");
  });
