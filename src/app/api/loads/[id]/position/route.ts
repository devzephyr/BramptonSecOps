import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { badRequest, forbidden, json, notFound, unauthorized } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

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

  const now = new Date();
  const driverScope =
    user.role === "driver"
      ? { OR: [{ driverUserId: null }, { driverUserId: user.id }] }
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
  if (moved.count !== 1) {
    const exists = await prisma.load.count({ where: { id, orgId: user.orgId } });
    return exists ? forbidden("This load is assigned to another driver.") : notFound();
  }
  return json({ id, lat, lng, positionAt: now });
}
