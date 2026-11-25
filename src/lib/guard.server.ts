import { RULES } from "@/lib/throttle";
import { assertNotLocked, clearFailures, recordFailure } from "@/lib/throttle.server";

/** Resolves a point by access code, blocking an IP after repeated wrong codes. */
export async function guardedResolveKiosk(accessCode: string, ip: string) {
  const key = `login:${ip}`;
  await assertNotLocked([key]);
  const { resolveKioskByAccessCode } = await import("@/lib/point.server");
  try {
    const kiosk = await resolveKioskByAccessCode(accessCode);
    await clearFailures([key]);
    return kiosk;
  } catch (err) {
    await recordFailure([[key, RULES.pointLogin]]);
    throw err;
  }
}

/** Validates a key code at a point, blocking after repeated unknown codes. */
export async function guardedValidateCode(kioskId: string, code: string, ip: string) {
  const deviceKey = `code:${kioskId}:${ip}`;
  const pointKey = `code:${kioskId}`;
  await assertNotLocked([deviceKey, pointKey]);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { runCodeValidation } = await import("@/lib/exchange.server");
  try {
    const result = await runCodeValidation(supabaseAdmin, kioskId, code);
    await clearFailures([deviceKey]);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("no encontrado")) {
      await recordFailure([[deviceKey, RULES.codeDevice], [pointKey, RULES.codePoint]]);
    }
    throw err;
  }
}
