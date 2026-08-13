import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import webpush from "web-push";

const saveSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string(),
  auth: z.string(),
  deviceInfo: z.string().optional().nullable(),
});

function configureVapid() {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured");
  }
  webpush.setVapidDetails(
    "mailto:soporte@pasallave.com",
    publicKey,
    privateKey,
  );
}

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["VAPID_PUBLIC_KEY"];
  if (!key) throw new Error("VAPID public key is not configured");
  return { publicKey: key };
});

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveSubscriptionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        device_info: data.deviceInfo ?? null,
      },
      { onConflict: "user_id, endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ endpoint: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", context.userId)
      .eq("endpoint", data.endpoint);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

type PushPayload = {
  title: string;
  body: string;
  tag?: string;
  data?: { url?: string; [key: string]: unknown };
};

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return { sent: 0 };

  configureVapid();
  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body,
      );
    }),
  );

  // Remove invalid subscriptions
  const deadEndpoints: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i]!;
    if (result.status === "rejected") {
      const err = (result as PromiseRejectedResult).reason as webpush.WebPushError | undefined;
      if (err && (err.statusCode === 404 || err.statusCode === 410)) {
        deadEndpoints.push(subs[i]!.endpoint);
      }
    }
  }

  if (deadEndpoints.length > 0) {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", deadEndpoints)
      .eq("user_id", userId);
  }

  return { sent: results.filter((r) => r.status === "fulfilled").length };
}
