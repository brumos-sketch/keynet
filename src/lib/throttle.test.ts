import { describe, expect, it } from "vitest";
import { lockedSeconds, nextFailure, RULES } from "./throttle";

const now = new Date("2026-11-25T12:00:00Z");

describe("brute-force throttle", () => {
  it("locks a device after 5 wrong point access codes for 15 minutes", () => {
    let s = null as ReturnType<typeof nextFailure> | null;
    for (let i = 0; i < 4; i++) s = nextFailure(s, RULES.pointLogin, now);
    expect(lockedSeconds(s, now)).toBe(0);
    s = nextFailure(s, RULES.pointLogin, now);
    expect(lockedSeconds(s, now)).toBe(15 * 60);
  });

  it("locks a device after 5 unknown key codes for 5 minutes", () => {
    let s = null as ReturnType<typeof nextFailure> | null;
    for (let i = 0; i < 5; i++) s = nextFailure(s, RULES.codeDevice, now);
    expect(lockedSeconds(s, now)).toBe(5 * 60);
  });

  it("forgets old failures after the window", () => {
    const old = { failures: 4, locked_until: null, updated_at: "2026-11-25T11:00:00Z" };
    expect(nextFailure(old, RULES.pointLogin, now).failures).toBe(1);
  });
});
