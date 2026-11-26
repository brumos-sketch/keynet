export type AppRole = "pending" | "admin" | "associate" | "host" | "kiosk";

/** Minúsculas, sin acentos ni separadores: "ABC-123" -> "abc123" */
export function normalize(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\-_./]/g, "");
}

/** true si alguno de los campos contiene el término buscado (normalizado). */
export function matchesQuery(fields: Array<unknown>, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  return fields.some((f) => normalize(f).includes(q));
}

export type SubscriptionType = "one_use" | "monthly" | "pro";
export type ExchangeStatus =
  "created" | "waiting_deposit" | "deposited" | "picked_up" | "completed" | "expired" | "overdue";

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
  kiosk: "/point",
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
  completed: "Devuelta · en el locker",
  expired: "Vencido",
  overdue: "Atrasado",
};

export type Tone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "primary"
  | "purple"
  | "sky"
  | "amber"
  | "orange"
  | "gold";

export const STATUS_TONE: Record<ExchangeStatus, Tone> = {
  created: "neutral",
  waiting_deposit: "amber",
  deposited: "info",
  picked_up: "purple",
  completed: "info",
  expired: "danger",
  overdue: "orange",
};

export const PLAN_TONE: Record<SubscriptionType, Tone> = {
  one_use: "sky",
  monthly: "primary",
  pro: "gold",
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

/** Código de intercambio crudo: 6 dígitos (se muestra como XXX-XXX con formatCode). */
export function generateExchangeCode(): string {
  return pick(DIGITS, 6);
}

/** Muestra un código de 6 dígitos como 123-456; otros valores se devuelven igual. */
export function formatCode(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 6 && /^[\d\s-]+$/.test(value)) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return value;
}

/** Referencia de reserva: ABC-123 */
export function generateBookingRef(): string {
  return `${pick(LETTERS, 3)}-${pick(DIGITS, 3)}`;
}

/** Código de punto: PP-XXXXXX */
/** Código numérico de 6 dígitos para ingresar al panel del punto. */
export function generateKioskCode(): string {
  return pick(DIGITS, 6);
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
  const d = new Date(value);
  const parts = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} - ${get("hour")}:${get("minute")}`;
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
  completed: "Llave depositada (devuelta por el huésped)",
  exchange_created: "Intercambio creado",
  exchange_updated: "Estadía editada",
};

/** Dirección corta y homogénea para mostrar: "Calle 123, Barrio". */
export function formatAddress(address: string | null | undefined): string {
  if (!address) return "";
  const drop = /^(argentina|caba|buenos aires|comuna \d+|c(iu)?dad\.? aut[oó]noma de buenos aires)$/i;
  let parts = address
    .split(",")
    .map((p) =>
      p
        .replace(/\b[A-Z]\d{4}[A-Z]{0,3}\b/g, "")
        .replace(/c(iu)?dad\.? aut[oó]noma de buenos aires/gi, "")
        .replace(/\bAvenida\b/g, "Av.")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((p) => p && !drop.test(p));
  if (parts.length >= 2 && /^\d+$/.test(parts[0]!)) {
    parts = [`${parts[1]} ${parts[0]}`, ...parts.slice(2)];
  }
  const out = parts.slice(0, 2).join(", ");
  return out || address;
}

/** Estado simplificado de la llave para el badge (3 estados). */
export function keyStateOf(status: string | null | undefined): { label: string; tone: Tone } | null {
  if (status === "created" || status === "waiting_deposit") return { label: "Esperando primer depósito", tone: "amber" };
  if (status === "deposited") return { label: "En el locker", tone: "info" };
  if (status === "picked_up") return { label: "Llave en uso", tone: "purple" };
  // Returned by the guest: the key is physically back in the point.
  if (status === "completed") return { label: "En el locker", tone: "info" };
  return null;
}

/** Badge of a key from its latest exchange (a returned key counts as "En el locker"). */
export function keyBadgeOf<T extends { status: string; created_at: string }>(
  exchanges: T[],
): { label: string; tone: Tone } | null {
  const latest = [...exchanges].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];
  return latest ? keyStateOf(latest.status) : null;
}

/** Texto de vigencia de un código: admite solo inicio, solo fin o ambos. */
export function formatValidity(v: { from?: string | null; to?: string | null; timeFrom?: string | null; timeTo?: string | null }): string {
  const dates = v.from && v.to ? `${formatDate(v.from)} → ${formatDate(v.to)}`
    : v.from ? `Desde ${formatDate(v.from)}`
    : v.to ? `Hasta ${formatDate(v.to)}`
    : "Sin fechas (libre)";
  const times = v.timeFrom && v.timeTo ? `Retiro de ${v.timeFrom.slice(0, 5)} a ${v.timeTo.slice(0, 5)}`
    : v.timeFrom ? `Retiro desde ${v.timeFrom.slice(0, 5)}`
    : v.timeTo ? `Retiro hasta ${v.timeTo.slice(0, 5)}`
    : "";
  return times ? `${dates} · ${times}` : dates;
}
