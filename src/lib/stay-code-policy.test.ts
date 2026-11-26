import { describe, expect, it } from "vitest";
import { argentinaClock, assertPickupValidity, canEditStayCode, stayCodeEditSchema } from "./stay-code-policy";
import { formatValidity } from "./pasallave";

const exchangeId = "00000000-0000-4000-8000-000000000001";
describe("código Pasa Mes", () => {
  it("interpreta el retiro de las 02:57 UTC como las 23:57 del día anterior en Argentina", () => {
    expect(argentinaClock(new Date("2026-11-26T02:57:14Z"))).toEqual({ today: "2026-11-25", time: "23:57" });
    expect(() => assertPickupValidity({ timeFrom: "15:00" }, new Date("2026-11-26T02:57:14Z"))).not.toThrow();
  });
  it("rechaza las 14:59 de Argentina para un retiro desde 15:00", () => {
    expect(() => assertPickupValidity({ timeFrom: "15:00" }, new Date("2026-11-26T17:59:00Z"))).toThrow("aún no es válido en este horario");
  });
  it("rechaza las 23:57 si se configura una hora final de 21:00", () => {
    expect(() => assertPickupValidity({ timeFrom: "15:00", timeTo: "21:00" }, new Date("2026-11-26T02:57:14Z"))).toThrow("ya no es válido en este horario");
  });
  it("el límite final 21:00 coincide con la validación mensual hasta el segundo", () => {
    expect(() => assertPickupValidity({ timeTo: "21:00" }, new Date("2026-11-27T00:00:00Z"))).not.toThrow();
    expect(() => assertPickupValidity({ timeTo: "21:00" }, new Date("2026-11-27T00:00:01Z"))).toThrow("ya no es válido en este horario");
  });
  it("permite editar un código mensual después de retirar la llave", () => {
    expect(canEditStayCode("picked_up", "monthly")).toBe(true);
  });
  it("no permite editar códigos de estadías mensuales cerradas", () => {
    expect(canEditStayCode("completed", "monthly")).toBe(false);
  });
  it("conserva la restricción de edición para retiros Pasa Una", () => {
    expect(canEditStayCode("picked_up", "one_use")).toBe(false);
  });
  it("solo admite el rol huésped", () => {
    expect(stayCodeEditSchema.safeParse({ exchangeId, role: "cleaning" }).success).toBe(false);
  });
  it("guarda la frecuencia reutilizable", () => {
    expect(stayCodeEditSchema.parse({ exchangeId, reusable: true }).reusable).toBe(true);
  });
  it("guarda un ciclo único", () => {
    expect(stayCodeEditSchema.parse({ exchangeId, reusable: false }).reusable).toBe(false);
  });
  it("admite límites horarios también para códigos reutilizables", () => {
    const value = stayCodeEditSchema.parse({ exchangeId, reusable: true, pickupTime: "15:00", pickupUntil: "21:00" });
    expect(value.pickupTime).toBe("15:00");
    expect(value.pickupUntil).toBe("21:00");
  });
  it("rechaza un rango de fechas invertido", () => {
    expect(stayCodeEditSchema.safeParse({ exchangeId, checkIn: "2026-11-27", checkOut: "2026-11-26" }).success).toBe(false);
  });
  it("rechaza un rango horario invertido", () => {
    expect(stayCodeEditSchema.safeParse({ exchangeId, pickupTime: "21:00", pickupUntil: "15:00" }).success).toBe(false);
  });
});
describe("formatValidity", () => {
  it("muestra solo la fecha inicial cuando no hay fecha final", () => {
    expect(formatValidity({ from: "2026-11-27", timeFrom: "15:00" })).toBe("Desde 27/11/2026 · Retiro desde 15:00");
  });
  it("muestra solo la fecha final", () => {
    expect(formatValidity({ to: "2026-11-30" })).toBe("Hasta 30/11/2026");
  });
  it("sin límites queda libre", () => {
    expect(formatValidity({})).toBe("Sin fechas (libre)");
  });
});
