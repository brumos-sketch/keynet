import { z } from "zod";

export const ENROLLMENT_SECONDS = 600;
export const POLL_SECONDS = 3;
export const deviceSecretSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const enrollmentRequestSchema = z.object({
  enrollmentId: z.string().uuid(),
  deviceSecret: deviceSecretSchema,
});
export const claimCodeSchema = z.string().trim().toUpperCase().regex(/^(LK|PT)-[A-Z]{3}-[0-9]{3}$/);

export function generateClaimCode(type: "locker" | "point") {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const pick = (size: number) => {
    let value = 255;
    const limit = 256 - (256 % size);
    while (value >= limit) value = crypto.getRandomValues(new Uint8Array(1))[0] ?? 255;
    return value % size;
  };
  const letters = Array.from({ length: 3 }, () => alphabet[pick(26)]).join("");
  const numbers = Array.from({ length: 3 }, () => String(pick(10))).join("");
  return `${type === "locker" ? "LK" : "PT"}-${letters}-${numbers}`;
}

/** Derive a repeatable credential without ever persisting its plaintext. */
export async function deriveEnrollmentKey(secret: string, enrollmentId: string, kioskId: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`pasallave:locker:v1:${enrollmentId}:${kioskId}`));
  return "lkr_live_" + Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}