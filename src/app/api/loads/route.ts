import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { badRequest, forbidden, isUniqueViolation, json, unauthorized } from "@/lib/http";
import { serializeLoad } from "@/lib/loads";

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

  const eta = body.eta ? new Date(String(body.eta)) : null;
  if (eta && Number.isNaN(eta.getTime())) return badRequest("eta must be a valid date.");

  const driverUserId = typeof body.driverUserId === "string" ? body.driverUserId : null;
  if (driverUserId) {
    const driver = await prisma.user.findFirst({
      where: { id: driverUserId, orgId: user.orgId, role: "driver" },
      select: { id: true },
    });
    if (!driver) return badRequest("driverUserId must be a driver in your org.");
  }

  const text = (key: string, max = 120) =>
    typeof body[key] === "string" ? (body[key] as string).trim().slice(0, max) : "";
  const optional = (key: string, max = 120) => text(key, max) || null;

  const load = await prisma.load
    .create({
      data: {
        orgId: user.orgId,
        loadRef: text("loadRef", 40),
        carrierName: text("carrierName"),
        plate: text("plate", 20),
        trailer: text("trailer", 20),
        origin: text("origin"),
        destination: text("destination"),
        commodity: text("commodity", 80),
        currentStatus: "scheduled",
        lastKnown: text("lastKnown", 200) || text("origin"),
        reeferSetpoint: optional("reeferSetpoint", 20),
        sealNumber: optional("sealNumber", 40),
        scheduledDock: optional("scheduledDock", 40),
        driverUserId,
        eta,
      },
    })
    .catch((error: unknown) => {
      if (isUniqueViolation(error)) return null;
      throw error;
    });
  if (!load) return badRequest("That load reference already exists.");

  if (driverUserId) {
    await prisma.notification.create({
      data: {
        orgId: user.orgId,
        userId: driverUserId,
        role: "driver",
        kind: "load_assigned",
        title: `New load ${load.loadRef}`,
        body: `${load.commodity} · ${load.origin} → ${load.destination}${load.scheduledDock ? ` · ${load.scheduledDock}` : ""}. Assigned by ${user.name}.`,
        href: "/driver",
        emailStatus: "in-app",
      },
    });
  }

  return json(serializeLoad(load), 201);
}
