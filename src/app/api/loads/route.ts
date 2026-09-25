import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { badRequest, forbidden, json, unauthorized } from "@/lib/http";

function serializeLoad(row: Awaited<ReturnType<typeof prisma.load.findFirst>>) {
  if (!row) return null;
  return {
    id: row.id,
    loadRef: row.loadRef,
    carrierName: row.carrierName,
    plate: row.plate,
    trailer: row.trailer,
    currentStatus: row.currentStatus,
    lastKnown: row.lastKnown,
    reeferSetpoint: row.reeferSetpoint,
    sealNumber: row.sealNumber,
    scheduledDock: row.scheduledDock,
    approvedDock: row.approvedDock,
    approvedDestination: row.approvedDestination,
    origin: row.origin,
    destination: row.destination,
    commodity: row.commodity,
    eta: row.eta,
    driverUserId: row.driverUserId,
    lat: row.lat,
    lng: row.lng,
    positionAt: row.positionAt,
    createdAt: row.createdAt,
  };
}

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const loads = await prisma.load.findMany({
    where: { orgId: user.orgId },
    orderBy: { createdAt: "desc" },
  });

  return json({ loads: loads.map((row) => serializeLoad(row)) });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, ["manager", "admin", "supplier"])) {
    return forbidden("You cannot create loads with this role.");
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const required = [
    "loadRef",
    "carrierName",
    "plate",
    "trailer",
    "origin",
    "destination",
    "commodity",
  ] as const;
  for (const key of required) {
    if (typeof body[key] !== "string" || !(body[key] as string).trim()) {
      return badRequest(`${key} is required.`);
    }
  }

  const load = await prisma.load.create({
    data: {
      orgId: user.orgId,
      loadRef: body.loadRef as string,
      carrierName: body.carrierName as string,
      plate: body.plate as string,
      trailer: body.trailer as string,
      origin: body.origin as string,
      destination: body.destination as string,
      commodity: body.commodity as string,
      currentStatus: "scheduled",
      lastKnown: typeof body.lastKnown === "string" ? body.lastKnown : "yard",
      reeferSetpoint:
        typeof body.reeferSetpoint === "string" ? body.reeferSetpoint : null,
      sealNumber: typeof body.sealNumber === "string" ? body.sealNumber : null,
      scheduledDock:
        typeof body.scheduledDock === "string" ? body.scheduledDock : null,
      driverUserId:
        typeof body.driverUserId === "string" ? body.driverUserId : null,
      eta: body.eta ? new Date(String(body.eta)) : null,
    },
  });

  return json(serializeLoad(load), 201);
}
