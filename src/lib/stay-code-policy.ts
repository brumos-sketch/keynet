import { z } from "zod";

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