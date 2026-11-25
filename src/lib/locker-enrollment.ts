import { z } from "zod";

export const ENROLLMENT_SECONDS = 600;
export const POLL_SECONDS = 3;
export const deviceSecretSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const enrollmentRequestSchema = z.object({
  enrollmentId: z.string().uuid(),
  deviceSecret: deviceSecretSchema,
});
export const claimCodeSchema = z.string().trim().toUpperCase().regex(/^LK-[A-F0-9]{8}$/);

/** Derive a repeatable credential without ever persisting its plaintext. */
export async function deriveEnrollmentKey(secret: string, enrollmentId: string, kioskId: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`pasallave:locker:v1:${enrollmentId}:${kioskId}`));
  return "lkr_live_" + Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}