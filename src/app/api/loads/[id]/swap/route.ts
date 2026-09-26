import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { setDutyStatus } from "@/lib/duty";
import { badRequest, forbidden, json, notFound, unauthorized } from "@/lib/http";
import { serializeLoad } from "@/lib/loads";
import { MANAGERS } from "@/lib/policy";

type Params = { params: Promise<{ id: string }> };

/**
 * Team drivers swap seats: the co-driver takes the wheel and the driver who stops is logged
 * into the sleeper berth. Either driver on the load, or logistics, can record it.
 */
export async function POST(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Load" WHERE id = ${id} AND "orgId" = ${user.orgId} FOR UPDATE`;
    if (locked.length !== 1) return notFound();
    const load = await tx.load.findUniqueOrThrow({ where: { id } });
    if (!load.driverUserId || !load.coDriverUserId) return badRequest("This load has only one driver.");
    const onLoad = user.id === load.driverUserId || user.id === load.coDriverUserId;
    if (!onLoad && !hasRole(user, MANAGERS)) return forbidden("Only the drivers on this load or logistics can swap.");

    const [resting, driving] = [load.driverUserId, load.coDriverUserId];
    const updated = await tx.load.update({
      where: { id },
      data: { driverUserId: driving, coDriverUserId: resting },
    });
    const people = await tx.user.findMany({ where: { id: { in: [resting, driving] } }, select: { id: true, name: true } });
    const nameOf = new Map(people.map((person) => [person.id, person.name]));
    await tx.trackingEvent.create({
      data: {
        orgId: user.orgId,
        loadId: id,
        eventType: "swap",
        rawNote: `${nameOf.get(driving) ?? "Co-driver"} took the wheel from ${nameOf.get(resting) ?? "driver"}`,
        actorId: user.id,
      },
    });
    const other = user.id === resting ? driving : resting;
    await tx.notification.create({
      data: {
        orgId: user.orgId,
        userId: other,
        role: "driver",
        kind: "driver_swap",
        title: `Load ${updated.loadRef}: drivers swapped`,
        body: `${nameOf.get(driving) ?? "Your co-driver"} is now at the wheel. Recorded by ${user.name}.`,
        href: "/driver",
        emailStatus: "in-app",
      },
    });
    return { updated, resting };
  });
  if (result instanceof Response) return result;

  // The driver who stops goes to the sleeper berth, so their break starts counting now.
  await setDutyStatus({
    orgId: user.orgId,
    driverId: result.resting,
    actorId: user.id,
    kind: "status",
    status: "sleeper_berth",
    source: "status",
    loadId: id,
    lat: result.updated.lat,
    lng: result.updated.lng,
  });
  return json(serializeLoad(result.updated));
}
