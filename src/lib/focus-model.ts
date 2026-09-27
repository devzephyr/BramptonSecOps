import {
  BREAK_MS,
  DRIVING_LIMIT_MS,
  WARN_BEFORE_MS,
  formatDuration,
  summarizeHos,
  type DutyPoint,
  type DutyStatusName,
  type HosSummary,
} from "@/lib/hos";

/** One freshness window, one movement threshold, one dwell threshold. Shared with position ingestion. */
export const TELEMETRY_FRESH_MS = 5 * 60 * 1000;
export const MOVEMENT_MPS = 8000 / 3600;
export const MIN_MOVE_M = 100;
export const DWELL_MS = 5 * 60 * 1000;
export const SPEED_BASELINE_MS = 20_000;

export const FOCUS_ACTIONS = [
  "confirm_rest_start",
  "confirm_rest_end",
  "resume_driving",
  "correct_duty_status",
  "record_facility_drop",
] as const;
export type FocusAction = (typeof FOCUS_ACTIONS)[number];

export type CabState =
  | "moving"
  | "stopped_short"
  | "stopped_dwell"
  | "stopped_break_required"
  | "stopped_rest_in_progress"
  | "telemetry_stale"
  | "arrived"
  | "action_required";

export type FocusPing = { lat: number; lng: number; recordedAt: Date | string };

export type FocusLoad = {
  id: string;
  loadRef: string;
  origin: string;
  destination: string;
  dock: string | null;
  setpoint: string | null;
  eta: string | null;
  status: string;
  commodity: string;
};

export type FocusState = {
  stateVersion: string;
  generatedAt: string;
  serverNow: string;
  telemetryAt: string | null;
  telemetryFresh: boolean;
  cabState: CabState;
  headline: string;
  speedMps: number | null;
  dwellMs: number;
  hos: HosSummary;
  rest: {
    drivingRemainingMs: number;
    breakRequired: boolean;
    breakRemainingMs: number;
    restInProgress: boolean;
    restElapsedMs: number;
    nextBreakWarningMs: number | null;
    sleeperBerthRecommended: boolean;
    /** The 8-hour rule does not determine a sleeper-berth requirement. Always false. */
    sleeperBerthRequired: false;
  };
  requiredAction: FocusAction | null;
  allowedActions: FocusAction[];
  stepUpRequired: boolean;
  load: FocusLoad;
  position: { lat: number; lng: number; at: string } | null;
  /** Server pings, oldest first. The HUD draws this over the planned route. */
  trail: { lat: number; lng: number }[];
};

export function isFocusAction(value: unknown): value is FocusAction {
  return typeof value === "string" && (FOCUS_ACTIONS as readonly string[]).includes(value);
}

export function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

export function movementSample(input: { elapsedMs: number; distanceM: number }) {
  if (input.elapsedMs <= 0 || input.distanceM < MIN_MOVE_M) return { speedMps: 0, moving: false };
  const speedMps = input.distanceM / (input.elapsedMs / 1000);
  return { speedMps, moving: speedMps >= MOVEMENT_MPS };
}

/** GPS may record driving once. A second fix while already driving must not append another entry. */
export function shouldRecordGpsDriving(currentStatus: string, moving: boolean) {
  return currentStatus !== "driving" && moving;
}

function atMs(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function versionOf(parts: Record<string, string | boolean | null>) {
  const keys = Object.keys(parts).sort();
  return JSON.stringify(keys.map((key) => [key, parts[key]]));
}

function headlineFor(cab: CabState, required: FocusAction | null): string {
  if (cab === "moving") return "ROLLING";
  if (cab === "telemetry_stale") return "TELEMETRY STALE";
  if (cab === "arrived") return "ARRIVED";
  if (required) return "AUTHENTICATION REQUIRED";
  if (cab === "stopped_dwell") return "STATIONARY / DWELL";
  return "STATIONARY";
}

/**
 * Derives the cab from server clocks and server-stored pings.
 * `now` is required so callers cannot lean on a hidden client clock.
 * A client breakOwed flag is not an input.
 */
export function deriveFocusState(input: {
  now: Date;
  driverId: string;
  load: FocusLoad;
  duty: DutyPoint[];
  pings: FocusPing[];
}): FocusState {
  const nowMs = input.now.getTime();
  const hos = summarizeHos(input.duty, input.now);
  const pings = input.pings
    .map((ping) => ({ ...ping, at: atMs(ping.recordedAt) }))
    .filter((ping) => Number.isFinite(ping.at) && ping.at <= nowMs)
    .sort((a, b) => a.at - b.at);
  const latest = pings[pings.length - 1] ?? null;
  const telemetryFresh = latest !== null && nowMs - latest.at <= TELEMETRY_FRESH_MS;
  const baseline = latest
    ? [...pings].reverse().find((ping) => latest.at - ping.at >= SPEED_BASELINE_MS && latest.at - ping.at <= TELEMETRY_FRESH_MS)
    : undefined;
  const sample =
    latest && baseline
      ? movementSample({ elapsedMs: latest.at - baseline.at, distanceM: metersBetween(baseline, latest) })
      : { speedMps: 0, moving: false };
  const moving = telemetryFresh && sample.moving;

  let dwellMs = 0;
  if (telemetryFresh && latest && !moving) {
    let start = latest.at;
    for (let index = pings.length - 1; index > 0; index--) {
      const newer = pings[index];
      const older = pings[index - 1];
      const segment = movementSample({
        elapsedMs: newer.at - older.at,
        distanceM: metersBetween(older, newer),
      });
      if (segment.moving) break;
      start = older.at;
    }
    dwellMs = Math.max(0, nowMs - start);
  }

  const resting = hos.status !== "driving";
  const restElapsedMs = resting && hos.since ? Math.max(0, nowMs - new Date(hos.since).getTime()) : 0;
  let cabState: CabState;
  if (input.load.status === "arrived") cabState = "arrived";
  else if (!telemetryFresh) cabState = "telemetry_stale";
  else if (moving) cabState = "moving";
  else if (hos.breakOwed && resting) cabState = "stopped_rest_in_progress";
  else if (hos.breakOwed) cabState = "stopped_break_required";
  else if (dwellMs >= DWELL_MS) cabState = "stopped_dwell";
  else cabState = "stopped_short";

  const parked = cabState !== "moving" && cabState !== "telemetry_stale" && cabState !== "arrived";
  const allowed: FocusAction[] = [];
  if (parked) {
    if (hos.status === "driving" || hos.status === "on_duty") allowed.push("confirm_rest_start");
    if (resting && restElapsedMs > 0) allowed.push("confirm_rest_end");
    if (!hos.breakOwed) allowed.push("resume_driving");
    allowed.push("correct_duty_status", "record_facility_drop");
  }

  let requiredAction: FocusAction | null = null;
  if (parked && hos.breakOwed && hos.status === "driving") requiredAction = "confirm_rest_start";
  if (requiredAction && !allowed.includes(requiredAction)) requiredAction = null;

  const restInProgress = parked && resting && restElapsedMs > 0;
  return {
    stateVersion: versionOf({
      cab: cabState,
      duty: hos.status,
      breakOwed: hos.breakOwed,
      fresh: telemetryFresh,
      load: input.load.id,
      driver: input.driverId,
      loadStatus: input.load.status,
      required: requiredAction,
    }),
    generatedAt: input.now.toISOString(),
    serverNow: input.now.toISOString(),
    telemetryAt: latest ? new Date(latest.at).toISOString() : null,
    telemetryFresh,
    cabState,
    headline: headlineFor(cabState, requiredAction),
    speedMps: telemetryFresh ? sample.speedMps : null,
    dwellMs,
    hos,
    rest: {
      drivingRemainingMs: hos.remainingMs,
      breakRequired: hos.breakOwed,
      breakRemainingMs: hos.breakLeftMs,
      restInProgress,
      restElapsedMs,
      nextBreakWarningMs: !hos.breakOwed && hos.remainingMs <= WARN_BEFORE_MS ? hos.remainingMs : null,
      sleeperBerthRecommended: parked && hos.breakOwed,
      sleeperBerthRequired: false,
    },
    requiredAction,
    allowedActions: allowed,
    stepUpRequired: allowed.length > 0,
    load: input.load,
    position: latest ? { lat: latest.lat, lng: latest.lng, at: new Date(latest.at).toISOString() } : null,
    trail: pings.map((ping) => ({ lat: ping.lat, lng: ping.lng })),
  };
}

/** "4 C" -> "4°C". The HUD adds the nominal/status word beside it. */
export function formatReeferTemp(setpoint: string | null): string {
  if (!setpoint?.trim()) return "—";
  const match = setpoint.trim().match(/^(-?\d+(?:\.\d+)?)\s*°?\s*c$/i);
  if (match) return `${match[1]}°C`;
  return setpoint.trim();
}

/** Clock time only, in the viewer's zone. No date and no seconds. */
export function formatHudEta(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function focusCabLine(state: { cabState: CabState; dwellMs: number }): string {
  if (state.cabState === "moving") return "ROLLING";
  if (state.cabState === "telemetry_stale") return "TELEMETRY STALE";
  if (state.cabState === "arrived") return "ARRIVED";
  if (state.dwellMs > 0) return `STATIONARY · DWELL ${formatDuration(state.dwellMs)}`;
  return "STATIONARY";
}

export type CeremonyView = {
  userId: string;
  driverId: string;
  orgId: string;
  loadId: string;
  action: FocusAction;
  stateVersion: string;
  expiresAt: Date;
  usedAt: Date | null;
};

/** The action is the one stored on the ceremony. A different action in the request body is ignored. */
export function actionFromCeremony(ceremony: { action: FocusAction }, body: { action?: unknown }) {
  void body.action;
  return ceremony.action;
}

export function assessCeremony(input: {
  ceremony: CeremonyView;
  actorId: string;
  orgId: string;
  now: Date;
  current: FocusState;
}): { ok: true } | { ok: false; reason: "replayed" | "expired" | "other_driver" | "other_load" | "other_actor" | "state_changed" | "not_allowed" } {
  const { ceremony, current } = input;
  if (ceremony.usedAt) return { ok: false, reason: "replayed" };
  if (ceremony.expiresAt.getTime() <= input.now.getTime()) return { ok: false, reason: "expired" };
  if (ceremony.userId !== input.actorId || ceremony.orgId !== input.orgId) return { ok: false, reason: "other_actor" };
  if (ceremony.driverId !== input.actorId) return { ok: false, reason: "other_driver" };
  if (ceremony.loadId !== current.load.id) return { ok: false, reason: "other_load" };
  if (ceremony.stateVersion !== current.stateVersion) return { ok: false, reason: "state_changed" };
  if (!current.allowedActions.includes(ceremony.action)) return { ok: false, reason: "not_allowed" };
  return { ok: true };
}

export function claimCeremony(row: { usedAt: Date | null; expiresAt: Date }, now: Date) {
  if (row.usedAt) return "replayed" as const;
  if (row.expiresAt.getTime() <= now.getTime()) return "expired" as const;
  return "ok" as const;
}

export type HudLink = "online" | "offline";

/** What the HUD is allowed to draw. It never decides that a break is owed. */
export function focusHudPresentation(state: FocusState, link: HudLink) {
  const moving = state.cabState === "moving";
  const offline = link === "offline";
  return {
    headline: state.headline,
    mapVisible: true,
    showBanner: !moving && !offline && state.requiredAction !== null,
    actions: moving || offline ? [] : state.allowedActions,
    markStale: offline || !state.telemetryFresh,
    disableDutyWhileMoving: moving,
    webAuthnOnRender: false,
    vibrate: false,
    modal: false,
    sessionRevoked: false,
    drivingRemainingMs: state.rest.drivingRemainingMs,
    warnings: {
      restRecommended: state.rest.sleeperBerthRecommended,
      breakRequired: state.rest.breakRequired,
      restInProgress: state.rest.restInProgress,
      sleeperRecorded: state.hos.status === "sleeper_berth",
    },
  };
}

export function focusActionError(error: unknown): { kind: string; message: string } {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "";
  if (name === "NotAllowedError" || /not allowed|cancel/i.test(message)) {
    return { kind: "cancelled", message: "Authentication cancelled. You are still signed in." };
  }
  if (name === "NotSupportedError" || /webauthn|passkey is not/i.test(message)) {
    return { kind: "unavailable", message: "This device cannot use a passkey. The duty action was not recorded." };
  }
  if (/failed to fetch|network|offline/i.test(message)) {
    return { kind: "offline", message: "You are offline. Nothing was written. The last update is still on screen." };
  }
  if (/expired/i.test(message)) {
    return { kind: "expired", message: "That authentication expired. Stay signed in and try the action again." };
  }
  return { kind: "failed", message: message || "The duty action was not recorded. You are still signed in." };
}

/** The HUD renders the server payload. It does not reset the driving bank locally. */
export function acceptServerFocus(server: FocusState): FocusState {
  return server;
}

export function dutyStatusForAction(action: FocusAction, target: DutyStatusName | null): DutyStatusName | null {
  if (action === "confirm_rest_start") return "off_duty";
  if (action === "confirm_rest_end") return "on_duty";
  if (action === "resume_driving") return "driving";
  if (action === "correct_duty_status") return target;
  return null;
}

/** A direct duty-status post maps to a step-up action and is not itself the write. */
export function dutyPostNeedsStepUp(status: DutyStatusName): FocusAction {
  if (status === "driving") return "resume_driving";
  if (status === "on_duty") return "confirm_rest_end";
  return "confirm_rest_start";
}

export { BREAK_MS, DRIVING_LIMIT_MS };
