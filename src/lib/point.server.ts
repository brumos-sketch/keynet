import { supabaseAdmin } from "@/integrations/supabase/client.server";

function normalizeAccessCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Finds the point that owns this access code, or throws. */
export async function resolveKioskByAccessCode(accessCode: string) {
  const clean = normalizeAccessCode(accessCode);
  if (!clean) throw new Error("Código de acceso inválido");

  const { data: kiosks } = await supabaseAdmin
    .from("kiosks")
    .select("id, name, address, positions, is_24h, schedule, access_code");

  const kiosk = (kiosks ?? []).find(
    (k) => normalizeAccessCode(k.access_code ?? "") === clean,
  );
  if (!kiosk) throw new Error("Código de acceso inválido");
  return kiosk;
}

/** Finds the locker that owns the Bearer API key in the request, or throws. */
export async function resolveLockerByBearer(headers: Headers) {
  const auth = headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === auth) throw new Error("Falta la API key del locker");
  const { hashLockerKey } = await import("@/lib/locker-key");
  const { data: kiosk } = await supabaseAdmin
    .from("kiosks")
    .select("id, name, address, positions, is_24h, schedule, access_code")
    .eq("point_type", "locker")
    .eq("api_key_hash", await hashLockerKey(token))
    .maybeSingle();
  if (!kiosk) throw new Error("API key inválida o revocada");
  return kiosk;
}
