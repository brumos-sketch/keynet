import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { errorJson, json, preflight } from "@/lib/locker-api.server";

const bodySchema = z.object({
  code: z.string().trim().min(3).max(12),
});

export const Route = createFileRoute("/api/public/locker/validate")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        try {
          const data = bodySchema.parse(await request.json());
          const { guardedResolveLocker } = await import("@/lib/guard.server");
          const { clientIp } = await import("@/lib/throttle.server");
          const ip = clientIp(request.headers);
          const kiosk = await guardedResolveLocker(request.headers, ip);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { guardedValidateCode } = await import("@/lib/guard.server");
          const result = await guardedValidateCode(kiosk.id, data.code, ip);
          await supabaseAdmin.from("kiosks").update({ last_seen_at: new Date().toISOString() }).eq("id", kiosk.id);
          const action = result.action.includes("pick") ? "pickup" : result.action.includes("depos") ? "deposit" : result.action;
          const message =
            action === "deposit"
              ? `Casillero ${result.position} abierto. Depositá la llave y cerrá la puerta`
              : action === "pickup"
                ? `Casillero ${result.position} abierto. Retirá la llave y cerrá la puerta`
                : "Operación confirmada";
          return json({ ok: true, action, rawAction: result.action, position: result.position, bookingRef: result.bookingRef, message });
        } catch (err) {
          return errorJson(err);
        }
      },
    },
  },
});
