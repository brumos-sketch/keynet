import { describe, expect, it, vi } from "vitest";
import { generateExchangeCode } from "@/lib/pasallave";

describe("locker admin code", () => {
  it("never gives a key the default 456852 code", () => {
    const spy = vi.spyOn(Math, "random");
    // first pick 456852, then 111111
    [4, 5, 6, 8, 5, 2, 1, 1, 1, 1, 1, 1].forEach((d) => spy.mockReturnValueOnce(d / 10 + 0.01));
    expect(generateExchangeCode()).toBe("111111");
    spy.mockRestore();
  });
  it("skips a custom locker admin code", () => {
    const spy = vi.spyOn(Math, "random");
    [7, 7, 7, 7, 7, 7, 2, 2, 2, 2, 2, 2].forEach((d) => spy.mockReturnValueOnce(d / 10 + 0.01));
    expect(generateExchangeCode(["777-777"])).toBe("222222");
    spy.mockRestore();
  });
});
