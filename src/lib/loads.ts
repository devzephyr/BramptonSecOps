import type { Load, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isLate } from "@/lib/normalize";
import { MANAGERS } from "@/lib/policy";
import type { PayloadFields } from "@/lib/payload";

/** Once a load leaves "scheduled", these change only through an approved request. */
export const LOCKED_WHEN_MOVING = ["scheduledDock", "destination", "sealNumber"] as const;

/** Request types whose approved fields write onto a Load. */
export const LOAD_AFFECTING_TYPES = new Set([
  "destination_change",
  "bol_pod_alter",
  "new_carrier",
]);

export function isLoadAffectingType(requestType: string): boolean {
  return LOAD_AFFECTING_TYPES.has(requestType);
}

/** Current dock/destination/seal/carrier on a load, for the case on-file baseline. */
export function loadOnFile(load: {
  scheduledDock: string | null;
  approvedDock: string | null;
  destination: string;
  approvedDestination: string | null;
  sealNumber: string | null;
  carrierName: string;
}): PayloadFields {
  const onFile: PayloadFields = {};
  const dock = load.approvedDock || load.scheduledDock;
  if (dock) onFile.dock = dock;
  const destination = load.approvedDestination || load.destination;
  if (destination) onFile.destination = destination;
  if (load.sealNumber) onFile.seal = load.sealNumber;
  if (load.carrierName) onFile.carrier = load.carrierName;
  return onFile;
}

/** Map requested case fields onto Load columns that floor desks read. */
export function loadUpdateFromRequested(requested: PayloadFields): {
  data: Prisma.LoadUpdateInput;
  summary: string[];
} {
  const data: Prisma.LoadUpdateInput = {};
  const summary: string[] = [];
  if (typeof requested.dock === "string" && requested.dock.trim()) {
    const dock = requested.dock.trim();
    data.scheduledDock = dock;
    data.approvedDock = dock;
    summary.push(`Dock ${dock}`);
  }
  if (typeof requested.destination === "string" && requested.destination.trim()) {
    const destination = requested.destination.trim();
    data.destination = destination;
    data.approvedDestination = destination;
    summary.push(destination);
  }
  if (typeof requested.seal === "string" && requested.seal.trim()) {
    const seal = requested.seal.trim();
    data.sealNumber = seal;
    summary.push(`Seal ${seal}`);
  }
  if (typeof requested.carrier === "string" && requested.carrier.trim()) {
    const carrier = requested.carrier.trim();
    data.carrierName = carrier;
    summary.push(carrier);
  }
  return { data, summary };
}

function hrefForRole(role: Role): string {
  if (role === "driver") return "/driver";
  if (role === "receiver") return "/receiver";
  if (role === "warehouse") return "/warehouse";
  return "/logistics";
}

/**
 * After a load-affecting case is fully approved, write requested fields onto the Load
 * and alert drivers, receivers, warehouse, and managers who watch that load.
 */
export async function applyApprovedCaseToLoad(
  tx: Prisma.TransactionClient,
  input: {
    orgId: string;
    loadId: string | null;
    requestType: string;
    requestedJson: unknown;
    payloadHash: string;
    counterparty: string;
    actorId: string;
    actorName: string;
  },
): Promise<void> {
  if (!isLoadAffectingType(input.requestType)) return;
  if (!input.loadId) {
    throw new Error("This request type needs a load before it can be approved.");
  }

  const locked = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Load" WHERE id = ${input.loadId} AND "orgId" = ${input.orgId} FOR UPDATE`;
  if (locked.length !== 1) {
    throw new Error("The load for this request was not found.");
  }

  const load = await tx.load.findUniqueOrThrow({ where: { id: input.loadId } });
  if (load.payloadHashOfLastApprovedChange === input.payloadHash) return;

  const requested = (input.requestedJson ?? {}) as PayloadFields;
  const { data, summary } = loadUpdateFromRequested(requested);
  if (Object.keys(data).length === 0) {
    throw new Error("This approved request has no load fields to apply.");
  }
  data.payloadHashOfLastApprovedChange = input.payloadHash;

  await tx.load.update({ where: { id: load.id }, data });

  const changeText = summary.join(" · ") || input.requestType;
  await tx.trackingEvent.create({
    data: {
      orgId: input.orgId,
      loadId: load.id,
      eventType: "approved_change",
      rawNote: `${changeText} · ${input.counterparty}`,
      actorId: input.actorId,
    },
  });

  const staff = await tx.user.findMany({
    where: {
      orgId: input.orgId,
      role: { in: [...MANAGERS, "receiver", "warehouse", "driver"] },
    },
    select: { id: true, role: true, email: true },
  });
  const driverIds = new Set(
    [load.driverUserId, load.coDriverUserId].filter((id): id is string => Boolean(id)),
  );
  const recipients = staff.filter(
    (person) =>
      person.role === "receiver" ||
      person.role === "warehouse" ||
      MANAGERS.includes(person.role) ||
      (person.role === "driver" && driverIds.has(person.id)),
  );
  if (recipients.length === 0) return;

  await tx.notification.createMany({
    data: recipients.map((person) => ({
      orgId: input.orgId,
      userId: person.id,
      role: person.role,
      kind: "load_change_applied",
      title: `Load ${load.loadRef} — route updated`,
      body: `${input.actorName} approved a change: ${changeText}.`,
      href: hrefForRole(person.role),
      emailTo: person.email,
      emailStatus: "in-app",
    })),
  });
}

export function serializeLoad(row: Load) {
  return {
    id: row.id,
    loadRef: row.loadRef,
    carrierName: row.carrierName,
    plate: row.plate,
    trailer: row.trailer,
    currentStatus: row.currentStatus,
    lastKnown: row.lastKnown,
    reeferSetpoint: row.reeferSetpoint,
    sealNumber: row.sealNumber,
    scheduledDock: row.scheduledDock,
    approvedDock: row.approvedDock,
    approvedDestination: row.approvedDestination,
    origin: row.origin,
    destination: row.destination,
    commodity: row.commodity,
    eta: row.eta,
    driverUserId: row.driverUserId,
    coDriverUserId: row.coDriverUserId,
    lat: row.lat,
    lng: row.lng,
    positionAt: row.positionAt,
    facility: row.facility,
    late: isLate(row.eta, row.currentStatus),
    createdAt: row.createdAt,
  };
}

/** Loads a driver may post status or GPS for: theirs, one they co-drive, or unassigned and not held at a facility. */
export function driverMayAct(userId: string): Prisma.LoadWhereInput {
  return { OR: [{ driverUserId: null, facility: null }, { driverUserId: userId }, { coDriverUserId: userId }] };
}

/** The first driver to post on an unassigned load takes the wheel; a co-driver never displaces the driver. */
export function claimIfUnassigned(loadId: string, userId: string) {
  return prisma.load.updateMany({
    where: {
      id: loadId,
      driverUserId: null,
      facility: null,
      OR: [{ coDriverUserId: null }, { coDriverUserId: { not: userId } }],
    },
    data: { driverUserId: userId },
  });
}
