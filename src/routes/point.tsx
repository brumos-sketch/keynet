import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Brand, CodeChip } from "@/components/pasallave/ui-bits";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pointLogin, pointValidateCode } from "@/lib/point.functions";
import { formatCountdown, kioskOpenState, type KioskSchedule } from "@/lib/pasallave";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Delete,
  Lock,
  PackageCheck,
  Unlock,
} from "lucide-react";

export const Route = createFileRoute("/point")({
  head: () => ({
    meta: [
      { title: "Panel del punto — PASALLAVE" },
      {
        name: "description",
        content: "Ingresá el código de acceso del punto y validá depósitos, retiros y devoluciones.",
      },
      { property: "og:title", content: "Panel del punto — PASALLAVE" },
      {
        property: "og:description",
        content: "Panel del punto asociado PASALLAVE para validar códigos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PointPage,
});

const STORAGE_KEY = "pasallave.point.code";

type PointInfo = {
  id: string;
  name: string;
  address: string | null;
  is24h: boolean;
  schedule: unknown;
  positions: number;
};

const ACTION_META: Record<
  string,
  { title: string; subtitle: string; icon: React.ElementType; tone: "success" | "info" | "primary" }
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

function extractTime(message: string): string | null {
  const m = message.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
  return m ? m[0] : null;
}

function Keypad({
  onDigit,
  onClear,
  onBackspace,
  disabled,
}: {
  onDigit: (d: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <Button
          key={d}
          type="button"
          variant="outline"
          className="h-16 rounded-2xl text-2xl font-semibold"
          disabled={disabled}
          onClick={() => onDigit(d)}
        >
          {d}
        </Button>
      ))}
      <Button
        type="button"
        variant="outline"
        className="h-16 rounded-2xl text-sm font-semibold"
        disabled={disabled}
        onClick={onClear}
      >
        Limpiar
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-16 rounded-2xl text-2xl font-semibold"
        disabled={disabled}
        onClick={() => onDigit("0")}
      >
        0
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-16 rounded-2xl text-sm font-semibold"
        disabled={disabled}
        onClick={onBackspace}
        aria-label="Borrar último dígito"
      >
        <Delete className="size-5" />
      </Button>
    </div>
  );
}

function CodeDisplay({
  digits,
  length,
  shake,
  active,
}: {
  digits: string;
  length: number;
  shake: boolean;
  active: boolean;
}) {
  return (
    <div
      className={cn("mb-5 grid gap-2 sm:gap-3", shake && "animate-shake")}
      style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
      aria-label={`Código de ${length} dígitos`}
    >
      {Array.from({ length }, (_, i) => {
        const char = digits[i];
        const isCursor = i === digits.length;
        return (
          <div
            key={i}
            className={cn(
              "code-chip flex h-16 items-center justify-center rounded-xl border text-3xl font-semibold sm:h-20 sm:text-4xl",
              char
                ? "border-electric/30 bg-electric/5 text-foreground"
                : "border-gray-100 bg-gray-50 text-gray-500",
              isCursor && active && "border-electric shadow-glow",
            )}
          >
            {char ?? ""}
          </div>
        );
      })}
    </div>
  );
}

function PointPage() {
  const [point, setPoint] = useState<PointInfo | null>(null);
  const [booted, setBooted] = useState(false);
  const login = useServerFn(pointLogin);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!stored) {
      setBooted(true);
      return;
    }
    login({ data: { accessCode: stored } })
      .then((info) => setPoint(info as PointInfo))
      .catch(() => window.localStorage.removeItem(STORAGE_KEY))
      .finally(() => setBooted(true));
  }, [login]);

  if (!booted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-gray-500">Cargando…</p>
      </div>
    );
  }

  if (!point) {
    return <AccessScreen onEnter={(info, code) => {
      window.localStorage.setItem(STORAGE_KEY, code);
      setPoint(info);
    }} />;
  }

  return <PointPanel point={point} />;
}

function AccessScreen({ onEnter }: { onEnter: (point: PointInfo, code: string) => void }) {
  const login = useServerFn(pointLogin);
  const [code, setCode] = useState("");
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => login({ data: { accessCode: code } }),
    onSuccess: (info) => onEnter(info as PointInfo, code),
    onError: () => {
      setError("Código de acceso incorrecto");
      setCode("");
      setShake(true);
      setTimeout(() => setShake(false), 450);
    },
  });

  const digits = code.replace(/\D/g, "");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="glass-card w-full max-w-md p-6">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Brand />
          <p className="text-sm text-gray-500">Ingresá el código de acceso del punto</p>
        </div>

        <CodeDisplay digits={digits} length={6} shake={shake} active />

        {error ? (
          <p className="mb-4 text-center text-sm font-medium text-destructive">{error}</p>
        ) : null}

        <Keypad
          onDigit={(d) =>
            setCode((prev) => {
              setError(null);
              return prev.replace(/\D/g, "").length >= 6 ? prev : prev + d;
            })
          }
          onClear={() => setCode("")}
          onBackspace={() => setCode((p) => p.slice(0, -1))}
        />

        <Button
          className="mt-4 h-14 w-full rounded-2xl text-lg font-bold shadow-blue"
          disabled={digits.length < 6 || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Verificando…" : "Ingresar"}
        </Button>
      </div>
    </div>
  );
}

function PointPanel({ point }: { point: PointInfo }) {
  const validate = useServerFn(pointValidateCode);
  const [code, setCode] = useState("");
  const [shake, setShake] = useState(false);
  const [screen, setScreen] = useState<Screen>({ kind: "keypad" });
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const openState = useMemo(
    () => kioskOpenState(point.is24h, (point.schedule as KioskSchedule | null) ?? null, now),
    [point, now],
  );
  const closed = !openState.open;

  const mutation = useMutation({
    mutationFn: async () => {
      const accessCode = window.localStorage.getItem(STORAGE_KEY) ?? "";
      return validate({ data: { accessCode, code } });
    },
    onSuccess: (result) => {
      setScreen({
        kind: "result",
        action: result.action,
        position: result.position,
        bookingRef: result.bookingRef,
      });
      setCode("");
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
  const backToKeypad = () => {
    setScreen({ kind: "keypad" });
    setCode("");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="glass-card w-full max-w-md p-6">
        <div className="mb-5 flex flex-col items-center gap-1 text-center">
          <Brand />
          <h1 className="text-lg font-bold text-navy">{point.name}</h1>
          {closed ? (
            <p className="text-xs font-medium text-destructive">
              Punto cerrado
              {openState.nextOpen
                ? ` · abre en ${formatCountdown(openState.nextOpen.getTime() - now.getTime())}`
                : ""}
            </p>
          ) : null}
        </div>

        {screen.kind === "keypad" && (
          <div className="animate-fade-in">
            <CodeDisplay digits={digits} length={6} shake={shake} active={!closed} />
            <Keypad
              disabled={closed}
              onDigit={(d) =>
                setCode((prev) => (prev.replace(/\D/g, "").length >= 6 ? prev : prev + d))
              }
              onClear={() => setCode("")}
              onBackspace={() => setCode((p) => p.slice(0, -1))}
            />
            <Button
              className="mt-4 h-14 w-full rounded-2xl text-lg font-bold shadow-blue"
              disabled={mutation.isPending || closed || digits.length < 6}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Validando…" : "Validar código"}
            </Button>
          </div>
        )}

        {screen.kind === "result" && <ResultScreen screen={screen} onConfirm={backToKeypad} />}

        {screen.kind === "error" && (
          <div className="animate-fade-in flex min-h-[24rem] flex-col items-center justify-center gap-4 text-center">
            <span className="flex size-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-10" />
            </span>
            <h2 className="text-2xl font-bold text-destructive">Código inválido</h2>
            <p className="max-w-sm text-sm text-gray-500">{screen.message}</p>
            <Button
              className="mt-2 h-14 w-full max-w-xs rounded-2xl text-lg font-bold shadow-blue"
              onClick={backToKeypad}
            >
              Reintentar
            </Button>
          </div>
        )}

        {screen.kind === "countdown" && (
          <div className="animate-fade-in flex min-h-[24rem] flex-col items-center justify-center gap-4 text-center">
            <span className="animate-glow-pulse flex size-20 items-center justify-center rounded-full bg-warning/15 text-warning-foreground">
              <Clock className="size-10" />
            </span>
            <h2 className="text-2xl font-bold text-navy">Todavía no disponible</h2>
            {screen.availableAt ? (
              <p className="code-chip text-4xl font-bold text-navy">{screen.availableAt}</p>
            ) : null}
            <p className="max-w-sm text-sm text-gray-500">
              {screen.availableAt
                ? `El retiro se habilita a las ${screen.availableAt}.`
                : screen.message}
            </p>
            <Button
              variant="outline"
              className="mt-2 h-14 w-full max-w-xs rounded-2xl text-lg font-bold"
              onClick={backToKeypad}
            >
              <ArrowLeft className="size-5" />
              Volver
            </Button>
          </div>
        )}
      </div>
    </div>
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
        : "bg-electric/10 text-electric";

  return (
    <div className="animate-fade-in flex min-h-[24rem] flex-col items-center justify-center gap-4 text-center">
      <span className={cn("flex size-20 items-center justify-center rounded-full", toneClass)}>
        <Icon className="size-10" />
      </span>
      <h2 className="text-3xl font-bold tracking-tight text-foreground">
        {meta?.title ?? "CÓDIGO VÁLIDO"}
      </h2>
      <p className="max-w-sm text-sm text-gray-500">{meta?.subtitle}</p>

      {screen.position && screen.position > 0 ? (
        <div className="mt-2 w-full max-w-xs rounded-2xl border-2 border-electric/20 bg-electric/5 p-6">
          <p className="text-xs font-bold tracking-wide text-gray-500 uppercase">Casillero</p>
          <p className="code-chip mt-1 text-6xl font-bold text-electric">{screen.position}</p>
        </div>
      ) : null}

      {screen.bookingRef ? (
        <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
          Reserva <CodeChip value={screen.bookingRef} />
        </p>
      ) : null}

      <Button
        className="mt-3 h-14 w-full max-w-xs rounded-2xl text-lg font-bold shadow-blue"
        onClick={onConfirm}
      >
        Confirmar acción
      </Button>
    </div>
  );
}
