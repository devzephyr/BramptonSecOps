import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { forbidden, json, unauthorized } from "@/lib/http";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, ["receiver", "manager", "admin"])) {
    return forbidden("Only receiving staff can view incoming loads.");
  }

  const loads = await prisma.load.findMany({
    where: {
      orgId: user.orgId,
      currentStatus: { in: ["rolling", "fifteen_min", "arrived", "loaded"] },
    },
    orderBy: { createdAt: "desc" },
  });

  return json({
    loads: loads.map((row) => ({
      id: row.id,
      loadRef: row.loadRef,
      carrierName: row.carrierName,
      plate: row.plate,
      trailer: row.trailer,
      currentStatus: row.currentStatus,
      lastKnown: row.lastKnown,
      destination: row.destination,
      scheduledDock: row.scheduledDock,
      approvedDock: row.approvedDock,
      eta: row.eta,
      commodity: row.commodity,
    })),
  });
}
