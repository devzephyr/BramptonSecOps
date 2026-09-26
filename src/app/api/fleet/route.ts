import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { MANAGERS } from "@/lib/policy";
import { driverHos } from "@/lib/duty";
import { forbidden, json, unauthorized } from "@/lib/http";

/** Every driver in the org with their duty clock, loads, and last position, plus loads sitting at facilities. */
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, MANAGERS)) return forbidden("Only managers can see the fleet.");

  const now = new Date();
  const [drivers, loads] = await Promise.all([
    prisma.user.findMany({
      where: { orgId: user.orgId, role: "driver" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, title: true, photoHash: true },
    }),
    prisma.load.findMany({
      where: {
        orgId: user.orgId,
        OR: [{ driverUserId: { not: null } }, { coDriverUserId: { not: null } }, { facility: { not: null } }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        loadRef: true,
        commodity: true,
        origin: true,
        destination: true,
        currentStatus: true,
        driverUserId: true,
        coDriverUserId: true,
        facility: true,
        lat: true,
        lng: true,
        positionAt: true,
      },
    }),
  ]);
  const clocks = await Promise.all(drivers.map((driver) => driverHos(driver.id, now)));

  return json({
    now,
    drivers: drivers.map((driver, index) => ({
      id: driver.id,
      name: driver.name,
      title: driver.title,
      photoVersion: driver.photoHash ? driver.photoHash.slice(0, 12) : null,
      hos: clocks[index],
      loads: loads
        .filter((load) => load.driverUserId === driver.id || load.coDriverUserId === driver.id)
        .sort((a, b) => Number(a.currentStatus === "arrived") - Number(b.currentStatus === "arrived")),
    })),
    atFacilities: loads.filter((load) => !load.driverUserId && load.facility),
  });
}
