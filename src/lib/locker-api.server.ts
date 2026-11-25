import { z } from "zod";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const accessCodeSchema = z.string().trim().min(3).max(20);

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

export function errorJson(err: unknown, status = 400) {
  if (err instanceof z.ZodError) return json({ ok: false, error: "Datos inválidos" }, 400);
  const message = err instanceof Error ? err.message : "Error inesperado";
  return json({ ok: false, error: message }, status);
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

