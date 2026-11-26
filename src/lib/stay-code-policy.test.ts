import { describe, expect, it } from "vitest";
import { stayCodeEditSchema } from "./stay-code-policy";

const exchangeId = "00000000-0000-4000-8000-000000000001";
describe("código Pasa Mes", () => {
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