import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { BreakRequired, driverHos, setDutyStatus } from "@/lib/duty";
import { DRIVER_STATUS, MANAGERS } from "@/lib/policy";
import {
  badRequest,
  forbidden,
  json,
  notFound,
  unauthorized,
} from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

const DRIVER_FORBIDDEN = new Set([
  "destination",
  "carrierName",
  "carrier",
  "sealNumber",
  "seal",
]);

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, ["driver"])) {
    return forbidden("Only a driver can post load status events.");
  }

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  for (const key of Object.keys(body)) {
    if (DRIVER_FORBIDDEN.has(key)) {
      return forbidden(`Drivers cannot set ${key}.`);
    }
  }

  const eventType = body.eventType;
  if (typeof eventType !== "string" || !DRIVER_STATUS.has(eventType)) {
    return badRequest(
      "eventType must be one of loaded, rolling, fifteen_min, arrived, delayed.",
    );
  }

  const load = await prisma.load.findFirst({
    where: { id, orgId: user.orgId },
  });
  if (!load) return notFound();

  const rawNote = typeof body.rawNote === "string" ? body.rawNote.slice(0, 500) : null;
  const lastKnown =
    typeof body.lastKnown === "string" ? body.lastKnown.slice(0, 200) : load.lastKnown;

  // "Rolling" means the driver is driving: refuse it while a break is owed, before anything changes.
  if (eventType === "rolling") {
    const hos = await driverHos(user.id);
    if (hos.breakOwed && hos.status !== "driving") {
      const blocked = new BreakRequired(hos);
      return json({ error: blocked.message, hos }, 409);
    }
  }

  // An unassigned load can be claimed by the first driver to post, unless a facility is holding it:
  // then only a custody transfer can hand it to a driver.
  const owned = {
    id: load.id,
    orgId: user.orgId,
    OR: [{ driverUserId: null, facility: null }, { driverUserId: user.id }],
  };
  const data = { currentStatus: eventType, lastKnown, driverUserId: user.id };

  // Only the request that actually moves the load into fifteen_min alerts staff.
  // The status predicate makes this atomic, so retries and overlapping posts
  // for a load already fifteen minutes out don't fan out duplicate alerts.
  const reachedFifteen =
    eventType === "fifteen_min" &&
    (
      await prisma.load.updateMany({
        where: { ...owned, currentStatus: { not: "fifteen_min" } },
        data,
      })
    ).count === 1;

  const minutesEarly =
    eventType === "arrived" && load.eta
      ? Math.floor((load.eta.getTime() - Date.now()) / 60000)
      : 0;
  const arrivedEarly =
    minutesEarly >= 15 &&
    (
      await prisma.load.updateMany({
        where: { ...owned, currentStatus: { not: "arrived" } },
        data,
      })
    ).count === 1;

  const claimed = await prisma.load.updateMany({ where: owned, data });
  if (claimed.count !== 1) {
    return forbidden("This load is assigned to another driver.");
  }

  if (eventType === "rolling" || eventType === "arrived") {
    try {
      const hos = await driverHos(user.id);
      const next = eventType === "rolling" ? "driving" : "on_duty";
      if (eventType === "rolling" || hos.status === "driving") {
        await setDutyStatus({
          orgId: user.orgId,
          driverId: user.id,
          actorId: user.id,
          kind: "status",
          status: next,
          source: "status",
          loadId: load.id,
          lat: load.lat,
          lng: load.lng,
        });
      }
    } catch (error) {
      if (!(error instanceof BreakRequired)) throw error;
    }
  }

  const event = await prisma.trackingEvent.create({
    data: {
      orgId: user.orgId,
      loadId: load.id,
      eventType,
      rawNote,
      actorId: user.id,
    },
  });

  if (reachedFifteen) {
    const staff = await prisma.user.findMany({
      where: {
        orgId: user.orgId,
        role: { in: [...MANAGERS, "receiver"] },
      },
      select: { id: true, email: true, role: true },
    });
    if (staff.length) {
      await prisma.notification.createMany({
        data: staff.map((person) => ({
          orgId: user.orgId,
          userId: person.id,
          role: person.role,
          kind: "load_fifteen_min",
          title: `Load ${load.loadRef} — 15 minutes out`,
          body: `${user.name} is about 15 minutes from ${load.destination}${load.scheduledDock ? ` · ${load.scheduledDock}` : ""}.`,
          href: person.role === "receiver" ? "/receiver" : "/manager",
          emailTo: person.email,
          emailStatus: "in-app",
        })),
      });
    }
  }

  if (arrivedEarly) {
    const earlyBy =
      minutesEarly >= 60
        ? `${Math.floor(minutesEarly / 60)}h ${minutesEarly % 60}m early`
        : `${minutesEarly}m early`;
    const staff = await prisma.user.findMany({
      where: {
        orgId: user.orgId,
        role: { in: [...MANAGERS, "receiver"] },
      },
      select: { id: true, email: true, role: true },
    });
    if (staff.length) {
      await prisma.notification.createMany({
        data: staff.map((person) => ({
          orgId: user.orgId,
          userId: person.id,
          role: person.role,
          kind: "load_arrived_early",
          title: `Load ${load.loadRef} — arrived early`,
          body: `${user.name} arrived at ${load.destination} ${earlyBy}${load.scheduledDock ? ` · ${load.scheduledDock}` : ""}.`,
          href: person.role === "receiver" ? "/receiver" : "/manager",
          emailTo: person.email,
          emailStatus: "in-app",
        })),
      });
    }
  }

  return json({
    event: {
      id: event.id,
      eventType: event.eventType,
      createdAt: event.createdAt,
    },
    load: {
      id: load.id,
      currentStatus: eventType,
      lastKnown,
    },
  });
}
