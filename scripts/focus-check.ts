import assert from "node:assert/strict";

process.env.DATABASE_URL ??= "postgres://unused@localhost/unused";

async function main() {
  const {
    DWELL_MS,
    DRIVING_LIMIT_MS,
    acceptServerFocus,
    actionFromCeremony,
    assessCeremony,
    claimCeremony,
    deriveFocusState,
    focusActionError,
    focusHudPresentation,
    metersBetween,
    movementSample,
    focusCabLine,
    formatHudEta,
    formatReeferTemp,
    shouldRecordGpsDriving,
  } = await import("../src/lib/focus-model");
  const { plannedRoute } = await import("../src/lib/tracking");
  const { dutyHash, GENESIS_HASH } = await import("../src/lib/duty");

  const H = 60 * 60 * 1000;
  const M = 60 * 1000;
  const now = new Date("2026-09-26T18:00:00.000Z");
  const load = {
    id: "load-1",
    loadRef: "LO-5507",
    origin: "Brampton cross-dock",
    destination: "North York fresh market",
    dock: "Door 1",
    setpoint: "4 C",
    eta: null,
    status: "scheduled",
    commodity: "produce",
  };
  const here = { lat: 43.7, lng: -79.7 };
  const moved = { lat: 43.702, lng: -79.7 };

  function state(partial: {
    duty?: { status: "off_duty" | "sleeper_berth" | "on_duty" | "driving"; at: Date }[];
    pings?: { lat: number; lng: number; recordedAt: Date }[];
    at?: Date;
    loadStatus?: string;
    driverId?: string;
  }) {
    return deriveFocusState({
      now: partial.at ?? now,
      driverId: partial.driverId ?? "driver-1",
      load: { ...load, status: partial.loadStatus ?? load.status },
      duty: partial.duty ?? [{ status: "driving", at: new Date(now.getTime() - 10 * M) }],
      pings: partial.pings ?? [
        { ...here, recordedAt: new Date(now.getTime() - 2 * M) },
        { ...here, recordedAt: new Date(now.getTime() - 30 * 1000) },
      ],
    });
  }

  const rolling = state({
    pings: [
      { ...here, recordedAt: new Date(now.getTime() - 80 * 1000) },
      { ...moved, recordedAt: new Date(now.getTime() - 20 * 1000) },
    ],
  });
  assert.ok(metersBetween(here, moved) >= 100);
  assert.equal(movementSample({ elapsedMs: 60_000, distanceM: metersBetween(here, moved) }).moving, true);
  assert.equal(rolling.cabState, "moving");
  assert.equal(rolling.headline, "ROLLING");
  assert.equal(rolling.allowedActions.includes("confirm_rest_start"), false);
  assert.equal(rolling.requiredAction, null);
  const rollingHud = focusHudPresentation(rolling, "online");
  assert.equal(rollingHud.showBanner, false);
  assert.deepEqual(rollingHud.actions, []);
  assert.equal(rollingHud.webAuthnOnRender, false);
  assert.equal(rollingHud.vibrate, false);
  assert.equal(rollingHud.modal, false);
  assert.equal(rollingHud.mapVisible, true);
  assert.equal(rollingHud.sessionRevoked, false);

  const stopped = state({});
  assert.equal(stopped.cabState, "stopped_short");
  assert.equal(stopped.headline, "STATIONARY");
  assert.equal(stopped.requiredAction, null);
  assert.equal(focusHudPresentation(stopped, "online").showBanner, false);

  const dwell = state({
    pings: [
      { ...here, recordedAt: new Date(now.getTime() - DWELL_MS - M) },
      { ...here, recordedAt: new Date(now.getTime() - 30 * 1000) },
    ],
  });
  assert.equal(dwell.cabState, "stopped_dwell");
  assert.equal(dwell.headline, "STATIONARY / DWELL");
  assert.ok(dwell.dwellMs >= DWELL_MS);

  const stale = state({ pings: [{ ...here, recordedAt: new Date(now.getTime() - 10 * M) }] });
  assert.equal(stale.cabState, "telemetry_stale");
  assert.equal(stale.headline, "TELEMETRY STALE");
  assert.equal(stale.telemetryFresh, false);
  assert.equal(stale.allowedActions.includes("confirm_rest_end"), false);
  assert.equal(stale.allowedActions.includes("confirm_rest_start"), false);
  assert.equal(focusHudPresentation(stale, "online").markStale, true);

  const freshNow = state({ at: new Date(now.getTime()), pings: [{ ...here, recordedAt: new Date(now.getTime() - M) }] });
  const staleNow = state({ at: new Date(now.getTime() + 10 * M), pings: [{ ...here, recordedAt: now }] });
  assert.equal(freshNow.telemetryFresh, true);
  assert.equal(staleNow.telemetryFresh, false);

  const sneaky = {
    now,
    driverId: "driver-1",
    load,
    duty: [{ status: "driving" as const, at: new Date(now.getTime() - M) }],
    pings: [{ ...here, recordedAt: new Date(now.getTime() - 30 * 1000) }],
    breakOwed: true,
  };
  const notOwed = deriveFocusState(sneaky);
  assert.equal(notOwed.rest.breakRequired, false);
  assert.equal(notOwed.hos.breakOwed, false);

  const owed = state({
    duty: [{ status: "driving", at: new Date(now.getTime() - DRIVING_LIMIT_MS - M) }],
  });
  assert.equal(owed.cabState, "stopped_break_required");
  assert.equal(owed.headline, "AUTHENTICATION REQUIRED");
  assert.equal(owed.requiredAction, "confirm_rest_start");
  assert.equal(owed.allowedActions.includes("resume_driving"), false);
  assert.equal(focusHudPresentation(owed, "online").showBanner, true);
  assert.equal(focusHudPresentation(owed, "offline").showBanner, false);
  assert.deepEqual(focusHudPresentation(owed, "offline").actions, []);

  const rested = state({
    duty: [
      { status: "driving", at: new Date(now.getTime() - 9 * H) },
      { status: "off_duty", at: new Date(now.getTime() - 35 * M) },
    ],
  });
  assert.equal(rested.hos.breakOwed, false);
  assert.equal(rested.rest.drivingRemainingMs, DRIVING_LIMIT_MS);
  assert.equal(rested.rest.restInProgress, true);
  assert.equal(rested.allowedActions.includes("resume_driving"), true);
  const reset = acceptServerFocus(rested);
  assert.equal(reset.rest.drivingRemainingMs, DRIVING_LIMIT_MS);
  assert.notEqual(reset.rest.drivingRemainingMs, 0);

  assert.equal(shouldRecordGpsDriving("driving", true), false);
  assert.equal(shouldRecordGpsDriving("on_duty", true), true);
  assert.equal(shouldRecordGpsDriving("on_duty", false), false);

  const baseCeremony = {
    userId: "driver-1",
    driverId: "driver-1",
    orgId: "org-1",
    loadId: load.id,
    action: "confirm_rest_start" as const,
    stateVersion: owed.stateVersion,
    expiresAt: new Date(now.getTime() + 5 * M),
    usedAt: null,
  };
  assert.equal(assessCeremony({ ceremony: baseCeremony, actorId: "driver-1", orgId: "org-1", now, current: owed }).ok, true);
  assert.equal(
    assessCeremony({ ceremony: { ...baseCeremony, usedAt: now }, actorId: "driver-1", orgId: "org-1", now, current: owed }).ok,
    false,
  );
  assert.equal(
    (assessCeremony({ ceremony: { ...baseCeremony, usedAt: now }, actorId: "driver-1", orgId: "org-1", now, current: owed }) as { reason: string }).reason,
    "replayed",
  );
  assert.equal(claimCeremony({ usedAt: now, expiresAt: baseCeremony.expiresAt }, now), "replayed");
  assert.equal(claimCeremony({ usedAt: null, expiresAt: new Date(now.getTime() - 1000) }, now), "expired");
  assert.equal(
    (assessCeremony({ ceremony: { ...baseCeremony, expiresAt: new Date(now.getTime() - 1000) }, actorId: "driver-1", orgId: "org-1", now, current: owed }) as { reason: string }).reason,
    "expired",
  );
  assert.equal(
    (assessCeremony({ ceremony: { ...baseCeremony, driverId: "driver-2" }, actorId: "driver-1", orgId: "org-1", now, current: owed }) as { reason: string }).reason,
    "other_driver",
  );
  assert.equal(
    (assessCeremony({ ceremony: { ...baseCeremony, loadId: "load-2" }, actorId: "driver-1", orgId: "org-1", now, current: owed }) as { reason: string }).reason,
    "other_load",
  );
  assert.equal(
    (assessCeremony({ ceremony: { ...baseCeremony, stateVersion: rolling.stateVersion }, actorId: "driver-1", orgId: "org-1", now, current: owed }) as { reason: string }).reason,
    "state_changed",
  );
  assert.equal(
    (assessCeremony({ ceremony: { ...baseCeremony, action: "resume_driving" }, actorId: "driver-1", orgId: "org-1", now, current: owed }) as { reason: string }).reason,
    "not_allowed",
  );
  assert.equal(actionFromCeremony({ action: "confirm_rest_start" }, { action: "resume_driving" }), "confirm_rest_start");

  const cancelled = focusActionError(Object.assign(new Error("The operation was cancelled."), { name: "NotAllowedError" }));
  assert.equal(cancelled.kind, "cancelled");
  assert.match(cancelled.message, /still signed in/);
  assert.doesNotMatch(cancelled.message, /session expired/i);

  const first = {
    driverId: "driver-1",
    seq: 1,
    kind: "status",
    status: "driving" as const,
    at: now,
    lat: null,
    lng: null,
    loadId: load.id,
    note: null,
    source: "step-up",
    refId: null,
    actorId: "driver-1",
    prevHash: GENESIS_HASH,
  };
  const firstHash = dutyHash(first);
  const second = { ...first, seq: 2, status: "off_duty" as const, prevHash: firstHash };
  const secondHash = dutyHash(second);
  assert.notEqual(firstHash, secondHash);
  assert.equal(second.prevHash, firstHash);
  assert.equal(dutyHash(second), secondHash);
  assert.notEqual(dutyHash({ ...second, at: new Date(now.getTime() - H) }), secondHash);

  assert.equal("session" in owed, false);
  assert.equal(formatReeferTemp("4 C"), "4°C");
  assert.equal(formatReeferTemp(null), "—");
  const eta = formatHudEta("2026-09-26T22:30:00.000Z");
  assert.equal(eta.includes("2026"), false);
  assert.equal(eta.includes("00"), false);
  assert.match(eta, /6:30|18:30/);
  const corridor = plannedRoute("Brampton cross-dock", "North York fresh market");
  assert.ok(corridor.length > 2);
  assert.ok(corridor[0].lng < -79.7);
  assert.ok(corridor[corridor.length - 1].lng > -79.5);
  assert.equal(focusCabLine({ cabState: "moving", dwellMs: 0 }), "ROLLING");
  assert.match(focusCabLine({ cabState: "stopped_dwell", dwellMs: 5 * 60 * 1000 }), /STATIONARY · DWELL 5m/);
  console.log("focus checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
