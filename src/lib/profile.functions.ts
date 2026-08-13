import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Datos y preferencias de aviso del usuario logueado. */
export const getNotificationPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("name, email, phone, notify_email, notify_push")
      .eq("id", context.userId)
      .maybeSingle();

    return {
      name: data?.name ?? null,
      email: data?.email ?? null,
      phone: data?.phone ?? null,
      notifyEmail: data?.notify_email ?? true,
      notifyPush: data?.notify_push ?? true,
    };
  });

/** Guarda nombre y teléfono del usuario logueado. */
export const saveProfileInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(1, "Ingresá tu nombre").max(120),
        phone: z.string().trim().max(30).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ name: data.name, phone: data.phone?.trim() || null })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const saveNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ notifyEmail: z.boolean(), notifyPush: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ notify_email: data.notifyEmail, notify_push: data.notifyPush })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
