import { createFileRoute } from "@tanstack/react-router";
import { errorJson, json, preflight } from "@/lib/locker-api.server";

export const Route = createFileRoute("/api/public/locker/ping")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        try {
          const { guardedResolveLocker } = await import("@/lib/guard.server");
          const { clientIp } = await import("@/lib/throttle.server");
          const ip = clientIp(request.headers);
          const kiosk = await guardedResolveLocker(request.headers, ip);
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
