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

import { STATUS_LABELS } from "./pasallave";
describe("listados de intercambios", () => {
  it("un intercambio devuelto indica que la llave está en el locker", () => {
    expect(STATUS_LABELS.completed).toBe(STATUS_LABELS.deposited);
  });
});

import { isKeyInLocker } from "./pasallave";
describe("eliminar llave", () => {
  it("bloquea si la llave está depositada o devuelta al locker", () => {
    expect(isKeyInLocker([{ status: "deposited", locker_position: 3 }])).toBe(true);
    expect(isKeyInLocker([{ status: "completed", locker_position: 5 }])).toBe(true);
  });
  it("permite si la llave no está en el locker", () => {
    expect(isKeyInLocker([{ status: "picked_up", locker_position: 0 }, { status: "completed", locker_position: 0 }])).toBe(false);
    expect(isKeyInLocker([{ status: "waiting_deposit", locker_position: 0 }])).toBe(false);
  });
});
