import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { MANAGERS, normalizeLoadRef } from "@/lib/policy";
import { badRequest, forbidden, isUniqueViolation, json, unauthorized } from "@/lib/http";
import { cleanCommodity, formatSetpoint } from "@/lib/normalize";
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
  if (!hasRole(user, ["supplier", ...MANAGERS])) {
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

  const loadRef = normalizeLoadRef(String(body.loadRef));
  if (!loadRef) return badRequest("Load number must be digits only, e.g. 4419.");

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
  const coDriverUserId = typeof body.coDriverUserId === "string" && body.coDriverUserId ? body.coDriverUserId : null;
  if (coDriverUserId) {
    if (!driverUserId) return badRequest("Pick the main driver before a co-driver.");
    if (coDriverUserId === driverUserId) return badRequest("The co-driver must be a different person.");
    const coDriver = await prisma.user.findFirst({
      where: { id: coDriverUserId, orgId: user.orgId, role: "driver" },
      select: { id: true },
    });
    if (!coDriver) return badRequest("coDriverUserId must be a driver in your org.");
  }

  const text = (key: string, max = 120) =>
    typeof body[key] === "string" ? (body[key] as string).trim().slice(0, max) : "";
  const optional = (key: string, max = 120) => text(key, max) || null;

  const load = await prisma.load
    .create({
      data: {
        orgId: user.orgId,
        loadRef,
        carrierName: text("carrierName"),
        plate: text("plate", 20),
        trailer: text("trailer", 20),
        origin: text("origin"),
        destination: text("destination"),
        commodity: cleanCommodity(text("commodity", 80)),
        currentStatus: "scheduled",
        lastKnown: text("lastKnown", 200) || text("origin"),
        reeferSetpoint: formatSetpoint(text("reeferSetpoint", 20)) || null,
        sealNumber: optional("sealNumber", 40),
        scheduledDock: optional("scheduledDock", 40),
        driverUserId,
        coDriverUserId,
        eta,
      },
    })
    .catch((error: unknown) => {
      if (isUniqueViolation(error)) return null;
      throw error;
    });
  if (!load) return badRequest("That load reference already exists.");

  const assigned = [driverUserId, coDriverUserId].filter((id): id is string => Boolean(id));
  if (assigned.length) {
    await prisma.notification.createMany({
      data: assigned.map((driverId) => ({
        orgId: user.orgId,
        userId: driverId,
        role: "driver" as const,
        kind: "load_assigned",
        title: `New load ${load.loadRef}${driverId === coDriverUserId ? " (co-driver)" : ""}`,
        body: `${load.commodity} · ${load.origin} → ${load.destination}${load.scheduledDock ? ` · ${load.scheduledDock}` : ""}. Assigned by ${user.name}.`,
        href: "/driver",
        emailStatus: "in-app",
      })),
    });
  }

  return json(serializeLoad(load), 201);
}
