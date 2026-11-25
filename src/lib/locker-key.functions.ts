import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hashLockerKey, newLockerKey } from "@/lib/locker-key";

/** Admin-only: creates (or replaces) a locker's API key and returns it once. */
export const generateLockerKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ kioskId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Solo el administrador puede generar claves");
    const key = newLockerKey();
    const { error } = await context.supabase
      .from("kiosks")
      .update({ api_key_hash: await hashLockerKey(key), api_key_prefix: key.slice(0, 13) })
      .eq("id", data.kioskId)
      .eq("point_type", "locker");
    if (error) throw new Error(error.message);
    return { key };
  });
