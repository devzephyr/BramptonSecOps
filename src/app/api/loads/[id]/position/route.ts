import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { alertIfOverLimit, driverHos, setDutyStatus } from "@/lib/duty";
import { badRequest, forbidden, json, notFound, unauthorized } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

/** Keep at most one trail point per load in this window; Load.lat/lng still takes every fix. */
const TRAIL_EVERY_MS = 10_000;
/** Moving faster than this between two recent fixes counts as driving (the ELD rule of thumb, 8 km/h). */
const DRIVING_SPEED_MPS = 8000 / 3600;
/** Speed is measured against a trail point at least this old, so 3 s fixes still add up to real distance. */
const SPEED_BASELINE_MS = 20_000;
const SPEED_WINDOW_MS = 5 * 60 * 1000;
/** GPS fixes wander tens of metres while parked; ignore movement shorter than this. */
const MIN_MOVE_M = 100;

function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, ["driver", "manager", "admin"])) {
    return forbidden("Only drivers and managers can post positions.");
  }
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }
  const { lat, lng } = body;
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return badRequest("lat and lng must be valid coordinates.");
  }

  const exists = await prisma.load.count({ where: { id, orgId: user.orgId } });
  if (!exists) return notFound();

  const now = new Date();
  const baseline = await prisma.positionPing.findFirst({
    where: {
      loadId: id,
      recordedAt: { lte: new Date(now.getTime() - SPEED_BASELINE_MS), gte: new Date(now.getTime() - SPEED_WINDOW_MS) },
    },
    orderBy: { recordedAt: "desc" },
    select: { lat: true, lng: true, recordedAt: true },
  });
  const driverScope =
    user.role === "driver"
      ? { OR: [{ driverUserId: null, facility: null }, { driverUserId: user.id }] }
      : {};
  const moved = await prisma.load.updateMany({
    where: { id, orgId: user.orgId, ...driverScope },
    data: {
      lat,
      lng,
      positionAt: now,
      ...(user.role === "driver" ? { driverUserId: user.id } : {}),
    },
  });
  if (moved.count !== 1) return forbidden("This load is assigned to another driver.");

  const lastPing = await prisma.positionPing.findFirst({
    where: { loadId: id },
    orderBy: { recordedAt: "desc" },
    select: { recordedAt: true },
  });
  if (!lastPing || now.getTime() - lastPing.recordedAt.getTime() >= TRAIL_EVERY_MS) {
    await prisma.positionPing.create({
      data: { orgId: user.orgId, loadId: id, driverId: user.role === "driver" ? user.id : null, lat, lng, recordedAt: now },
    });
  }

  if (user.role === "driver") {
    const hos = await driverHos(user.id, now);
    const elapsed = baseline ? now.getTime() - baseline.recordedAt.getTime() : 0;
    const distance = baseline ? metersBetween(baseline, { lat, lng }) : 0;
    const driving = elapsed > 0 && distance >= MIN_MOVE_M && distance / (elapsed / 1000) >= DRIVING_SPEED_MPS;
    if (hos.status !== "driving" && driving) {
      // The truck is moving: the log records driving whether or not the driver tapped it.
      await setDutyStatus({
        orgId: user.orgId,
        driverId: user.id,
        actorId: user.id,
        kind: "status",
        status: "driving",
        source: "gps",
        loadId: id,
        lat,
        lng,
      });
    } else {
      await alertIfOverLimit(user.orgId, user.id, hos);
    }
  }

  return json({ id, lat, lng, positionAt: now });
}
