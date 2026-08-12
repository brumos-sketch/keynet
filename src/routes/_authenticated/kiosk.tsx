import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { RoleGuard } from "@/components/pasallave/role-guard";
import { Brand, CodeChip, Pill } from "@/components/pasallave/ui-bits";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateCode } from "@/lib/pasallave.functions";
import {
  STATUS_LABELS,
  STATUS_TONE,
  describeSchedule,
  formatCountdown,
  kioskOpenState,
  type ExchangeStatus,
  type KioskSchedule,
} from "@/lib/pasallave";

export const Route = createFileRoute("/_authenticated/kiosk")({
  head: () => ({
    meta: [
      { title: "Punto — PASALLAVE" },
      { name: "description", content: "Validá códigos de depósito y retiro en tu punto." },
      { property: "og:title", content: "Punto PASALLAVE" },
      { property: "og:description", content: "Panel del punto asociado para validar códigos." },
    ],
  }),
  component: KioskPanel,
});

const ACTION_LABELS: Record<string, string> = {
  deposited: "Depósito registrado",
  picked_up: "Retiro registrado",
  completed: "Devolución registrada",
};

function KioskPanel() {
  const { name, kioskId, signOut } = useAuth();
  const qc = useQueryClient();
  const validate = useServerFn(validateCode);
  const [code, setCode] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [lastResult, setLastResult] = useState<{
    action: string;
    position: number | null;
    bookingRef: string | null;
  } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const { data: kiosk } = useQuery({
    queryKey: ["kiosk", "info", kioskId],
    enabled: !!kioskId,
    queryFn: async () => {
      const { data } = await supabase.from("kiosks").select("*").eq("id", kioskId!).maybeSingle();
      return data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["kiosk", "exchanges", kioskId],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("key_exchanges")
        .select("*, keys(name, property_name)")
        .order("created_at", { ascending: false });
      return rows ?? [];
    },
  });

  const openState = useMemo(
    () =>
      kioskOpenState(
        kiosk?.is_24h ?? false,
        (kiosk?.schedule as KioskSchedule | null) ?? null,
        now,
      ),
    [kiosk, now],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!kioskId) throw new Error("No tenés un punto asignado");
      return validate({ data: { code } });
    },
    onSuccess: (result) => {
      toast.success(ACTION_LABELS[result.action] ?? "Código válido");
      setLastResult(result);
      setCode("");
      void qc.invalidateQueries({ queryKey: ["kiosk", "exchanges"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setLastResult(null);
    },
  });

  const append = (digit: string) =>
    setCode((prev) => {
      const next = prev + digit;
      if (next.replace(/-/g, "").length > 6) return prev;
      return next;
    });
  const backspace = () => setCode((prev) => prev.slice(0, -1));
  const clear = () => setCode("");
  const formatDisplay = (value: string) => {
    const digits = value.replace(/-/g, "");
    if (digits.length <= 3) return digits;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}`;
  };

  const active = (data ?? []).filter((e) =>
    ["created", "waiting_deposit", "deposited", "picked_up"].includes(e.status),
  );
  const positions = kiosk?.positions ?? 0;
  const closed = !openState.open;

  return (
    <RoleGuard allow="kiosk">
      <div className="min-h-screen bg-background">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-5">
          <Brand />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{name}</span>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              Salir
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-3xl space-y-6 p-5 md:p-8">
          <section className="rounded-[16px] border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  {kiosk?.name ?? "Mi punto"}
                </h1>
                <p className="text-sm text-muted-foreground">{kiosk?.address ?? "—"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {describeSchedule(kiosk?.is_24h ?? false, (kiosk?.schedule as KioskSchedule | null) ?? null)}
                </p>
              </div>
              <div className="text-right">
                <Pill tone={openState.open ? "success" : "danger"}>
                  {openState.open ? "Abierto" : "Cerrado"}
                </Pill>
                {closed && openState.nextOpen && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Abre en {formatCountdown(openState.nextOpen.getTime() - now.getTime())}
                  </p>
                )}
                {openState.open && openState.closesAt && (
                  <p className="mt-2 text-xs text-muted-foreground">Cierra {openState.closesAt}</p>
                )}
              </div>
            </div>
            <div className="mt-4 rounded-[12px] bg-secondary p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ocupación</span>
                <span className="font-medium text-foreground">
                  {active.length} / {positions} posiciones
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${positions ? Math.min(100, (active.length / positions) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </section>

          <div>
            <h2 className="text-lg font-semibold text-foreground">Validar código</h2>
            <p className="text-sm text-muted-foreground">
              Ingresá el código de depósito, retiro o acceso.
            </p>
          </div>

          <div className="rounded-[16px] border border-border bg-card p-5">
            {closed && (
              <div className="mb-4 rounded-[12px] border border-border bg-secondary p-3 text-sm text-muted-foreground">
                El punto está fuera de horario. Las validaciones se habilitan cuando vuelve a abrir
                {openState.nextOpen
                  ? ` (en ${formatCountdown(openState.nextOpen.getTime() - now.getTime())})`
                  : ""}
                .
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                value={formatDisplay(code)}
                maxLength={8}
                disabled={closed}
                placeholder="123-456"
                className="code-chip text-center text-2xl tracking-widest"
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <Button
                  key={d}
                  variant="outline"
                  className="h-14 text-xl"
                  disabled={closed}
                  onClick={() => append(d)}
                  type="button"
                >
                  {d}
                </Button>
              ))}
              <Button
                variant="outline"
                className="h-14 text-sm"
                onClick={clear}
                disabled={closed}
                type="button"
              >
                Borrar
              </Button>
              <Button
                variant="outline"
                className="h-14 text-xl"
                onClick={() => append("0")}
                disabled={closed}
                type="button"
              >
                0
              </Button>
              <Button
                variant="outline"
                className="h-14 text-sm"
                onClick={backspace}
                disabled={closed}
                type="button"
              >
                ←
              </Button>
            </div>

            <Button
              className="mt-4 w-full rounded-[10px] text-lg"
              disabled={mutation.isPending || closed || code.replace(/-/g, "").length < 6}
              onClick={() => mutation.mutate()}
            >
              Validar
            </Button>

            {lastResult && (
              <div className="mt-4 rounded-[12px] border border-border bg-secondary p-4 text-center">
                <p className="text-sm text-muted-foreground">{ACTION_LABELS[lastResult.action]}</p>
                {!!lastResult.position && lastResult.position > 0 && (
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    Posición {lastResult.position}
                  </p>
                )}
                {lastResult.bookingRef && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Reserva <CodeChip value={lastResult.bookingRef} />
                  </p>
                )}
              </div>
            )}
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Posiciones ocupadas</h2>
            {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
            <ul className="divide-y divide-border rounded-[16px] border border-border bg-card">
              {active.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Posición {e.locker_position}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(e as unknown as { keys: { name: string } | null }).keys?.name ?? "—"}
                    </p>
                  </div>
                  <CodeChip value={e.booking_ref} />
                  <Pill tone={STATUS_TONE[e.status as ExchangeStatus] ?? "neutral"}>
                    {STATUS_LABELS[e.status as ExchangeStatus] ?? e.status}
                  </Pill>
                </li>
              ))}
              {!isLoading && active.length === 0 && (
                <li className="px-4 py-6 text-sm text-muted-foreground">
                  No hay llaves en el punto.
                </li>
              )}
            </ul>
          </section>
        </main>
      </div>
    </RoleGuard>
  );
}
