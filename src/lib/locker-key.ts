/** SHA-256 hex of a locker API key (works in browser and workerd). */
export async function hashLockerKey(key: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key.trim()));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function newLockerKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return "lkr_live_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
