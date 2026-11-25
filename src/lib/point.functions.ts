import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function ip() {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { clientIp } = await import("@/lib/throttle.server");
  return clientIp(getRequest().headers);
}

const accessSchema = z.object({
  apiKey: z.string().trim().min(64).max(100),
});

const validateSchema = accessSchema.extend({
  code: z.string().trim().min(3).max(12),
});

async function resolvePoint(apiKey: string) {
  const { guardedResolveLocker } = await import("@/lib/guard.server");
  return guardedResolveLocker(new Headers({ authorization: `Bearer ${apiKey}` }), await ip(), "point");
}

/** Public terminal: every operation checks the paired device credential. */
export const pointLogin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => accessSchema.parse(input))
  .handler(async ({ data }) => {
    const kiosk = await resolvePoint(data.apiKey);
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
    const kiosk = await resolvePoint(data.apiKey);
    const { guardedValidateCode } = await import("@/lib/guard.server");
    return guardedValidateCode(kiosk.id, data.code, await ip());
  });

/** Heartbeat from an open point terminal; marks the point as online. */
export const pointPing = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => accessSchema.parse(input))
  .handler(async ({ data }) => {
    const kiosk = await resolvePoint(data.apiKey);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("kiosks").update({ last_seen_at: new Date().toISOString() }).eq("id", kiosk.id);
    return { ok: true };
  });
