import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
    const { resolveKioskByAccessCode } = await import("@/lib/point.server");
    const kiosk = await resolveKioskByAccessCode(data.accessCode);
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
    const { resolveKioskByAccessCode } = await import("@/lib/point.server");
    const kiosk = await resolveKioskByAccessCode(data.accessCode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runCodeValidation } = await import("@/lib/exchange.server");
    return runCodeValidation(supabaseAdmin, kiosk.id, data.code);
  });

/** Heartbeat from an open point terminal; marks the point as online. */
export const pointPing = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => accessSchema.parse(input))
  .handler(async ({ data }) => {
    const { resolveKioskByAccessCode } = await import("@/lib/point.server");
    const kiosk = await resolveKioskByAccessCode(data.accessCode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("kiosks").update({ last_seen_at: new Date().toISOString() }).eq("id", kiosk.id);
    return { ok: true };
  });
