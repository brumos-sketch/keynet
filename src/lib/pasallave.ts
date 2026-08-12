export type AppRole = "pending" | "admin" | "associate" | "host" | "kiosk";
export type SubscriptionType = "one_use" | "monthly" | "pro";
export type ExchangeStatus =
  | "created"
  | "waiting_deposit"
  | "deposited"
  | "picked_up"
  | "completed"
  | "expired"
  | "overdue";

export const ROLE_LABELS: Record<AppRole, string> = {
  pending: "Pendiente",
  admin: "Administrador",
  associate: "Asociado",
  host: "Anfitrión",
  kiosk: "Punto",
};

export const ROLE_HOME: Record<AppRole, string> = {
  pending: "/login",
  admin: "/admin",
  associate: "/associate",
  host: "/host",
  kiosk: "/kiosk",
};

export const PLAN_LABELS: Record<SubscriptionType, string> = {
  one_use: "Pasa Una",
  monthly: "Pasa Mes",
  pro: "Pasa Pro",
};

export const PLAN_PRICES: Record<SubscriptionType, number | null> = {
  one_use: 7500,
  monthly: 30000,
  pro: null,
};

export const EXTRA_DAY_PRICE = 1500;
export const ONE_USE_STORAGE_HOURS = 48;

export const STATUS_LABELS: Record<ExchangeStatus, string> = {
  created: "Creado",
  waiting_deposit: "Esperando depósito",
  deposited: "Depositada",
  picked_up: "Retirada",
  completed: "Completado",
  expired: "Vencido",
  overdue: "Atrasado",
};

export const STATUS_TONE: Record<
  ExchangeStatus,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  created: "neutral",
  waiting_deposit: "neutral",
  deposited: "info",
  picked_up: "info",
  completed: "success",
  expired: "danger",
  overdue: "warning",
};

export const KIOSK_CATEGORIES = [
  { value: "kiosco", label: "Kiosco" },
  { value: "cafe", label: "Café" },
  { value: "estacionamiento", label: "Estacionamiento" },
  { value: "tienda", label: "Tienda" },
  { value: "farmacia", label: "Farmacia" },
  { value: "lavanderia", label: "Lavandería" },
  { value: "recepcion", label: "Recepción" },
  { value: "coworking", label: "Coworking" },
  { value: "hotel", label: "Hotel" },
  { value: "otro", label: "Otro" },
] as const;

export const WEEKDAYS = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
] as const;

export type DaySchedule = { open: string; close: string } | null;
export type KioskSchedule = Record<string, DaySchedule>;

/** 00:00, 00:30 ... 23:30 */
export const TIME_SLOTS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

const DIGITS = "0123456789";
const LETTERS = "ABCDEFGHIJKLMNPQRSTUVWXYZ";

function pick(source: string, length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += source[Math.floor(Math.random() * source.length)];
  }
  return out;
}

/** Código de intercambio: XXX-XXX */
export function generateExchangeCode(): string {
  return `${pick(DIGITS, 3)}-${pick(DIGITS, 3)}`;
}

/** Referencia de reserva: ABC-123 */
export function generateBookingRef(): string {
  return `${pick(LETTERS, 3)}-${pick(DIGITS, 3)}`;
}

/** Código de punto: PP-XXXXXX */
export function generateKioskCode(): string {
  return `PP-${pick(LETTERS + DIGITS, 6)}`;
}

/** Posición aleatoria entre las libres del punto. */
export function pickFreePosition(totalPositions: number, taken: number[]): number {
  const free: number[] = [];
  for (let i = 1; i <= totalPositions; i += 1) {
    if (!taken.includes(i)) free.push(i);
  }
  if (free.length === 0) return 0;
  return free[Math.floor(Math.random() * free.length)]!;
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function describeSchedule(is24h: boolean, schedule: KioskSchedule | null): string {
  if (is24h) return "Abierto 24 horas";
  if (!schedule) return "Sin horario cargado";
  const open = WEEKDAYS.filter((d) => schedule[d.key]);
  if (open.length === 0) return "Sin horario cargado";
  const first = schedule[open[0]!.key]!;
  const uniform = open.every(
    (d) => schedule[d.key]!.open === first.open && schedule[d.key]!.close === first.close,
  );
  if (uniform && open.length === 7) return `Todos los días ${first.open} – ${first.close}`;
  return open
    .map((d) => `${d.label.slice(0, 3)} ${schedule[d.key]!.open}-${schedule[d.key]!.close}`)
    .join(" · ");
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function toMinutes(value: string): number {
  const [h, m] = value.split(":");
  return Number(h ?? 0) * 60 + Number(m ?? 0);
}

export type OpenState = { open: boolean; nextOpen: Date | null; closesAt: string | null };

/** Estado de apertura del punto según su horario semanal. */
export function kioskOpenState(
  is24h: boolean,
  schedule: KioskSchedule | null,
  now: Date = new Date(),
): OpenState {
  if (is24h) return { open: true, nextOpen: null, closesAt: null };
  if (!schedule) return { open: false, nextOpen: null, closesAt: null };

  const current = now.getHours() * 60 + now.getMinutes();
  const today = schedule[DAY_KEYS[now.getDay()]!];
  if (today && toMinutes(today.open) <= current && current < toMinutes(today.close)) {
    return { open: true, nextOpen: null, closesAt: today.close };
  }

  for (let i = 0; i < 8; i += 1) {
    const day = new Date(now);
    day.setDate(day.getDate() + i);
    const slot = schedule[DAY_KEYS[day.getDay()]!];
    if (!slot) continue;
    const [h, m] = slot.open.split(":");
    day.setHours(Number(h ?? 0), Number(m ?? 0), 0, 0);
    if (day.getTime() > now.getTime()) return { open: false, nextOpen: day, closesAt: null };
  }
  return { open: false, nextOpen: null, closesAt: null };
}

/** "2 h 15 min" */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "0 min";
  const totalMinutes = Math.ceil(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

export const ACCESS_ROLES = [
  { value: "guest", label: "Huésped" },
  { value: "cleaning", label: "Limpieza" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "other", label: "Otro" },
] as const;

export const ACCESS_ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ACCESS_ROLES.map((r) => [r.value, r.label]),
);

export const ACCESS_SCOPES = [
  { value: "both", label: "Depósito y retiro" },
  { value: "deposit", label: "Solo depósito" },
  { value: "pickup", label: "Solo retiro" },
] as const;

export const ACCESS_SCOPE_LABELS: Record<string, string> = Object.fromEntries(
  ACCESS_SCOPES.map((s) => [s.value, s.label]),
);

export const ACTION_LABELS: Record<string, string> = {
  deposited: "Depósito",
  picked_up: "Retiro",
  completed: "Devolución",
  exchange_created: "Intercambio creado",
};
