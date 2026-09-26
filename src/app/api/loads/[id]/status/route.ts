import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { DRIVER_STATUS } from "@/lib/policy";
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
  if (load.driverUserId && load.driverUserId !== user.id) {
    return forbidden("This load is assigned to another driver.");
  }

  const rawNote = typeof body.rawNote === "string" ? body.rawNote : null;
  const lastKnown =
    typeof body.lastKnown === "string" ? body.lastKnown : load.lastKnown;

  const event = await prisma.trackingEvent.create({
    data: {
      orgId: user.orgId,
      loadId: load.id,
      eventType,
      rawNote,
      actorId: user.id,
    },
  });

  await prisma.load.update({
    where: { id: load.id },
    data: {
      currentStatus: eventType,
      lastKnown,
      driverUserId: load.driverUserId ?? user.id,
    },
  });

  if (eventType === "fifteen_min") {
    const staff = await prisma.user.findMany({
      where: {
        orgId: user.orgId,
        role: { in: ["manager", "admin", "receiver"] },
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
