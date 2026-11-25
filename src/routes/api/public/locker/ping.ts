import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { accessCodeSchema, errorJson, json, preflight } from "@/lib/locker-api.server";

const bodySchema = z.object({ accessCode: accessCodeSchema });

export const Route = createFileRoute("/api/public/locker/ping")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        try {
          const data = bodySchema.parse(await request.json());
          const { guardedResolveKiosk } = await import("@/lib/guard.server");
          const { clientIp } = await import("@/lib/throttle.server");
          const ip = clientIp(request.headers);
          const kiosk = await guardedResolveKiosk(data.accessCode, ip);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const lastSeen = new Date().toISOString();
          await supabaseAdmin.from("kiosks").update({ last_seen_at: lastSeen }).eq("id", kiosk.id);
          return json({ ok: true, kioskName: kiosk.name, lastSeen });
        } catch (err) {
          return errorJson(err, 401);
        }
      },
    },
  },
});
