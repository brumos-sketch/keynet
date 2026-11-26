import { ACTION_LABELS, roleLabel } from "./pasallave";

export function movementLabel(action: string | null, role: string | null | undefined): string {
  return `${ACTION_LABELS[action ?? ""] ?? action ?? "Movimiento"} (${role ? roleLabel(role) : "Rol no registrado"})`;
}

type Log = { id: string; action: string | null; role: string | null; person_name: string | null; timestamp: string };
export function notificationActor(action: string, date: string, logs: Log[]): string | null {
  const matches = logs.filter((log) => log.action === action && Math.abs(Date.parse(log.timestamp) - Date.parse(date)) < 3000);
  return matches.length === 1 ? matches[0]?.role ?? null : null;
}
type Stay = { id: string; booking_ref: string; status: string; created_at: string; deposited_at?: string | null; picked_up_at?: string | null; returned_at?: string | null };
type HistoryEvent = { type: string; label: string; ref: string | null; date: string; icon: string; who: string };

export function keyHistoryEvents(stays: Stay[], logs: Log[]): HistoryEvent[] {
  const events: HistoryEvent[] = logs.map((entry) => ({
    type: entry.action === "completed" ? "deposited" : entry.action ?? "movement",
    label: movementLabel(entry.action, entry.role),
    ref: null,
    date: entry.timestamp,
    icon: entry.action === "picked_up" || entry.action === "pickup" ? "↑" : ["deposited", "completed"].includes(entry.action ?? "") ? "↓" : "↻",
    who: entry.person_name ?? "",
  }));
  for (const stay of stays) {
    const candidates = [
      { action: "exchange_created", date: stay.created_at, icon: "+" },
      { action: "deposited", date: stay.deposited_at, icon: "↓" },
      { action: "picked_up", date: stay.picked_up_at, icon: "↑" },
      { action: "completed", date: stay.returned_at, icon: "↓" },
    ];
    for (const candidate of candidates) {
      if (!candidate.date || logs.some((log) => log.action === candidate.action && Math.abs(Date.parse(log.timestamp) - Date.parse(candidate.date ?? "")) < 3000)) continue;
      events.push({ type: candidate.action === "completed" ? "deposited" : candidate.action, label: movementLabel(candidate.action, null), ref: stay.booking_ref, date: candidate.date, icon: candidate.icon, who: "" });
    }
    if (stay.status === "expired") events.push({ type: "expired", label: "Código vencido (Sistema)", ref: stay.booking_ref, date: stay.created_at, icon: "⏳", who: "" });
  }
  return events.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function movementNotification(action: string, keyName: string, role: string | null | undefined): string {
  return `${movementLabel(action, role)} · ${keyName}`;
}

export function normalizeMovementNotification(message: string): string {
  return message.replace(/Se devolvió/gi, "Se depositó").replace(/devuelta/gi, "depositada").replace(/devuelto/gi, "depositado");
}