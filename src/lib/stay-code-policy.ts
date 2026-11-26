import { z } from "zod";

export function canEditStayCode(status: string, plan: string): boolean {
  return ["created", "waiting_deposit", "deposited"].includes(status)
    || (plan === "monthly" && status === "picked_up");
}

export function argentinaClock(now = new Date()) {
  const local = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
  return { today: local.slice(0, 10), time: local.slice(11, 16) };
}

export function assertPickupValidity(limits: { from?: string | null; to?: string | null; timeFrom?: string | null; timeTo?: string | null }, now = new Date()) {
  const { today } = argentinaClock(now);
  const time = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(11, 23);
  const lower = limits.timeFrom?.length === 5 ? `${limits.timeFrom}:00.000` : limits.timeFrom;
  const upper = limits.timeTo?.length === 5 ? `${limits.timeTo}:00.000` : limits.timeTo;
  if (limits.from && today < limits.from) throw new Error("El código aún no es válido");
  if (limits.to && today > limits.to) throw new Error("El código expiró");
  if (lower && time < lower) throw new Error("El código aún no es válido en este horario");
  if (upper && time > upper) throw new Error("El código ya no es válido en este horario");
}

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida").refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Fecha inválida").nullable().optional();
const timeField = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horario inválido").nullable().optional();

export const stayCodeEditSchema = z.object({
  exchangeId: z.string().uuid(),
  checkIn: dateField,
  checkOut: dateField,
  pickupTime: timeField,
  pickupUntil: timeField,
  guestName: z.string().trim().max(80).nullable().optional(),
  reusable: z.boolean().optional(),
}).strict().superRefine((data, ctx) => {
  if (data.checkIn && data.checkOut && data.checkOut < data.checkIn) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["checkOut"], message: "La fecha final debe ser igual o posterior a la inicial" });
  }
  if (data.pickupTime && data.pickupUntil && data.pickupUntil < data.pickupTime) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pickupUntil"], message: "El horario final debe ser igual o posterior al inicial" });
  }
});