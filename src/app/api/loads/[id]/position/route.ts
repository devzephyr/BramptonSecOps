import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { MANAGERS } from "@/lib/policy";
import { alertIfOverLimit, driverHos, setDutyStatus } from "@/lib/duty";
import { FocusRefusal, getDriverFocusState } from "@/lib/focus";
import { metersBetween, movementSample, shouldRecordGpsDriving } from "@/lib/focus-model";
import { badRequest, forbidden, json, notFound, unauthorized } from "@/lib/http";
import { claimIfUnassigned, driverMayAct } from "@/lib/loads";

type Params = { params: Promise<{ id: string }> };

/** Keep at most one trail point per load in this window; Load.lat/lng still takes every fix. */
const TRAIL_EVERY_MS = 10_000;
/** Speed is measured against a trail point at least this old, so 3 s fixes still add up to real distance. */
const SPEED_BASELINE_MS = 20_000;
const SPEED_WINDOW_MS = 5 * 60 * 1000;

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, ["driver", ...MANAGERS])) {
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
  const driverScope = user.role === "driver" ? driverMayAct(user.id) : {};
  const moved = await prisma.load.updateMany({
    where: { id, orgId: user.orgId, ...driverScope },
    data: {
      lat,
      lng,
      positionAt: now,
    },
  });
  if (moved.count !== 1) return forbidden("This load is assigned to another driver.");
  if (user.role === "driver") await claimIfUnassigned(id, user.id);

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
    const driving = movementSample({ elapsedMs: elapsed, distanceM: distance }).moving;
    if (shouldRecordGpsDriving(hos.status, driving)) {
      // The truck is moving: the log records driving whether or not the driver tapped it.
      await setDutyStatus({
        orgId: user.orgId,
        driverId: user.id,
        actorId: user.id,
        kind: "status",
        status: "driving",
        source: body.simulated === true ? "sim" : "gps",
        loadId: id,
        lat,
        lng,
      });
    } else {
      await alertIfOverLimit(user.orgId, user.id, hos);
    }
  }

  let focusState = null;
  if (user.role === "driver") {
    try {
      focusState = await getDriverFocusState({ orgId: user.orgId, driverId: user.id, loadId: id, now });
    } catch (error) {
      if (!(error instanceof FocusRefusal)) throw error;
    }
  }
  return json({ id, lat, lng, positionAt: now, focusState });
}
