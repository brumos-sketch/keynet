import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Link2, Loader2, RefreshCw } from "lucide-react";
import { Brand } from "./ui-bits";
import { Button } from "@/components/ui/button";
import { pointLogin } from "@/lib/point.functions";
import { POINT_DEVICE_KEY, POINT_ENROLLMENT_KEY, pointEnrollmentSchema, isRevokedDevice, type PointEnrollment, type PointInfo } from "@/lib/point-device";

const responseSchema = z.object({
  ok: z.boolean(),
  status: z.string().optional(),
  error: z.string().optional(),
  retryAfter: z.number().optional(),
  apiKey: z.string().min(64).max(100).optional(),
  enrollmentId: z.string().uuid().optional(),
  claimCode: z.string().optional(),
  expiresAt: z.string().optional(),
});

export function TabletPairing({ onEnter }: { onEnter: (point: PointInfo) => void }) {
  const login = useServerFn(pointLogin);
  const [enrollment, setEnrollment] = useState<PointEnrollment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let retryAt = 0;
    let current: PointEnrollment | null = null;
    try {
      const stored = localStorage.getItem(POINT_ENROLLMENT_KEY);
      if (stored) current = pointEnrollmentSchema.parse(JSON.parse(stored));
    } catch { localStorage.removeItem(POINT_ENROLLMENT_KEY); }
    setEnrollment(current);

    const request = async (action: string, body: unknown) => {
      const response = await fetch(`/api/public/point/enroll/${action}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), signal: controller.signal,
      });
      const data = responseSchema.parse(await response.json());
      if (response.status === 429) retryAt = Date.now() + (data.retryAfter ?? 60) * 1000;
      if (response.status === 401 || response.status === 410) {
        localStorage.removeItem(POINT_ENROLLMENT_KEY);
        current = null;
        setExpired(true);
      }
      if (!response.ok || !data.ok) throw new Error(data.error ?? "No pudimos conectar. Reintentando…");
      return data;
    };
    const acknowledge = async () => {
      if (!current) return;
      const result = await request("ack", current);
      if (result.status === "acknowledged") localStorage.removeItem(POINT_ENROLLMENT_KEY);
    };
    const tick = async () => {
      if (controller.signal.aborted) return;
      setNow(Date.now());
      if (Date.now() < retryAt) { timer = setTimeout(tick, 3000); return; }
      try {
        const key = localStorage.getItem(POINT_DEVICE_KEY);
        if (key) {
          const info = await login({ data: { apiKey: key } });
          try { await acknowledge(); } catch { /* Persisted key remains usable after a lost acknowledgement. */ }
          if (!controller.signal.aborted) onEnter(info);
          return;
        }
        if (!current) {
          const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
          const data = await request("start", { deviceSecret: secret });
          current = pointEnrollmentSchema.parse({ ...data, deviceSecret: secret });
          localStorage.setItem(POINT_ENROLLMENT_KEY, JSON.stringify(current));
          setNow(Date.now());
          setEnrollment(current);
          setExpired(false);
        }
        if (new Date(current.expiresAt).getTime() <= Date.now()) {
          setExpired(true);
          return;
        }
        const data = await request("poll", current);
        if (data.status === "ready" && data.apiKey) {
          localStorage.setItem(POINT_DEVICE_KEY, data.apiKey);
          if (localStorage.getItem(POINT_DEVICE_KEY) !== data.apiKey) throw new Error("No pudimos guardar la vinculación");
          await acknowledge();
          const info = await login({ data: { apiKey: data.apiKey } });
          if (!controller.signal.aborted) onEnter(info);
          return;
        }
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (isRevokedDevice(err)) {
          localStorage.removeItem(POINT_DEVICE_KEY);
          localStorage.removeItem(POINT_ENROLLMENT_KEY);
          current = null;
          setEnrollment(null);
        }
        setError(isRevokedDevice(err) ? "Dispositivo desvinculado. Se requiere una nueva aprobación." : err instanceof Error ? err.message : "Sin conexión. Reintentando…");
      }
      if (!controller.signal.aborted) timer = setTimeout(tick, 3000);
    };
    void tick();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [login, onEnter, generation]);

  const remaining = enrollment ? Math.max(0, Math.ceil((new Date(enrollment.expiresAt).getTime() - now) / 1000)) : 0;
  return <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
    <div className="w-full max-w-md space-y-6 text-center">
      <div className="flex justify-center"><Brand /></div>
      <Link2 className="mx-auto h-12 w-12 text-primary" />
      <h1 className="text-2xl font-bold text-foreground">Vincular tablet</h1>
      {enrollment ? <>
        <p className="text-sm text-muted-foreground">Código de vinculación</p>
        <p className="font-mono text-4xl font-semibold text-primary">{enrollment.claimCode}</p>
        <p className="text-sm text-muted-foreground">{expired ? "Código vencido" : `Vence en ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}</p>
        {!expired && <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Esperando aprobación del administrador</p>}
      </> : <p className="flex items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Conectando…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {expired && <Button variant="outline" onClick={() => {
        localStorage.removeItem(POINT_ENROLLMENT_KEY); setExpired(false); setError(null); setGeneration(g => g + 1);
      }}><RefreshCw className="h-4 w-4" />Generar nuevo código</Button>}
    </div>
  </div>;
}