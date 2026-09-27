import { randomBytes } from "node:crypto";
import { generateAuthenticationOptions, verifyAuthenticationResponse, type AuthenticationResponseJSON, type AuthenticatorTransport } from "@simplewebauthn/server";
import type { DutyStatusName } from "@/lib/hos";
import { isDutyStatus } from "@/lib/hos";
import { prisma } from "@/lib/db";
import { appendDuty, BreakRequired, recentStatusEntries, setDutyStatus } from "@/lib/duty";
import {
  assessCeremony,
  claimCeremony,
  deriveFocusState,
  dutyStatusForAction,
  isFocusAction,
  type CeremonyView,
  type FocusAction,
  type FocusState,
} from "@/lib/focus-model";
import { expectedOrigin, rpID } from "@/lib/webauthn";

/**
 * PendingCeremony cannot hold a driver step-up: caseId is a required foreign key to VerifyCase.
 * Stuffing a duty action into a verify case would mix two ledgers. The binding lives on the
 * existing WebAuthnChallenge row, in `kind`, and the row id is the ceremony id.
 */
const KIND_PREFIX = "focus-step-up:";

type Binding = {
  v: 1;
  action: FocusAction;
  loadId: string;
  driverId: string;
  orgId: string;
  nonce: string;
  stateVersion: string;
  targetStatus: DutyStatusName | null;
  reason: string | null;
  facility: string | null;
  sealNumber: string | null;
};

export class FocusRefusal extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>,
  ) {
    super(typeof body.error === "string" ? body.error : "Focus action refused.");
  }
}

function bindingKind(binding: Binding) {
  return `${KIND_PREFIX}${JSON.stringify(binding)}`;
}

function readBinding(kind: string): Binding | null {
  if (!kind.startsWith(KIND_PREFIX)) return null;
  try {
    const parsed = JSON.parse(kind.slice(KIND_PREFIX.length)) as Binding;
    if (parsed.v !== 1 || !isFocusAction(parsed.action)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getDriverFocusState(input: { orgId: string; driverId: string; loadId: string; now?: Date }): Promise<FocusState> {
  const now = input.now ?? new Date();
  const load = await prisma.load.findFirst({ where: { id: input.loadId, orgId: input.orgId } });
  if (!load) throw new FocusRefusal(404, { error: "Load not found." });
  if (load.driverUserId !== input.driverId && load.coDriverUserId !== input.driverId) {
    throw new FocusRefusal(403, { error: "That load is not assigned to this driver." });
  }
  const [entries, pings] = await Promise.all([
    recentStatusEntries(input.driverId, now),
    prisma.positionPing.findMany({
      where: { loadId: load.id, recordedAt: { gte: new Date(now.getTime() - 10 * 60 * 1000), lte: now } },
      orderBy: { recordedAt: "asc" },
      take: 60,
      select: { lat: true, lng: true, recordedAt: true },
    }),
  ]);
  const samples = [...pings];
  if (load.lat != null && load.lng != null && load.positionAt && load.positionAt.getTime() <= now.getTime()) {
    samples.push({ lat: load.lat, lng: load.lng, recordedAt: load.positionAt });
  }
  return deriveFocusState({
    now,
    driverId: input.driverId,
    load: {
      id: load.id,
      loadRef: load.loadRef,
      origin: load.origin,
      destination: load.destination,
      dock: load.scheduledDock,
      setpoint: load.reeferSetpoint,
      eta: load.eta ? load.eta.toISOString() : null,
      status: load.currentStatus,
      commodity: load.commodity,
    },
    duty: entries.flatMap((entry) => (entry.status ? [{ status: entry.status, at: entry.at }] : [])),
    pings: samples,
  });
}

export async function issueFocusChallenge(input: {
  orgId: string;
  actorId: string;
  driverId: string;
  loadId: string;
  action: FocusAction;
  targetStatus?: unknown;
  reason?: unknown;
  facility?: unknown;
  sealNumber?: unknown;
}) {
  if (input.actorId !== input.driverId) {
    throw new FocusRefusal(403, { error: "Only that driver can authenticate a duty action." });
  }
  const state = await getDriverFocusState(input);
  if (!state.allowedActions.includes(input.action)) {
    throw new FocusRefusal(409, {
      error: "That action is not available in the current cab state. Your sign-in is still active.",
      code: "step_up_required",
      action: state.requiredAction,
      cabState: state.cabState,
      focusState: state,
    });
  }
  const targetStatus = isDutyStatus(input.targetStatus) ? input.targetStatus : null;
  const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 200) : "";
  const facility = typeof input.facility === "string" ? input.facility.trim().slice(0, 120) : "";
  const sealNumber = typeof input.sealNumber === "string" ? input.sealNumber.trim().slice(0, 40) : "";
  if (input.action === "correct_duty_status") {
    if (!targetStatus) throw new FocusRefusal(400, { error: "targetStatus is required for a duty correction." });
    if (reason.length < 3) throw new FocusRefusal(400, { error: "A short reason is required for a duty correction." });
  }
  if (input.action === "record_facility_drop" && !facility) {
    throw new FocusRefusal(400, { error: "facility is required to drop the load." });
  }
  const credentials = await prisma.webAuthnCredential.findMany({ where: { userId: input.actorId } });
  if (!credentials.length) throw new FocusRefusal(400, { error: "Register a passkey before recording a duty action." });
  const binding: Binding = {
    v: 1,
    action: input.action,
    loadId: input.loadId,
    driverId: input.driverId,
    orgId: input.orgId,
    nonce: randomBytes(16).toString("base64url"),
    stateVersion: state.stateVersion,
    targetStatus,
    reason: reason || null,
    facility: facility || null,
    sealNumber: sealNumber || null,
  };
  const options = await generateAuthenticationOptions({
    rpID: rpID(),
    userVerification: "required",
    allowCredentials: credentials.map((row) => ({
      id: row.credentialId,
      transports: row.transports ? (row.transports.split(",") as AuthenticatorTransport[]) : undefined,
    })),
  });
  const row = await prisma.webAuthnChallenge.create({
    data: {
      userId: input.actorId,
      kind: bindingKind(binding),
      challenge: options.challenge,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });
  return { ceremonyId: row.id, optionsJSON: options, focusState: state };
}

function ceremonyView(binding: Binding, row: { userId: string | null; expiresAt: Date; usedAt: Date | null }): CeremonyView {
  return {
    userId: row.userId ?? "",
    driverId: binding.driverId,
    orgId: binding.orgId,
    loadId: binding.loadId,
    action: binding.action,
    stateVersion: binding.stateVersion,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
  };
}

async function dropAtFacility(input: { orgId: string; actorId: string; loadId: string; facility: string; sealNumber: string | null }) {
  const outcome = await prisma.$transaction(async (tx) => {
    const load = await tx.load.findFirst({ where: { id: input.loadId, orgId: input.orgId } });
    if (!load) return "missing" as const;
    if (load.driverUserId !== input.actorId && load.coDriverUserId !== input.actorId) return "owner" as const;
    if (input.sealNumber && load.sealNumber && input.sealNumber !== load.sealNumber) return "seal" as const;
    await tx.custodyTransfer.create({
      data: {
        orgId: input.orgId,
        loadId: load.id,
        fromUserId: load.driverUserId,
        toFacility: input.facility,
        sealNumber: input.sealNumber,
        sealIntact: input.sealNumber ? true : null,
        lat: load.lat,
        lng: load.lng,
        note: "Recorded from Focus after step-up.",
        actorId: input.actorId,
      },
    });
    await tx.load.update({
      where: { id: load.id },
      data: { driverUserId: null, coDriverUserId: null, facility: input.facility },
    });
    await tx.trackingEvent.create({
      data: {
        orgId: input.orgId,
        loadId: load.id,
        eventType: "custody",
        rawNote: `Focus drop at ${input.facility}`,
        actorId: input.actorId,
      },
    });
    return "ok" as const;
  });
  if (outcome === "missing") throw new FocusRefusal(404, { error: "Load not found." });
  if (outcome === "owner") throw new FocusRefusal(403, { error: "That load is no longer assigned to you." });
  if (outcome === "seal") throw new FocusRefusal(409, { error: "The seal does not match the load. The drop was not recorded." });
}

async function applyBoundAction(binding: Binding, actorId: string) {
  const status = dutyStatusForAction(binding.action, binding.targetStatus);
  if (status) {
    try {
      await setDutyStatus({
        orgId: binding.orgId,
        driverId: binding.driverId,
        actorId,
        kind: "status",
        status,
        source: "step-up",
        loadId: binding.loadId,
        note: binding.reason,
      });
    } catch (error) {
      if (error instanceof BreakRequired) {
        throw new FocusRefusal(409, {
          error: error.message,
          code: "step_up_required",
          action: "confirm_rest_start",
        });
      }
      throw error;
    }
  }
  if (binding.action === "correct_duty_status" && binding.reason) {
    await appendDuty({
      orgId: binding.orgId,
      driverId: binding.driverId,
      actorId,
      kind: "note",
      source: "step-up",
      loadId: binding.loadId,
      note: binding.reason,
    });
  }
  if (binding.action === "record_facility_drop") {
    await dropAtFacility({
      orgId: binding.orgId,
      actorId,
      loadId: binding.loadId,
      facility: binding.facility ?? "",
      sealNumber: binding.sealNumber,
    });
  }
}

export async function verifyFocusChallenge(input: { orgId: string; actorId: string; driverId: string; ceremonyId: string; response: unknown }) {
  if (input.actorId !== input.driverId) {
    throw new FocusRefusal(403, { error: "Only that driver can authenticate a duty action." });
  }
  const row = await prisma.webAuthnChallenge.findUnique({ where: { id: input.ceremonyId } });
  const binding = row ? readBinding(row.kind) : null;
  if (!row || !binding) throw new FocusRefusal(400, { error: "That authentication challenge was not found." });
  const now = new Date();
  const claim = claimCeremony(row, now);
  if (claim !== "ok") {
    throw new FocusRefusal(400, { error: claim === "replayed" ? "That authentication was already used." : "That authentication expired." });
  }
  const burned = await prisma.webAuthnChallenge.updateMany({
    where: { id: row.id, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (burned.count !== 1) throw new FocusRefusal(400, { error: "That authentication was already used." });

  const body = input.response as AuthenticationResponseJSON;
  const stored = await prisma.webAuthnCredential.findUnique({ where: { credentialId: body.id }, include: { user: true } });
  if (!stored || stored.userId !== input.actorId) {
    throw new FocusRefusal(400, { error: "That passkey belongs to a different account." });
  }
  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge: row.challenge,
    expectedOrigin: expectedOrigin(),
    expectedRPID: rpID(),
    credential: {
      id: stored.credentialId,
      publicKey: new Uint8Array(Buffer.from(stored.publicKey, "base64")),
      counter: stored.counter,
      transports: stored.transports ? (stored.transports.split(",") as AuthenticatorTransport[]) : undefined,
    },
    requireUserVerification: true,
  });
  if (!verification.verified || !verification.authenticationInfo?.userVerified) {
    throw new FocusRefusal(400, { error: "User verification is required. The duty action was not recorded." });
  }
  await prisma.webAuthnCredential.update({
    where: { id: stored.id },
    data: { counter: verification.authenticationInfo.newCounter },
  });

  const current = await getDriverFocusState({ orgId: input.orgId, driverId: binding.driverId, loadId: binding.loadId, now });
  const decision = assessCeremony({
    ceremony: ceremonyView(binding, { ...row, usedAt: null }),
    actorId: input.actorId,
    orgId: input.orgId,
    now,
    current,
  });
  if (!decision.ok) {
    throw new FocusRefusal(409, {
      error: "The cab changed before the action was recorded. Your sign-in is still active.",
      code: "step_up_required",
      reason: decision.reason,
      focusState: current,
    });
  }
  await applyBoundAction(binding, input.actorId);
  return getDriverFocusState({ orgId: input.orgId, driverId: binding.driverId, loadId: binding.loadId });
}
