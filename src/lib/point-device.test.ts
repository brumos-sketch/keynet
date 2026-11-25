import { describe, expect, it } from "vitest";
import { isRevokedDevice, pointEnrollmentSchema } from "./point-device";

describe("persistent assisted point pairing", () => {
  it("does not discard pairing on a network interruption", () => {
    expect(isRevokedDevice(new Error("Failed to fetch"))).toBe(false);
    expect(isRevokedDevice(new Error("Demasiados intentos"))).toBe(false);
  });
  it("requires pairing again on confirmed administrator revocation", () => {
    expect(isRevokedDevice(new Error("API key inválida o revocada"))).toBe(true);
  });
  it("restores complete PT enrollment state after closing the browser", () => {
    const state = {
      deviceSecret: "a".repeat(64), enrollmentId: "b7a1764c-5cd1-4e56-94e0-73a385ce1011",
      claimCode: "PT-ABC-123", expiresAt: "2026-11-25T23:00:00.000Z",
    };
    expect(pointEnrollmentSchema.parse(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(pointEnrollmentSchema.safeParse({ ...state, claimCode: "LK-ABC-123" }).success).toBe(false);
  });
});