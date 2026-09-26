/**
 * Hours-of-service rule shared by the server (enforcement) and the desks (display).
 *
 * The org's rule: after 8 hours of driving, the driver must stop for a break before driving again.
 * The break has to be one continuous non-driving stretch of at least BREAK_MS (off duty, sleeper
 * berth, or on duty not driving all count). This mirrors the US 30-minute break rule
 * (49 CFR 395.3(a)(3)(ii)); confirm the break length with whoever owns compliance before relying on it.
 * Daily and cycle limits (13/14/16 h in Canada, 70 h/7 days, etc.) are not modelled here.
 */
export const DRIVING_LIMIT_MS = 8 * 60 * 60 * 1000;
export const BREAK_MS = 30 * 60 * 1000;
/** How early the desks start warning that a break is coming due. */
export const WARN_BEFORE_MS = 30 * 60 * 1000;

export const DUTY_STATUSES = ["off_duty", "sleeper_berth", "on_duty", "driving"] as const;
export type DutyStatusName = (typeof DUTY_STATUSES)[number];

export function isDutyStatus(value: unknown): value is DutyStatusName {
  return typeof value === "string" && (DUTY_STATUSES as readonly string[]).includes(value);
}

export type DutyPoint = { status: DutyStatusName; at: Date | string };

export type HosSummary = {
  /** Current duty status; off_duty when the log is empty. */
  status: DutyStatusName;
  /** When the current status began, or null for an empty log. */
  since: string | null;
  /** Driving time accumulated since the last qualifying break. */
  drivingMs: number;
  /** Driving time left before a break is owed (0 once owed). */
  remainingMs: number;
  /** A break is owed: the driver may not start driving again until it is taken. */
  breakOwed: boolean;
  /** While stopped with a break owed: how much of the break is left. */
  breakLeftMs: number;
  /** Driving past the limit right now. */
  overLimitMs: number;
  /** Start of the current driving stretch (first driving entry since the last qualifying break). */
  stretchStart: string | null;
};

const ms = (at: Date | string) => (at instanceof Date ? at.getTime() : new Date(at).getTime());

/** Summarize a driver's status entries (any order) as of `now`. */
export function summarizeHos(points: DutyPoint[], now: Date | number = Date.now()): HosSummary {
  const nowMs = typeof now === "number" ? now : now.getTime();
  const sorted = [...points].sort((a, b) => ms(a.at) - ms(b.at));

  let status: DutyStatusName = "off_duty";
  let since: number | null = null;
  let drivingMs = 0;
  let drivingStart: number | null = null;
  // An empty log counts as rested since forever.
  let restStart = Number.NEGATIVE_INFINITY;
  let stretchStart: number | null = null;

  for (const point of sorted) {
    const at = Math.min(ms(point.at), nowMs);
    if (point.status === status && since !== null) continue;
    if (point.status === "driving") {
      if (status !== "driving") {
        if (at - restStart >= BREAK_MS) {
          drivingMs = 0;
          stretchStart = at;
        }
        stretchStart ??= at;
        drivingStart = at;
      }
    } else if (status === "driving" && drivingStart !== null) {
      drivingMs += at - drivingStart;
      drivingStart = null;
      restStart = at;
    }
    status = point.status;
    since = at;
  }

  if (status === "driving" && drivingStart !== null) {
    drivingMs += nowMs - drivingStart;
  } else if (nowMs - restStart >= BREAK_MS) {
    drivingMs = 0;
    stretchStart = null;
  }

  const breakOwed = drivingMs >= DRIVING_LIMIT_MS;
  const resting = status !== "driving";
  return {
    status,
    since: since === null ? null : new Date(since).toISOString(),
    drivingMs,
    remainingMs: Math.max(0, DRIVING_LIMIT_MS - drivingMs),
    breakOwed,
    breakLeftMs: breakOwed && resting ? Math.max(0, BREAK_MS - (nowMs - restStart)) : 0,
    overLimitMs: breakOwed && !resting ? drivingMs - DRIVING_LIMIT_MS : 0,
    stretchStart: stretchStart === null ? null : new Date(stretchStart).toISOString(),
  };
}

/** "3h 05m" / "12m" */
export function formatDuration(msValue: number): string {
  const minutes = Math.max(0, Math.floor(msValue / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${String(rest).padStart(2, "0")}m` : `${rest}m`;
}
