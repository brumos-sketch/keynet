import { describe, expect, it } from "vitest";
import { claimCodeSchema, deriveEnrollmentKey, deviceSecretSchema, generateClaimCode, ENROLLMENT_SECONDS } from "./locker-enrollment";
import { hashLockerKey } from "./locker-key";

describe("locker enrollment security", () => {
  it("expires after ten minutes", () => expect(ENROLLMENT_SECONDS).toBe(600));
  it("requires a 256-bit device secret", () => {
    expect(deviceSecretSchema.safeParse("123456").success).toBe(false);
    expect(deviceSecretSchema.safeParse("a".repeat(64)).success).toBe(true);
  });
  it("requires the complete temporary claim code", () => {
    expect(claimCodeSchema.safeParse("LK-1234").success).toBe(false);
    expect(claimCodeSchema.parse("lk-abc-123")).toBe("LK-ABC-123");
    expect(claimCodeSchema.safeParse("LK-A1B2C3D4").success).toBe(false);
  });
  it("generates three random letters and three digits for lockers", () => {
    const codes = Array.from({ length: 100 }, () => generateClaimCode("locker"));
    for (const code of codes) expect(code).toMatch(/^LK-[A-Z]{3}-[0-9]{3}$/);
    expect(new Set(codes).size).toBeGreaterThan(1);
  });
  it("uses PT and the same format for assisted points", () => {
    expect(generateClaimCode("point")).toMatch(/^PT-[A-Z]{3}-[0-9]{3}$/);
    expect(claimCodeSchema.parse("pt-abc-123")).toBe("PT-ABC-123");
  });
  it("redelivers the same key after a lost response without storing plaintext", async () => {
    const key = await deriveEnrollmentKey("a".repeat(64), "enrollment-1", "locker-1");
    expect(await deriveEnrollmentKey("a".repeat(64), "enrollment-1", "locker-1")).toBe(key);
    expect(await hashLockerKey(key)).not.toBe(key);
    expect(await deriveEnrollmentKey("b".repeat(64), "enrollment-1", "locker-1")).not.toBe(key);
    expect(await deriveEnrollmentKey("a".repeat(64), "enrollment-1", "locker-2")).not.toBe(key);
    expect(await deriveEnrollmentKey("a".repeat(64), "enrollment-2", "locker-1")).not.toBe(key);
  });
});