import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function getWebPush() {
  const mod = await import("web-push");
  return mod.default ?? (mod as unknown as typeof import("web-push"));
}

async function configureVapid() {
  const webpush = await getWebPush();
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

type PushPayload = {
  title: string;
  body: string;
  tag?: string;
  data?: { url?: string; [key: string]: unknown };
};

export async function sendPushToUser(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  payload: PushPayload,
) {
  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return { sent: 0 };

  const webpush = await getWebPush();
  await configureVapid();
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
      const err = (result as PromiseRejectedResult).reason as { statusCode?: number } | undefined;
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
