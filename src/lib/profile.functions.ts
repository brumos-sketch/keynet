import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Preferencias de aviso del usuario logueado. */
export const getNotificationPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("name, email, notify_email, notify_push")
      .eq("id", context.userId)
      .maybeSingle();

    return {
      name: data?.name ?? null,
      email: data?.email ?? null,
      notifyEmail: data?.notify_email ?? true,
      notifyPush: data?.notify_push ?? true,
    };
  });

export const saveNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ notifyEmail: z.boolean(), notifyPush: z.boolean() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ notify_email: data.notifyEmail, notify_push: data.notifyPush })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
