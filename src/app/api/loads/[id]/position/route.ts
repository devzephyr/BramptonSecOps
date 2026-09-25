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

  const load = await prisma.load.findFirst({
    where: { id, orgId: user.orgId },
  });
  if (!load) return notFound();
  if (user.role === "driver" && load.driverUserId && load.driverUserId !== user.id) {
    return forbidden("This load is assigned to another driver.");
  }

  const updated = await prisma.load.update({
    where: { id: load.id },
    data: {
      lat,
      lng,
      positionAt: new Date(),
      driverUserId: load.driverUserId ?? (user.role === "driver" ? user.id : null),
    },
  });
  return json({
    id: updated.id,
    lat: updated.lat,
    lng: updated.lng,
    positionAt: updated.positionAt,
  });
}
