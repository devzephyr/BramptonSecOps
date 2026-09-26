import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { forbidden, json, unauthorized } from "@/lib/http";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, ["warehouse", "logistics", "admin", "receiver"])) {
    return forbidden("Only warehouse, logistics, or admin can view inventory.");
  }

  const lots = await prisma.inventoryLot.findMany({
    where: { orgId: user.orgId },
    orderBy: [{ location: "asc" }, { sku: "asc" }],
  });

  return json({
    lots: lots.map((lot) => ({
      id: lot.id,
      sku: lot.sku,
      commodity: lot.commodity,
      quantity: lot.quantity,
      unit: lot.unit,
      location: lot.location,
      status: lot.status,
      receivedAt: lot.receivedAt,
      notes: lot.notes,
    })),
  });
}
