/** Pure brute-force throttle policy (shared by point terminals and locker API). */
export type ThrottleRule = { maxFailures: number; lockMinutes: number; windowMinutes: number };

export const RULES = {
  /** Wrong point access codes from one device/IP. */
  pointLogin: { maxFailures: 5, lockMinutes: 15, windowMinutes: 15 },
  /** Wrong key codes from one device/IP at one point. */
  codeDevice: { maxFailures: 5, lockMinutes: 5, windowMinutes: 15 },
  /** Wrong key codes at one point from anywhere. */
  codePoint: { maxFailures: 20, lockMinutes: 10, windowMinutes: 15 },
} satisfies Record<string, ThrottleRule>;

export type ThrottleState = { failures: number; locked_until: string | null; updated_at: string };

export function lockedSeconds(state: ThrottleState | null, now: Date): number {
  if (!state?.locked_until) return 0;
  const ms = new Date(state.locked_until).getTime() - now.getTime();
  return ms > 0 ? Math.ceil(ms / 1000) : 0;
}

export function nextFailure(state: ThrottleState | null, rule: ThrottleRule, now: Date): ThrottleState {
  const fresh =
    !state ||
    now.getTime() - new Date(state.updated_at).getTime() > rule.windowMinutes * 60_000 ||
    (state.locked_until !== null && new Date(state.locked_until) <= now);
  const failures = (fresh ? 0 : state.failures) + 1;
  const locked_until =
    failures >= rule.maxFailures ? new Date(now.getTime() + rule.lockMinutes * 60_000).toISOString() : null;
  return { failures: locked_until ? 0 : failures, locked_until, updated_at: now.toISOString() };
}
