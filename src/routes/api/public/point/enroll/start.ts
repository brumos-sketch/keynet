import { createFileRoute } from "@tanstack/react-router";
import { preflight } from "@/lib/locker-api.server";

export const Route = createFileRoute("/api/public/point/enroll/start")({
  server: { handlers: {
    OPTIONS: async () => preflight(),
    POST: async ({ request }) => {
      const { enrollmentHandler } = await import("@/lib/locker-enrollment.server");
      return enrollmentHandler(request, "start", "point");
    },
  } },
});