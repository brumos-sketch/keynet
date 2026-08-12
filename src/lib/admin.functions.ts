import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createUserSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  name: z.string().trim().min(1).max(80),
  role: z.enum(["pending", "admin", "associate", "host", "kiosk"]),
  kioskId: z.string().uuid().nullable().optional(),
  phone: z.string().trim().max(40).optional().nullable(),
});

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "No se pudo crear el usuario");

    const userId = created.user.id;

    // Ensure the profile row exists even if the signup trigger did not create it.
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, email: data.email, name: data.name }, { onConflict: "id" });

    // The signup trigger created a host row + host role by default. Adjust it.

    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    if (data.role !== "host") {
      await supabaseAdmin.from("hosts").delete().eq("user_id", userId);
    }
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role });

    if (data.role === "associate") {
      await supabaseAdmin.from("associates").insert({
        user_id: userId,
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
      });
    }
    if (data.role === "kiosk" && data.kioskId) {
      await supabaseAdmin.from("profiles").update({ kiosk_id: data.kioskId }).eq("id", userId);
    }
    if (data.role === "host") {
      await supabaseAdmin
        .from("hosts")
        .update({ name: data.name, phone: data.phone ?? null })
        .eq("user_id", userId);
    }

    return { id: userId };
  });

const setRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["pending", "admin", "associate", "host", "kiosk"]),
  kioskId: z.string().uuid().nullable().optional(),
});

export const adminSetUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => setRoleSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name, email")
      .eq("id", data.userId)
      .maybeSingle();

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });

    if (data.role === "host") {
      const { data: existing } = await supabaseAdmin
        .from("hosts")
        .select("id")
        .eq("user_id", data.userId)
        .maybeSingle();
      if (!existing) {
        await supabaseAdmin.from("hosts").insert({
          user_id: data.userId,
          name: profile?.name ?? profile?.email ?? "Anfitrión",
          email: profile?.email ?? "",
        });
      }
    }

    if (data.role === "associate") {
      const { data: existing } = await supabaseAdmin
        .from("associates")
        .select("id")
        .eq("user_id", data.userId)
        .maybeSingle();
      if (!existing) {
        await supabaseAdmin.from("associates").insert({
          user_id: data.userId,
          name: profile?.name ?? profile?.email ?? "Asociado",
          email: profile?.email ?? null,
        });
      }
    }

    await supabaseAdmin
      .from("profiles")
      .update({ kiosk_id: data.role === "kiosk" ? (data.kioskId ?? null) : null })
      .eq("id", data.userId);

    return { ok: true };
  });

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).nullable().optional(),
  password: z.string().min(6).max(72).optional().nullable(),
  role: z.enum(["pending", "admin", "associate", "host", "kiosk"]),
  kioskId: z.string().uuid().nullable().optional(),
});

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      email: data.email,
      user_metadata: { name: data.name },
      ...(data.password ? { password: data.password } : {}),
    });
    if (authError) throw new Error(authError.message);

    await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: data.userId,
          email: data.email,
          name: data.name,
          kiosk_id: data.role === "kiosk" ? (data.kioskId ?? null) : null,
        },
        { onConflict: "id" },
      );

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });

    if (data.role === "host") {
      const { data: existing } = await supabaseAdmin
        .from("hosts")
        .select("id")
        .eq("user_id", data.userId)
        .maybeSingle();
      if (existing) {
        await supabaseAdmin
          .from("hosts")
          .update({ name: data.name, email: data.email, phone: data.phone ?? null })
          .eq("user_id", data.userId);
      } else {
        await supabaseAdmin.from("hosts").insert({
          user_id: data.userId,
          name: data.name,
          email: data.email,
          phone: data.phone ?? null,
        });
      }
    } else {
      await supabaseAdmin.from("hosts").delete().eq("user_id", data.userId);
    }

    if (data.role === "associate") {
      const { data: existing } = await supabaseAdmin
        .from("associates")
        .select("id")
        .eq("user_id", data.userId)
        .maybeSingle();
      if (existing) {
        await supabaseAdmin
          .from("associates")
          .update({ name: data.name, email: data.email, phone: data.phone ?? null })
          .eq("user_id", data.userId);
      } else {
        await supabaseAdmin.from("associates").insert({
          user_id: data.userId,
          name: data.name,
          email: data.email,
          phone: data.phone ?? null,
        });
      }
    }

    return { ok: true };
  });

const deleteUserSchema = z.object({ userId: z.string().uuid() });


export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");
    if (data.userId === context.userId) throw new Error("No podés eliminar tu propia cuenta");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("associates").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("hosts").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
