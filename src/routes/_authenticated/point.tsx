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
import { cn } from "@/lib/utils";
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
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  KeyRound,
  Lock,
  MapPin,
  PackageCheck,
  RotateCcw,
  Store,
  Trash2,
  Unlock,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/point")({
  head: () => ({
    meta: [
      { title: "Punto — PASALLAVE" },
      { name: "description", content: "Validá códigos de depósito y retiro en tu punto asociado." },
      { property: "og:title", content: "Punto PASALLAVE" },
      { property: "og:description", content: "Panel del punto asociado para validar códigos." },
    ],
  }),
  component: PointPanel,
});

const ACTION_META: Record<
  string,
  { label: string; icon: React.ElementType; tone: "success" | "info" | "warning" | "danger" }
> = {
  deposited: { label: "Depósito registrado", icon: Lock, tone: "info" },
  picked_up: { label: "Retiro registrado", icon: Unlock, tone: "success" },
  completed: { label: "Devolución registrada", icon: PackageCheck, tone: "success" },
};

function PointPanel() {
  const { name, kioskId, signOut } = useAuth();
  const qc = useQueryClient();
  const validate = useServerFn(validateCode);
  const [code, setCode] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [lastResult, setLastResult] = useState<{
    action: string;
    position: number | null;
    bookingRef: string | null;
    success: boolean;
  } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const { data: kiosk } = useQuery({
    queryKey: ["point", "info", kioskId],
    enabled: !!kioskId,
    queryFn: async () => {
      const { data } = await supabase.from("kiosks").select("*").eq("id", kioskId!).maybeSingle();
      return data;
    },
  });

  const { data: exchanges } = useQuery({
    queryKey: ["point", "exchanges", kioskId],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("key_exchanges")
        .select("*, keys(name, property_name)")
        .eq("kiosk_id", kioskId!)
        .order("created_at", { ascending: false });
      return rows ?? [];
    },
    enabled: !!kioskId,
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
      toast.success(ACTION_META[result.action]?.label ?? "Código válido");
      setLastResult({ ...result, success: true });
      setCode("");
      void qc.invalidateQueries({ queryKey: ["point", "exchanges"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setLastResult({ action: "", position: null, bookingRef: null, success: false });
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

  const active = (exchanges ?? []).filter((e) =>
    ["created", "waiting_deposit", "deposited", "picked_up"].includes(e.status),
  );
  const positions = (kiosk?.positions ?? 0) as number;
  const closed = !openState.open;

  const occupiedPositions = useMemo(() => {
    const set = new Set<number>();
    (exchanges ?? []).forEach((e) => {
      if (["deposited", "completed"].includes(e.status) && e.locker_position) set.add(e.locker_position);
    });
    return set;
  }, [exchanges]);


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

        <main className="mx-auto max-w-6xl p-4 md:p-6 lg:p-8">
          <section className="mb-6 rounded-[16px] border border-border bg-card p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Store className="size-5 text-primary" />
                  <h1 className="text-xl font-semibold text-foreground">{kiosk?.name ?? "Mi punto"}</h1>
                </div>
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0" />
                  {kiosk?.address ?? "—"}
                </p>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4 shrink-0" />
                  {describeSchedule(kiosk?.is_24h ?? false, (kiosk?.schedule as KioskSchedule | null) ?? null)}
                </p>
              </div>
              <div className="flex items-center gap-3 md:text-right">
                <Pill tone={openState.open ? "success" : "danger"}>
                  {openState.open ? "Abierto" : "Cerrado"}
                </Pill>
                {closed && openState.nextOpen ? (
                  <span className="text-xs text-muted-foreground">
                    Abre en {formatCountdown(openState.nextOpen.getTime() - now.getTime())}
                  </span>
                ) : null}
                {openState.open && openState.closesAt ? (
                  <span className="text-xs text-muted-foreground">Cierra {openState.closesAt}</span>
                ) : null}
              </div>
            </div>

            <div className="mt-4 rounded-[12px] bg-secondary p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ocupación del punto</span>
                <span className="font-medium text-foreground">
                  {active.length} / {positions} posiciones
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${positions ? Math.min(100, (active.length / positions) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-[16px] border border-border bg-card p-5 md:p-6">
              <div className="mb-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <KeyRound className="size-5 text-primary" />
                  Validar código
                </h2>
                <p className="text-sm text-muted-foreground">
                  Ingresá el código de depósito, retiro o devolución.
                </p>
              </div>

              {closed && (
                <div className="mb-4 rounded-[12px] border border-border bg-secondary p-3 text-sm text-muted-foreground">
                  El punto está fuera de horario. Las validaciones se habilitan cuando vuelve a abrir
                  {openState.nextOpen
                    ? ` (en ${formatCountdown(openState.nextOpen.getTime() - now.getTime())})`
                    : ""}
                  .
                </div>
              )}

              <div className="mb-4">
                <label className="sr-only" htmlFor="code">
                  Código
                </label>
                <Input
                  id="code"
                  value={formatDisplay(code)}
                  maxLength={8}
                  disabled={closed}
                  placeholder="123-456"
                  className="code-chip h-16 text-center text-3xl tracking-[0.12em]"
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                  <Button
                    key={d}
                    variant="outline"
                    className="h-16 text-2xl font-medium"
                    disabled={closed}
                    onClick={() => append(d)}
                    type="button"
                  >
                    {d}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  className="h-16 gap-2 text-sm font-medium"
                  onClick={clear}
                  disabled={closed}
                  type="button"
                >
                  <Trash2 className="size-4" />
                  Borrar
                </Button>
                <Button
                  variant="outline"
                  className="h-16 text-2xl font-medium"
                  onClick={() => append("0")}
                  disabled={closed}
                  type="button"
                >
                  0
                </Button>
                <Button
                  variant="outline"
                  className="h-16 gap-2 text-sm font-medium"
                  onClick={backspace}
                  disabled={closed}
                  type="button"
                >
                  <ArrowLeft className="size-4" />
                  ←
                </Button>
              </div>

              <Button
                className="mt-4 h-14 w-full rounded-[10px] text-lg font-semibold"
                disabled={mutation.isPending || closed || code.replace(/-/g, "").length < 6}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? "Validando…" : "Validar código"}
              </Button>
            </section>

            <section className="space-y-6">
              {lastResult && (
                <div
                  className={cn(
                    "rounded-[16px] border p-5",
                    lastResult.success
                      ? "border-success/25 bg-success/10"
                      : "border-destructive/25 bg-destructive/10",
                  )}
                >
                  <div className="flex items-start gap-3">
                    {lastResult.success ? (
                      <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 size-6 shrink-0 text-destructive" />
                    )}
                    <div className="flex-1">
                      <p
                        className={cn(
                          "font-medium",
                          lastResult.success ? "text-success-foreground" : "text-destructive",
                        )}
                      >
                        {lastResult.success
                          ? ACTION_META[lastResult.action]?.label ?? "Código válido"
                          : "Código inválido"}
                      </p>
                      {lastResult.success && lastResult.position && lastResult.position > 0 && (
                        <p className="mt-1 text-2xl font-semibold text-foreground">
                          Posición {lastResult.position}
                        </p>
                      )}
                      {lastResult.bookingRef && (
                        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          Reserva <CodeChip value={lastResult.bookingRef} />
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!lastResult && (
                <div className="rounded-[16px] border border-dashed border-border bg-card p-5 text-center">
                  <p className="text-sm text-muted-foreground">
                    Ingresá un código para ver el resultado de la validación.
                  </p>
                </div>
              )}

              <div className="rounded-[16px] border border-border bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Casilleros</h3>
                  <span className="text-xs text-muted-foreground">
                    {positions - occupiedPositions.size} libres
                  </span>
                </div>
                {positions > 0 ? (
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-5">
                    {Array.from({ length: positions }, (_, i) => i + 1).map((n) => {
                      const occupied = occupiedPositions.has(n);
                      return (
                        <div
                          key={n}
                          className={cn(
                            "flex aspect-square flex-col items-center justify-center rounded-[10px] border text-sm font-medium",
                            occupied
                              ? "border-border bg-secondary text-muted-foreground"
                              : "border-success/30 bg-success/10 text-success",
                          )}
                        >
                          <span>{n}</span>
                          {occupied ? (
                            <Lock className="size-3" />
                          ) : (
                            <Unlock className="size-3" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">El punto no tiene casilleros configurados.</p>
                )}
              </div>

              <div className="rounded-[16px] border border-border bg-card p-5">
                <h3 className="mb-2 text-sm font-semibold text-foreground">Estados del movimiento</h3>
                <div className="flex flex-wrap gap-2">
                  {(
                    ["deposited", "picked_up", "completed"] as Array<"deposited" | "picked_up" | "completed">
                  ).map((s) => {
                    const meta = ACTION_META[s];
                    const Icon = meta?.icon ?? RotateCcw;
                    const tone = STATUS_TONE[s] ?? "neutral";
                    return (
                      <Pill key={s} tone={tone} className="gap-1">
                        <Icon className="size-3" />
                        {meta?.label ?? STATUS_LABELS[s]}
                      </Pill>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
