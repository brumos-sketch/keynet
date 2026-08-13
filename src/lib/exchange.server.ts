import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { generateBookingRef, generateExchangeCode, pickFreePosition } from "@/lib/pasallave";
import { sendPushToUser } from "@/lib/push.server";

type TypedSupabase = SupabaseClient<Database>;

function nowIso() {
  return new Date().toISOString();
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

async function reservePosition(supabase: TypedSupabase, kioskId: string) {
  const { data: kiosk } = await supabase
    .from("kiosks")
    .select("positions")
    .eq("id", kioskId)
    .maybeSingle();
  if (!kiosk) throw new Error("Punto no encontrado");
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

export type ValidationResult = {
  action: string;
  position: number | null;
  bookingRef: string | null;
};

/**
 * Resolves a code typed at a point, applies the exchange state machine,
 * logs the movement and notifies the host.
 */
export async function runCodeValidation(
  supabase: TypedSupabase,
  kioskId: string,
  rawCode: string,
): Promise<ValidationResult> {
  const clean = normalizeCode(rawCode);
  const now = nowIso();
  const today = new Date().toISOString().slice(0, 10);
  const currentTime = new Date().toISOString().slice(11, 16);

  let logKeyId: string | null = null;
  let logRole: string | null = "kiosk";
  let logPerson: string | null = null;

  const resolve = async (): Promise<ValidationResult> => {
    // 1. Pro access codes first
    const { data: accessCodes } = await supabase
      .from("access_codes")
      .select("*, keys!inner(id, kiosk_id, host_id, subscription_type)")
      .or(codeSearchConditions("code", clean))
      .eq("status", "active")
      .eq("keys.kiosk_id", kioskId);
    if (accessCodes && accessCodes.length > 0) {
      const ac = accessCodes[0]!;
      const key = (
        ac as unknown as {
          keys: { id: string; kiosk_id: string; host_id: string; subscription_type: string };
        }
      ).keys;
      logKeyId = key.id;
      logRole = ac.role ?? "guest";
      logPerson = ac.person_name ?? null;
      await supabase
        .from("access_codes")
        .update({ uses_count: (ac.uses_count ?? 0) + 1 })
        .eq("id", ac.id);
      if (!ac.reusable && (ac.uses_count ?? 0) >= 1) throw new Error("Este código ya fue usado");

      if (ac.has_validity) {
        if (ac.valid_from && today < ac.valid_from) throw new Error("El código aún no es válido");
        if (ac.valid_to && today > ac.valid_to) throw new Error("El código expiró");
        if (ac.time_from && currentTime < ac.time_from)
          throw new Error("El código aún no es válido en este horario");
        if (ac.time_to && currentTime > ac.time_to)
          throw new Error("El código ya no es válido en este horario");
      }

      const { data: activeExchanges } = await supabase
        .from("key_exchanges")
        .select("*")
        .eq("key_id", key.id)
        .in("status", ["created", "waiting_deposit", "deposited", "picked_up"])
        .order("created_at", { ascending: false });
      const active = activeExchanges?.[0];

      if (ac.scope === "deposit") {
        if (active && (active.status === "waiting_deposit" || active.status === "created")) {
          const position = await reservePosition(supabase, kioskId);
          await supabase
            .from("key_exchanges")
            .update({ status: "deposited", deposited_at: now, locker_position: position })
            .eq("id", active.id);
          return { action: "deposited", position, bookingRef: active.booking_ref };
        }
        const position = await reservePosition(supabase, kioskId);
        const { data: created } = await supabase
          .from("key_exchanges")
          .insert({
            key_id: key.id,
            kiosk_id: kioskId,
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
        if (!active || active.status !== "deposited")
          throw new Error("No hay llave depositada para retirar con este código");
        await supabase
          .from("key_exchanges")
          .update({ status: "picked_up", picked_up_at: now, locker_position: 0 })
          .eq("id", active.id);
        return {
          action: "picked_up",
          position: active.locker_position,
          bookingRef: active.booking_ref,
        };
      }

      // scope === both
      if (!active) {
        const position = await reservePosition(supabase, kioskId);
        const { data: created } = await supabase
          .from("key_exchanges")
          .insert({
            key_id: key.id,
            kiosk_id: kioskId,
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
        const position = await reservePosition(supabase, kioskId);
        await supabase
          .from("key_exchanges")
          .update({ status: "deposited", deposited_at: now, locker_position: position })
          .eq("id", active.id);
        return { action: "deposited", position, bookingRef: active.booking_ref };
      }
      if (active.status === "deposited") {
        await supabase
          .from("key_exchanges")
          .update({ status: "picked_up", picked_up_at: now, locker_position: 0 })
          .eq("id", active.id);
        return {
          action: "picked_up",
          position: active.locker_position,
          bookingRef: active.booking_ref,
        };
      }
      if (active.status === "picked_up") {
        const position = await reservePosition(supabase, kioskId);
        await supabase
          .from("key_exchanges")
          .update({ status: "completed", returned_at: now, locker_position: position })
          .eq("id", active.id);
        return { action: "completed", position, bookingRef: active.booking_ref };
      }
      throw new Error("El intercambio ya fue completado");
    }

    // 2. Fixed deposit code of the key (host side, all plans)
    const { data: keys } = await supabase
      .from("keys")
      .select("*")
      .or(codeSearchConditions("deposit_code", clean))
      .eq("kiosk_id", kioskId);
    if (keys && keys.length > 0) {
      const key = keys[0]!;
      logKeyId = key.id;

      const { data: openList } = await supabase
        .from("key_exchanges")
        .select("*")
        .eq("key_id", key.id)
        .in("status", ["created", "waiting_deposit", "deposited", "picked_up"])
        .order("created_at", { ascending: false })
        .limit(1);
      const existing = openList?.[0] ?? null;

      if (existing) {
        if (existing.status === "waiting_deposit" || existing.status === "created") {
          const position = await reservePosition(supabase, kioskId);
          await supabase
            .from("key_exchanges")
            .update({ status: "deposited", deposited_at: now, locker_position: position })
            .eq("id", existing.id);
          return { action: "deposited", position, bookingRef: existing.booking_ref };
        }
        if (existing.status === "deposited")
          throw new Error("Esta llave ya está depositada en el punto");
        throw new Error("La llave está en poder del huésped");
      }

      if (key.subscription_type === "one_use") {
        throw new Error("No hay una estadía esperando depósito para esta llave");
      }

      const position = await reservePosition(supabase, kioskId);
      const bidiCode = generateExchangeCode();
      const { data: created } = await supabase
        .from("key_exchanges")
        .insert({
          key_id: key.id,
          kiosk_id: kioskId,
          booking_ref: generateBookingRef(),
          locker_position: position,
          deposit_code: key.deposit_code!,
          pickup_code: bidiCode,
          return_code: bidiCode,
          status: "deposited",
          deposited_at: now,
        })
        .select("*")
        .single();
      return { action: "deposited", position, bookingRef: created?.booking_ref ?? null };
    }

    // 3. Guest bidirectional code of a stay (pickup + return)
    const { data: exchanges } = await supabase
      .from("key_exchanges")
      .select("*, keys!inner(subscription_type)")
      .eq("kiosk_id", kioskId)
      .or(
        `${codeSearchConditions("deposit_code", clean)},` +
          `${codeSearchConditions("pickup_code", clean)},` +
          `${codeSearchConditions("return_code", clean)}`,
      )
      .order("created_at", { ascending: false });
    if (exchanges && exchanges.length > 0) {
      const ex = exchanges[0]!;
      logKeyId = ex.key_id;

      const isGuestCode = codesMatch(ex.pickup_code, clean) || codesMatch(ex.return_code, clean);
      if (isGuestCode) {
        if (ex.status === "deposited") {
          await supabase
            .from("key_exchanges")
            .update({ status: "picked_up", picked_up_at: now, locker_position: 0 })
            .eq("id", ex.id);
          return { action: "picked_up", position: ex.locker_position, bookingRef: ex.booking_ref };
        }
        if (ex.status === "picked_up") {
          const position = await reservePosition(supabase, kioskId);
          await supabase
            .from("key_exchanges")
            .update({ status: "completed", returned_at: now, locker_position: position })
            .eq("id", ex.id);
          return { action: "completed", position, bookingRef: ex.booking_ref };
        }
        if (ex.status === "waiting_deposit" || ex.status === "created")
          throw new Error("La llave todavía no fue depositada en el punto");
        throw new Error("Este código ya no está vigente");
      }

      if (codesMatch(ex.deposit_code, clean)) {
        if (ex.status !== "waiting_deposit" && ex.status !== "created")
          throw new Error("Esta llave ya fue depositada o el intercambio terminó");
        const position = await reservePosition(supabase, kioskId);
        await supabase
          .from("key_exchanges")
          .update({ status: "deposited", deposited_at: now, locker_position: position })
          .eq("id", ex.id);
        return { action: "deposited", position, bookingRef: ex.booking_ref };
      }
    }

    throw new Error("Código no encontrado o no válido");
  };

  const result = await resolve();

  await supabase.from("access_log").insert({
    key_id: logKeyId,
    action: result.action,
    role: logRole,
    person_name: logPerson,
  });

  if (logKeyId) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: keyRow } = await supabaseAdmin
      .from("keys")
      .select("host_id, name")
      .eq("id", logKeyId)
      .maybeSingle();
    if (keyRow?.host_id) {
      const { data: hostRow } = await supabaseAdmin
        .from("hosts")
        .select("user_id")
        .eq("id", keyRow.host_id)
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
      const messages: Record<string, string> = {
        deposited: `Se depositó la llave "${keyRow.name}" en el punto.`,
        picked_up: `Se retiró la llave "${keyRow.name}" del punto.`,
        completed: `Se devolvió la llave "${keyRow.name}" al punto.`,
      };
      const message = messages[result.action] ?? `Movimiento registrado (${result.action}).`;
      if (notifyPush) {
        await supabaseAdmin.from("notifications").insert({
          host_id: keyRow.host_id,
          type: result.action,
          message,
          booking_ref: result.bookingRef,
        });
        if (hostRow?.user_id) {
          await sendPushToUser(hostRow.user_id, {
            title: "Pasallave · movimiento",
            body: message,
            tag: `exchange-${result.action}`,
            data: { url: "/host" },
          });
        }
      }
    }
  }

  return result;
}
