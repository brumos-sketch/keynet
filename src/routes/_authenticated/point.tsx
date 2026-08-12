import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { RoleGuard } from "@/components/pasallave/role-guard";
import { Brand, CodeChip, Pill } from "@/components/pasallave/ui-bits";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { validateCode } from "@/lib/pasallave.functions";
import {
  describeSchedule,
  formatCountdown,
  kioskOpenState,
  type KioskSchedule,
} from "@/lib/pasallave";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Delete,
  KeyRound,
  Lock,
  MapPin,
  PackageCheck,
  Store,
  Unlock,
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
  {
    title: string;
    subtitle: string;
    icon: React.ElementType;
    tone: "success" | "info" | "primary";
  }
> = {
  deposited: {
    title: "DEPOSITAR",
    subtitle: "Guardá la llave en el casillero indicado.",
    icon: Lock,
    tone: "info",
  },
  picked_up: {
    title: "ENTREGAR",
    subtitle: "Retirá la llave del casillero y entregala.",
    icon: Unlock,
    tone: "success",
  },
  completed: {
    title: "RECIBIR",
    subtitle: "Recibí la llave y guardala en el casillero.",
    icon: PackageCheck,
    tone: "primary",
  },
};

type Screen =
  | { kind: "keypad" }
  | { kind: "result"; action: string; position: number | null; bookingRef: string | null }
  | { kind: "error"; message: string }
  | { kind: "countdown"; message: string; availableAt: string | null };

/** Extrae "HH:MM" de un mensaje de horario, si lo hubiera. */
function extractTime(message: string): string | null {
  const m = message.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
  return m ? m[0] : null;
}

function PointPanel() {
  const { name, kioskId, signOut } = useAuth();
  const qc = useQueryClient();
  const validate = useServerFn(validateCode);
  const [code, setCode] = useState("");
  const [shake, setShake] = useState(false);
  const [screen, setScreen] = useState<Screen>({ kind: "keypad" });
  const [now, setNow] = useState(() => new Date());

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

  const closed = !openState.open;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!kioskId) throw new Error("No tenés un punto asignado");
      return validate({ data: { code } });
    },
    onSuccess: (result) => {
      setScreen({
        kind: "result",
        action: result.action,
        position: result.position,
        bookingRef: result.bookingRef,
      });
      setCode("");
      void qc.invalidateQueries({ queryKey: ["point", "exchanges"] });
    },
    onError: (error: Error) => {
      const message = error.message || "No pudimos validar el código";
      const isSchedule = /horario|válido aún|aún no es válido/i.test(message);
      if (isSchedule) {
        setScreen({ kind: "countdown", message, availableAt: extractTime(message) });
      } else {
        setScreen({ kind: "error", message });
      }
      setShake(true);
      setTimeout(() => setShake(false), 450);
    },
  });

  const digits = code.replace(/\D/g, "");
  const append = (digit: string) =>
    setCode((prev) => (prev.replace(/\D/g, "").length >= 6 ? prev : prev + digit));
  const backspace = () => setCode((prev) => prev.slice(0, -1));
  const clear = () => setCode("");

  const active = (exchanges ?? []).filter((e) =>
    ["created", "waiting_deposit", "deposited", "picked_up"].includes(e.status),
  );
  const positions = (kiosk?.positions ?? 0) as number;

  const occupiedPositions = useMemo(() => {
    const set = new Set<number>();
    (exchanges ?? []).forEach((e) => {
      if (["deposited", "completed"].includes(e.status) && e.locker_position) set.add(e.locker_position);
    });
    return set;
  }, [exchanges]);

  const backToKeypad = () => {
    setScreen({ kind: "keypad" });
    setCode("");
  };

  const keypadKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

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
          <section className="glass-card mb-6 p-5">
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
                <span className="font-medium text-foreground tabular-nums">
                  {active.length} / {positions} posiciones
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="gradient-primary h-full rounded-full transition-all"
                  style={{
                    width: `${positions ? Math.min(100, (active.length / positions) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="glass-card p-5 md:p-6">
              {screen.kind === "keypad" && (
                <div className="animate-fade-in">
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
                      El punto está fuera de horario. Las validaciones se habilitan cuando vuelve a
                      abrir
                      {openState.nextOpen
                        ? ` (en ${formatCountdown(openState.nextOpen.getTime() - now.getTime())})`
                        : ""}
                      .
                    </div>
                  )}

                  <div
                    className={cn(
                      "mb-5 grid grid-cols-6 gap-2 sm:gap-3",
                      shake && "animate-shake",
                    )}
                    aria-label="Código de 6 dígitos"
                  >
                    {Array.from({ length: 6 }, (_, i) => {
                      const char = digits[i];
                      const isCursor = i === digits.length;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "code-chip flex h-16 items-center justify-center rounded-[12px] border text-3xl font-semibold sm:h-20 sm:text-4xl",
                            char
                              ? "border-primary/30 bg-primary/5 text-foreground"
                              : "border-border bg-secondary text-muted-foreground",
                            isCursor && !closed && "border-primary shadow-glow",
                            i === 2 && "mr-1",
                          )}
                        >
                          {char ?? ""}
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {keypadKeys.map((d) => (
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
                      Limpiar
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
                      aria-label="Borrar último dígito"
                    >
                      <Delete className="size-5" />
                    </Button>
                  </div>

                  <Button
                    className="mt-4 h-14 w-full rounded-[10px] text-lg font-semibold"
                    disabled={mutation.isPending || closed || digits.length < 6}
                    onClick={() => mutation.mutate()}
                  >
                    {mutation.isPending ? "Validando…" : "Validar código"}
                  </Button>
                </div>
              )}

              {screen.kind === "result" && (
                <ResultScreen screen={screen} onConfirm={backToKeypad} />
              )}

              {screen.kind === "error" && (
                <div className="animate-fade-in flex min-h-[28rem] flex-col items-center justify-center gap-4 text-center">
                  <span className="flex size-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <AlertTriangle className="size-10" />
                  </span>
                  <h2 className="text-2xl font-semibold text-destructive">Código inválido</h2>
                  <p className="max-w-sm text-sm text-muted-foreground">{screen.message}</p>
                  <Button
                    className="mt-2 h-14 w-full max-w-xs rounded-[10px] text-lg font-semibold"
                    onClick={backToKeypad}
                  >
                    Reintentar
                  </Button>
                </div>
              )}

              {screen.kind === "countdown" && (
                <div className="animate-fade-in flex min-h-[28rem] flex-col items-center justify-center gap-4 text-center">
                  <span className="animate-glow-pulse flex size-20 items-center justify-center rounded-full bg-warning/15 text-warning-foreground">
                    <Clock className="size-10" />
                  </span>
                  <h2 className="text-2xl font-semibold text-foreground">Todavía no disponible</h2>
                  {screen.availableAt ? (
                    <p className="code-chip text-4xl font-semibold text-foreground">
                      {screen.availableAt}
                    </p>
                  ) : null}
                  <p className="max-w-sm text-sm text-muted-foreground">
                    {screen.availableAt
                      ? `El retiro se habilita a las ${screen.availableAt}.`
                      : screen.message}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-2 h-14 w-full max-w-xs rounded-[10px] text-lg font-semibold"
                    onClick={backToKeypad}
                  >
                    <ArrowLeft className="size-5" />
                    Volver
                  </Button>
                </div>
              )}
            </section>

            <section className="space-y-6">
              <div className="glass-card p-5">
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
                          <span className="code-chip">{n}</span>
                          {occupied ? <Lock className="size-3" /> : <Unlock className="size-3" />}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    El punto no tiene casilleros configurados.
                  </p>
                )}
              </div>

              <div className="glass-card p-5">
                <h3 className="mb-2 text-sm font-semibold text-foreground">Acciones posibles</h3>
                <div className="flex flex-wrap gap-2">
                  {(["deposited", "picked_up", "completed"] as const).map((s) => {
                    const meta = ACTION_META[s]!;
                    const Icon = meta.icon;
                    return (
                      <Pill key={s} tone={meta.tone} className="gap-1">
                        <Icon className="size-3" />
                        {meta.title}
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

function ResultScreen({
  screen,
  onConfirm,
}: {
  screen: { action: string; position: number | null; bookingRef: string | null };
  onConfirm: () => void;
}) {
  const meta = ACTION_META[screen.action];
  const Icon = meta?.icon ?? CheckCircle2;
  const toneClass =
    meta?.tone === "success"
      ? "bg-success/10 text-success"
      : meta?.tone === "info"
        ? "bg-info/10 text-info"
        : "bg-primary/10 text-primary";

  return (
    <div className="animate-fade-in flex min-h-[28rem] flex-col items-center justify-center gap-4 text-center">
      <span className={cn("flex size-20 items-center justify-center rounded-full", toneClass)}>
        <Icon className="size-10" />
      </span>
      <h2 className="text-3xl font-bold tracking-tight text-foreground">
        {meta?.title ?? "CÓDIGO VÁLIDO"}
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">{meta?.subtitle}</p>

      {screen.position && screen.position > 0 ? (
        <div className="mt-2 w-full max-w-xs rounded-[16px] border border-primary/25 bg-primary/5 p-6">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Casillero
          </p>
          <p className="code-chip mt-1 text-6xl font-bold text-primary">{screen.position}</p>
        </div>
      ) : null}

      {screen.bookingRef ? (
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          Reserva <CodeChip value={screen.bookingRef} />
        </p>
      ) : null}

      <Button
        className="mt-3 h-14 w-full max-w-xs rounded-[10px] text-lg font-semibold"
        onClick={onConfirm}
      >
        Confirmar acción
      </Button>
    </div>
  );
}
