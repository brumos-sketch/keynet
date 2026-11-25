import { z } from "zod";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const accessCodeSchema = z.string().trim().min(3).max(20);

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

export function errorJson(err: unknown, status = 400) {
  if (err instanceof Error && err.name === "ThrottledError") {
    const retryAfter = (err as Error & { retryAfter: number }).retryAfter;
    return Response.json({ ok: false, error: err.message, locked: true, retryAfter }, {
      status: 429,
      headers: { ...CORS_HEADERS, "Retry-After": String(retryAfter) },
    });
  }
  if (err instanceof z.ZodError) return json({ ok: false, error: "Datos inválidos" }, 400);
  const message = err instanceof Error ? err.message : "Error inesperado";
  if (/API key/.test(message)) return json({ ok: false, error: message }, 401);
  return json({ ok: false, error: message }, status);
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

