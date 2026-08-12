import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Repara la ficha del usuario logueado: perfil, rol y fila de host/associate.
 * Existe porque el disparador de alta automática no está activo en la base.
 */
export const ensureUserBootstrap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = authUser?.user?.email ?? "";
    const meta = (authUser?.user?.user_metadata ?? {}) as Record<string, unknown>;
    const name =
      (typeof meta["name"] === "string" && meta["name"]) ||
      (typeof meta["full_name"] === "string" && meta["full_name"]) ||
      email.split("@")[0] ||
      "Usuario";

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      await supabaseAdmin.from("profiles").insert({ id: userId, email, name });
    }

    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    let role = roleRow?.role ?? null;
    if (!role) {
      role = "host";
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
    }

    const finalName = profile?.name ?? name;
    const finalEmail = profile?.email ?? email;

    if (role === "host") {
      const { data: host } = await supabaseAdmin
        .from("hosts")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!host) {
        await supabaseAdmin
          .from("hosts")
          .insert({ user_id: userId, name: finalName, email: finalEmail });
      }
    }

    if (role === "associate") {
      const { data: associate } = await supabaseAdmin
        .from("associates")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!associate) {
        await supabaseAdmin
          .from("associates")
          .insert({ user_id: userId, name: finalName, email: finalEmail });
      }
    }

    return { ok: true, role };
  });
