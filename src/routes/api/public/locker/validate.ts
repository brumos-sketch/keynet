import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { accessCodeSchema, errorJson, json, preflight } from "@/lib/locker-api.server";

const bodySchema = z.object({
  accessCode: accessCodeSchema,
  code: z.string().trim().min(3).max(12),
});

export const Route = createFileRoute("/api/public/locker/validate")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        try {
          const data = bodySchema.parse(await request.json());
          const { resolveKioskByAccessCode } = await import("@/lib/point.server");
          const kiosk = await resolveKioskByAccessCode(data.accessCode);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { runCodeValidation } = await import("@/lib/exchange.server");
          const result = await runCodeValidation(supabaseAdmin, kiosk.id, data.code);
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
