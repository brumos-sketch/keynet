import { describe, expect, it } from "vitest";
import { keyBadgeOf, keyStateOf } from "./pasallave";

describe("estado de la llave", () => {
  it("una llave devuelta por el huésped figura En el locker", () => {
    expect(keyStateOf("completed")?.label).toBe("En el locker");
  });
  it("el badge usa el último intercambio", () => {
    const badge = keyBadgeOf([
      { status: "picked_up", created_at: "2026-11-01T00:00:00Z" },
      { status: "completed", created_at: "2026-11-26T01:27:00Z" },
    ]);
    expect(badge?.label).toBe("En el locker");
  });
  it("una llave retirada figura Llave en uso", () => {
    expect(keyStateOf("picked_up")?.label).toBe("Llave en uso");
  });
});
