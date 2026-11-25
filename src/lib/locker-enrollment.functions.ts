import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { claimCodeSchema } from "./locker-enrollment";

export const claimLockerDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ kioskId: z.string().uuid(), claimCode: claimCodeSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Solo el administrador puede vincular dispositivos");
    const { data: id, error } = await context.supabase.rpc("claim_locker_enrollment", { _kiosk_id: data.kioskId, _claim_code: data.claimCode });
    if (error) throw new Error(error.message);
    if (!id) throw new Error("Código inválido, vencido o ya vinculado");
    return { enrollmentId: id };
  });

export const revokePointDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ kioskId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Solo el administrador puede desvincular dispositivos");
    const { error } = await context.supabase.rpc("revoke_point_device", { _kiosk_id: data.kioskId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const lockerDeviceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ enrollmentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Solo el administrador puede consultar la vinculación");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("locker_enrollments").select("acknowledged_at, expires_at").eq("id", data.enrollmentId).maybeSingle();
    if (error || !row) throw new Error("Vinculación no encontrada");
    return { status: row.acknowledged_at ? "connected" : new Date(row.expires_at).getTime() <= Date.now() ? "expired" : "waiting" };
  });