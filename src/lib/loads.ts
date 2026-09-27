import type { Load, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isLate } from "@/lib/normalize";

/** Once a load leaves "scheduled", these change only through an approved request. */
export const LOCKED_WHEN_MOVING = ["scheduledDock", "destination", "sealNumber"] as const;

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
