import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function ip() {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { clientIp } = await import("@/lib/throttle.server");
  return clientIp(getRequest().headers);
}

const accessSchema = z.object({
  accessCode: z.string().trim().min(3).max(20),
});

const validateSchema = accessSchema.extend({
  code: z.string().trim().min(3).max(12),
});

/** Public panel session for a physical point, identified only by its access code. */
export const pointLogin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => accessSchema.parse(input))
  .handler(async ({ data }) => {
    const { guardedResolveKiosk } = await import("@/lib/guard.server");
    const kiosk = await guardedResolveKiosk(data.accessCode, await ip());
    return {
      id: kiosk.id,
      name: kiosk.name,
      address: kiosk.address,
      is24h: kiosk.is_24h,
      schedule: kiosk.schedule,
      positions: kiosk.positions,
    };
  });

export const pointValidateCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => validateSchema.parse(input))
  .handler(async ({ data }) => {
    const { guardedResolveKiosk } = await import("@/lib/guard.server");
    const kiosk = await guardedResolveKiosk(data.accessCode, await ip());
    const { guardedValidateCode } = await import("@/lib/guard.server");
    return guardedValidateCode(kiosk.id, data.code, await ip());
  });

/** Heartbeat from an open point terminal; marks the point as online. */
export const pointPing = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => accessSchema.parse(input))
  .handler(async ({ data }) => {
    const { guardedResolveKiosk } = await import("@/lib/guard.server");
    const kiosk = await guardedResolveKiosk(data.accessCode, await ip());
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("kiosks").update({ last_seen_at: new Date().toISOString() }).eq("id", kiosk.id);
    return { ok: true };
  });
