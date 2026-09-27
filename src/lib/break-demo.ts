import { prisma } from "@/lib/db";
import { dutyHash, GENESIS_HASH, setDutyStatus } from "@/lib/duty";
import { DRIVING_LIMIT_MS } from "@/lib/hos";
import { BRAMPTON_TO_NORTH_YORK } from "@/lib/tracking";

/** Temporary. Rewrites this driver's clock so the existing break rules show the requested time left. */
export async function restartBreakDemo(orgId: string, driverId: string, loadId: string, remainingMs: number) {
  const load = await prisma.load.findFirst({ where: { id: loadId, orgId } });
  if (!load) throw new Error("Load not found.");
  if (load.driverUserId !== driverId && load.coDriverUserId !== driverId) {
    throw new Error("That load is not assigned to this driver.");
  }

  const now = new Date();
  const remaining = Math.min(Math.max(remainingMs, 0), DRIVING_LIMIT_MS);
  const parked = BRAMPTON_TO_NORTH_YORK[0];
  const drivingAt = new Date(now.getTime() - (DRIVING_LIMIT_MS - remaining));
  const restedAt = new Date(drivingAt.getTime() - 2 * 60 * 60 * 1000);
  const dwellAt = new Date(now.getTime() - 6 * 60 * 1000);

  await prisma.dutyEntry.deleteMany({ where: { driverId } });
  const rested = {
    orgId,
    driverId,
    seq: 1,
    kind: "status" as const,
    status: "off_duty" as const,
    at: restedAt,
    lat: parked.lat,
    lng: parked.lng,
    loadId,
    note: "break-demo",
    source: "sim",
    refId: null,
    actorId: driverId,
    prevHash: GENESIS_HASH,
  };
  const restedHash = dutyHash(rested);
  await prisma.dutyEntry.create({ data: { ...rested, hash: restedHash } });
  const driving = { ...rested, seq: 2, status: "driving" as const, at: drivingAt, prevHash: restedHash };
  await prisma.dutyEntry.create({ data: { ...driving, hash: dutyHash(driving) } });

  await prisma.positionPing.deleteMany({ where: { loadId } });
  await prisma.positionPing.createMany({
    data: [dwellAt, now].map((recordedAt) => ({
      orgId,
      loadId,
      driverId,
      lat: parked.lat,
      lng: parked.lng,
      recordedAt,
    })),
  });
  await prisma.load.update({
    where: { id: loadId },
    data: {
      lat: parked.lat,
      lng: parked.lng,
      positionAt: now,
      currentStatus: "rolling",
      lastKnown: "Parked at Brampton cross-dock",
    },
  });
}

/** Records the rest on the duty log. Does not touch the session. */
export async function confirmBreakRest(orgId: string, driverId: string, loadId: string) {
  const load = await prisma.load.findFirst({ where: { id: loadId, orgId } });
  if (!load) throw new Error("Load not found.");
  if (load.driverUserId !== driverId && load.coDriverUserId !== driverId) {
    throw new Error("That load is not assigned to this driver.");
  }
  await setDutyStatus({
    orgId,
    driverId,
    actorId: driverId,
    kind: "status",
    status: "off_duty",
    source: "sim",
    loadId,
    lat: load.lat,
    lng: load.lng,
    note: "break-demo",
  });
}
