import { afterEach, describe, expect, it, vi } from "vitest";
import { runCodeValidation } from "./exchange.server";

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  rpc: vi.fn(async () => ({ data: null, error: null })),
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
} }));
vi.mock("@/lib/push.server", () => ({ sendPushToUser: vi.fn() }));

function fixture(plan: "pro" | "one_use", limits: { from?: string; until?: string }) {
  const updates: Array<{ table: string; patch: unknown }> = [];
  const code = {
    id: "code", code: "482336", status: "active", role: "guest", person_name: null,
    reusable: true, has_validity: true, uses_count: 0, scope: "pickup",
    valid_from: null, valid_to: null, time_from: limits.from ?? null, time_to: limits.until ?? null,
    keys: { id: "key", kiosk_id: "point", host_id: "host", subscription_type: plan },
  };
  const stay = {
    id: "stay", key_id: "key", status: "deposited", locker_position: 4, booking_ref: "TEST-ONLY",
    deposit_code: "015589", pickup_code: "482336", return_code: "482336", check_in: null, check_out: null,
    pickup_time: limits.from ?? null, pickup_until: limits.until ?? null, keys: { subscription_type: plan },
  };
  const client = { from: (table: string) => {
    let write = false;
    const chain = {
      select: () => chain, eq: () => chain, or: () => chain, in: () => chain, order: () => chain,
      update: (patch: unknown) => { write = true; updates.push({ table, patch }); return chain; },
      insert: () => { write = true; return chain; },
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: (result: { data: unknown; error: null }) => unknown) => resolve({ data: write ? null : table === "access_codes" ? (plan === "pro" ? [code] : []) : table === "key_exchanges" ? [stay] : [], error: null }),
    };
    return chain;
  } } as unknown as Parameters<typeof runCodeValidation>[0];
  return { client, updates };
}

afterEach(() => vi.useRealTimers());
describe("vigencia común a tablet, locker y validación autenticada", () => {
  it("Pro rechaza las 14:59 de Argentina sin consumir el código ni mover la llave", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-26T17:59:00Z"));
    const { client, updates } = fixture("pro", { from: "15:00" });
    await expect(runCodeValidation(client, "point", "482-336")).rejects.toThrow("aún no es válido en este horario");
    expect(updates).toEqual([]);
  });
  it("Pro permite las 23:57 locales cuando solo se configura desde 15:00", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-26T02:57:14Z"));
    const { client, updates } = fixture("pro", { from: "15:00" });
    expect(await runCodeValidation(client, "point", "482-336")).toMatchObject({ action: "picked_up", position: 4 });
    expect(updates.find((entry) => entry.table === "access_codes")?.patch).toEqual({ uses_count: 1 });
  });
  it("el código de estadía Pasa Una respeta la hora final antes de abrir", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-26T02:57:14Z"));
    const { client, updates } = fixture("one_use", { from: "15:00", until: "21:00" });
    await expect(runCodeValidation(client, "point", "482-336")).rejects.toThrow("ya no es válido en este horario");
    expect(updates).toEqual([]);
  });
});