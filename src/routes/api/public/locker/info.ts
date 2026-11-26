import { createFileRoute } from "@tanstack/react-router";
import { errorJson, json, preflight } from "@/lib/locker-api.server";

export const Route = createFileRoute("/api/public/locker/info")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        try {
          const { guardedResolveLocker } = await import("@/lib/guard.server");
          const { clientIp } = await import("@/lib/throttle.server");
          const kiosk = await guardedResolveLocker(request.headers, clientIp(request.headers));
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: cfg } = await supabaseAdmin.from("kiosks").select("admin_code").eq("id", kiosk.id).maybeSingle();
          // adminCode: 6-digit secret that opens the locker's configuration menu (shown as 123-456).
          return json({ ok: true, name: kiosk.name, address: kiosk.address, positions: kiosk.positions, is24h: kiosk.is_24h, adminCode: cfg?.admin_code ?? "456852" });
        } catch (err) {
          return errorJson(err, 401);
        }
      },
    },
  },
});
