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
