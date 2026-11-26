/** Códigos de configuración de lockers: ninguna llave puede recibirlos. */
export async function reservedLockerCodes(): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("kiosks").select("admin_code");
  return (data ?? []).map((k) => k.admin_code).filter(Boolean);
}
