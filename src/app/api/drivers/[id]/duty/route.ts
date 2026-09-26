import { prisma } from "@/lib/db";
import { hasRole, requireUser, type AuthedUser } from "@/lib/auth";
import { appendDuty, BreakRequired, driverHos, serializeDuty, setDutyStatus, verifyDutyChain } from "@/lib/duty";
import { isDutyStatus } from "@/lib/hos";
import { badRequest, forbidden, json, notFound, unauthorized } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

const MAX_DAYS = 14;

/** Drivers read their own log; managers and admins read any driver's in the org. */
async function driverFor(user: AuthedUser, id: string) {
  if (user.role === "driver" && user.id !== id) return null;
  if (user.role !== "driver" && !hasRole(user, ["manager", "admin"])) return null;
  return prisma.user.findFirst({
    where: { id, orgId: user.orgId, role: "driver" },
    select: { id: true, name: true, photoHash: true },
  });
}

function coordinate(value: unknown, limit: number) {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const driver = await driverFor(user, id);
  if (!driver) return user.role === "driver" ? forbidden("You can only read your own log.") : notFound();

  const days = Math.min(Math.max(Number(new URL(request.url).searchParams.get("days")) || 1, 1), MAX_DAYS);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [entries, hos, chain] = await Promise.all([
    prisma.dutyEntry.findMany({
      where: { orgId: user.orgId, driverId: id, at: { gte: since } },
      orderBy: { seq: "desc" },
      take: 1000,
    }),
    driverHos(id),
    verifyDutyChain(id),
  ]);
  const actors = await prisma.user.findMany({
    where: { orgId: user.orgId, id: { in: [...new Set(entries.map((entry) => entry.actorId))] } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(actors.map((actor) => [actor.id, actor.name]));
  return json({
    driver: { id: driver.id, name: driver.name, photoVersion: driver.photoHash?.slice(0, 12) ?? null },
    hos,
    chain,
    entries: entries.map((entry) => ({ ...serializeDuty(entry), actor: nameOf.get(entry.actorId) ?? "Unknown" })),
  });
}

/**
 * { status } changes duty status (the driver only). { note, refId? } appends a remark; a remark
 * pointing at an earlier entry is how a mistake gets corrected, since entries are never edited.
 * There is no way to pass a time: the server clock stamps every entry.
 */
export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const driver = await driverFor(user, id);
  if (!driver) return user.role === "driver" ? forbidden("You can only write your own log.") : notFound();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }
  if ("at" in body || "time" in body || "timestamp" in body) {
    return badRequest("Entry times are set by the server and cannot be supplied.");
  }
  const lat = coordinate(body.lat, 90);
  const lng = coordinate(body.lng, 180);
  const place = lat !== null && lng !== null ? { lat, lng } : {};
  const loadId = typeof body.loadId === "string" ? body.loadId : null;
  if (loadId) {
    const load = await prisma.load.count({ where: { id: loadId, orgId: user.orgId } });
    if (!load) return badRequest("loadId is not in your org.");
  }

  if ("status" in body) {
    if (user.id !== id) return forbidden("Only the driver can change their own duty status.");
    if (!isDutyStatus(body.status)) {
      return badRequest("status must be one of off_duty, sleeper_berth, on_duty, driving.");
    }
    try {
      const { entry, summary } = await setDutyStatus({
        orgId: user.orgId,
        driverId: id,
        actorId: user.id,
        kind: "status",
        status: body.status,
        source: "driver",
        loadId,
        ...place,
      });
      return json({ entry: entry && serializeDuty(entry), hos: summary }, entry ? 201 : 200);
    } catch (error) {
      if (error instanceof BreakRequired) return json({ error: error.message, hos: error.summary }, 409);
      throw error;
    }
  }

  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
  if (note.length < 3) return badRequest("Write a note of at least 3 characters.");
  let refId: string | null = null;
  if (typeof body.refId === "string" && body.refId) {
    const target = await prisma.dutyEntry.findFirst({
      where: { id: body.refId, driverId: id, orgId: user.orgId },
      select: { id: true },
    });
    if (!target) return badRequest("refId is not an entry in this driver's log.");
    refId = target.id;
  }
  const entry = await appendDuty({
    orgId: user.orgId,
    driverId: id,
    actorId: user.id,
    kind: "note",
    source: user.id === id ? "driver" : "manager",
    note,
    refId,
    loadId,
    ...place,
  });
  return json({ entry: serializeDuty(entry) }, 201);
}
