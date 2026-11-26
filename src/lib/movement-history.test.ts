import { describe, expect, it } from "vitest";
import { notificationActor, keyHistoryEvents } from "./movement-history";

const date = "2026-11-26T15:00:00Z";
const log = { id: "log", action: "completed", role: "host", person_name: null, timestamp: date };
describe("movement attribution", () => {
  it("uses the recorded host on a redeposit, rather than assuming guest", () => {
    expect(notificationActor("completed", date, [log])).toBe("host");
  });
  it("does not invent a role for missing or ambiguous records", () => {
    expect(notificationActor("picked_up", date, [log])).toBeNull();
    expect(notificationActor("completed", date, [log, { ...log, id: "other", role: "guest" }])).toBeNull();
  });
  it("includes non-movement actions and avoids duplicate physical movements", () => {
    const events = keyHistoryEvents([{ id: "stay", booking_ref: "ABC-123", status: "completed", created_at: "2026-11-25T15:00:00Z", returned_at: date }], [log, { ...log, id: "edit", action: "code_updated" }]);
    expect(events.filter((event) => event.type === "deposited")).toHaveLength(1);
    expect(events.filter((event) => event.type === "code_updated")).toHaveLength(1);
    expect(events).toHaveLength(3);
  });
});