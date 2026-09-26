import type { Load } from "@prisma/client";

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
    lat: row.lat,
    lng: row.lng,
    positionAt: row.positionAt,
    facility: row.facility,
    createdAt: row.createdAt,
  };
}
