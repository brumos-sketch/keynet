import { createFileRoute } from "@tanstack/react-router";
import { accessCodeSchema, errorJson, json, preflight } from "@/lib/locker-api.server";

export const Route = createFileRoute("/api/public/locker/info")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        try {
          const accessCode = accessCodeSchema.parse(new URL(request.url).searchParams.get("accessCode") ?? "");
          const { guardedResolveKiosk } = await import("@/lib/guard.server");
          const { clientIp } = await import("@/lib/throttle.server");
          const kiosk = await guardedResolveKiosk(accessCode, clientIp(request.headers));
          return json({ ok: true, name: kiosk.name, address: kiosk.address, positions: kiosk.positions, is24h: kiosk.is_24h });
        } catch (err) {
          return errorJson(err, 401);
        }
      },
    },
  },
});
