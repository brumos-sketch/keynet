import { lockedSeconds, nextFailure, type ThrottleRule, type ThrottleState } from "@/lib/throttle";

export class ThrottledError extends Error {
  constructor(public retryAfter: number) {
    const min = Math.ceil(retryAfter / 60);
    super(`Demasiados intentos fallidos. Probá de nuevo en ${min} min`);
    this.name = "ThrottledError";
  }
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function read(key: string): Promise<ThrottleState | null> {
  const db = await admin();
  const { data } = await db.from("security_throttle").select("failures, locked_until, updated_at").eq("key", key).maybeSingle();
  return data ?? null;
}

/** Throws ThrottledError when any key is currently locked. */
export async function assertNotLocked(keys: string[]) {
  const now = new Date();
  for (const key of keys) {
    const s = lockedSeconds(await read(key), now);
    if (s > 0) throw new ThrottledError(s);
  }
}

export async function recordFailure(entries: Array<[string, ThrottleRule]>) {
  const db = await admin();
  const now = new Date();
  for (const [key, rule] of entries) {
    const next = nextFailure(await read(key), rule, now);
    await db.from("security_throttle").upsert({ key, ...next });
  }
}

export async function clearFailures(keys: string[]) {
  const db = await admin();
  await db.from("security_throttle").delete().in("key", keys);
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
