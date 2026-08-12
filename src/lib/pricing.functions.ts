import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type PlanPriceRow = {
  plan: string;
  amount: number | null;
  price_label: string | null;
  subtitle: string | null;
  features: string[];
  cta: string | null;
  sort_order: number;
};

export const listPlanPrices = createServerFn({ method: "GET" }).handler(
  async (): Promise<PlanPriceRow[]> => {
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabasePublic = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data, error } = await supabasePublic
      .from("plan_prices")
      .select("plan, amount, price_label, subtitle, features, cta, sort_order")
      .order("sort_order", { ascending: true });

    if (error) return [];
    return (data ?? []) as PlanPriceRow[];
  },
);

const updateSchema = z.object({
  plan: z.string().min(1),
  amount: z.number().int().nonnegative().nullable(),
  price_label: z.string().nullable(),
  subtitle: z.string().nullable(),
  features: z.array(z.string()),
  cta: z.string().nullable(),
});

export const updatePlanPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("is_admin");
    if (!admin) throw new Error("Forbidden");

    const { plan, ...patch } = data;
    const { error } = await context.supabase
      .from("plan_prices")
      .update(patch)
      .eq("plan", plan);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
