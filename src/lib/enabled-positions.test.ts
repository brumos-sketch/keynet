import { describe, expect, it } from "vitest";
import { parsePositionList, pickFreePosition } from "./pasallave";

describe("casilleros habilitados", () => {
  it("solo asigna 1, 4, 8 o 16", () => {
    for (let i = 0; i < 200; i += 1) expect([1, 4, 8, 16]).toContain(pickFreePosition(16, [], [1, 4, 8, 16]));
  });
  it("salta los habilitados ocupados", () => {
    expect(pickFreePosition(16, [1, 4, 8], [1, 4, 8, 16])).toBe(16);
    expect(pickFreePosition(16, [1, 4, 8, 16], [1, 4, 8, 16])).toBe(0);
  });
  it("lista vacía usa todos", () => {
    expect(pickFreePosition(2, [1], [])).toBe(2);
  });
  it("interpreta el texto del administrador", () => {
    expect(parsePositionList("1, 4, 8 16, 99", 16)).toEqual([1, 4, 8, 16]);
  });
});
