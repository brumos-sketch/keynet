import { z } from "zod";
import { hashLockerKey } from "./locker-key";
import { deriveEnrollmentKey, deviceSecretSchema, enrollmentRequestSchema, ENROLLMENT_SECONDS, POLL_SECONDS } from "./locker-enrollment";
import { json, errorJson } from "./locker-api.server";
import { clientIp, ThrottledError } from "./throttle.server";

export async function enrollmentHandler(request: Request, action: "start" | "poll" | "ack") {
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 2048) return json({ ok: false, error: "Datos inválidos" }, 413);
    const text = await request.text();
    if (text.length > 2048) return json({ ok: false, error: "Datos inválidos" }, 413);
    const body: unknown = JSON.parse(text);
    const input = action === "start"
      ? z.object({ deviceSecret: deviceSecretSchema }).parse(body)
      : enrollmentRequestSchema.parse(body);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: allowed, error: limitError } = await db.rpc("locker_enrollment_limit", {
      _key: `enroll:${action}:${clientIp(request.headers)}`, _limit: action === "start" ? 5 : 120,
      _seconds: action === "start" ? 600 : 60,
    });
    if (limitError) throw new Error("No se pudo iniciar la vinculación");
    if (!allowed) throw new ThrottledError(action === "start" ? 600 : 60);
    const secretHash = await hashLockerKey(input.deviceSecret);
    if (action === "start") {
      const bytes = crypto.getRandomValues(new Uint8Array(4));
      const claimCode = "LK-" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
      const expiresAt = new Date(Date.now() + ENROLLMENT_SECONDS * 1000).toISOString();
      const { data, error } = await db.from("locker_enrollments").insert({ claim_code: claimCode, device_secret_hash: secretHash, expires_at: expiresAt }).select("id").single();
      if (error || !data) throw new Error("No se pudo iniciar la vinculación. Probá de nuevo");
      return json({ ok: true, enrollmentId: data.id, claimCode, expiresAt, pollAfter: POLL_SECONDS });
    }
    const parsed = enrollmentRequestSchema.parse(input);
    const { data: enrollment, error } = await db.from("locker_enrollments").select("kiosk_id").eq("id", parsed.enrollmentId).eq("device_secret_hash", secretHash).maybeSingle();
    if (error) throw new Error("No se pudo consultar la vinculación");
    if (!enrollment) return json({ ok: false, error: "Vinculación inválida" }, 401);
    const key = enrollment.kiosk_id ? await deriveEnrollmentKey(input.deviceSecret, parsed.enrollmentId, enrollment.kiosk_id) : "";
    const { data: status, error: deliveryError } = await db.rpc("deliver_locker_enrollment", {
      _id: parsed.enrollmentId, _secret_hash: secretHash, _key_hash: await hashLockerKey(key), _prefix: key.slice(0, 13), _ack: action === "ack",
    });
    if (deliveryError) throw new Error("No se pudo completar la vinculación");
    if (status === "invalid") return json({ ok: false, error: "Vinculación inválida" }, 401);
    if (status === "expired" || status === "revoked") return json({ ok: false, status, error: "Iniciá una nueva vinculación" }, 410);
    if (status === "ready") return json({ ok: true, status, apiKey: key, lockerId: enrollment.kiosk_id });
    return json({ ok: true, status, pollAfter: POLL_SECONDS });
  } catch (err) {
    if (err instanceof SyntaxError) return json({ ok: false, error: "JSON inválido" }, 400);
    return errorJson(err);
  }
}