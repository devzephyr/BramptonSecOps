import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { MANAGERS } from "@/lib/policy";
import {
  badRequest,
  forbidden,
  json,
  notFound,
  unauthorized,
} from "@/lib/http";
import { LOCKED_WHEN_MOVING, serializeLoad } from "@/lib/loads";

type Params = { params: Promise<{ id: string }> };

const EDITABLE = {
  carrierName: 120,
  plate: 20,
  trailer: 20,
  origin: 120,
  destination: 120,
  commodity: 80,
  scheduledDock: 40,
  sealNumber: 40,
  reeferSetpoint: 20,
} as const;
type EditableKey = keyof typeof EDITABLE;
const REQUIRED: EditableKey[] = [
  "carrierName",
  "plate",
  "trailer",
  "origin",
  "destination",
  "commodity",
];

export async function GET(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const load = await prisma.load.findFirst({
    where: { id, orgId: user.orgId },
    select: { id: true },
  });
  if (!load) return notFound();

  const [events, custody, trail] = await Promise.all([
    prisma.trackingEvent.findMany({
      where: { orgId: user.orgId, loadId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.custodyTransfer.findMany({
      where: { orgId: user.orgId, loadId: id },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
    prisma.positionPing.findMany({
      where: { orgId: user.orgId, loadId: id },
      orderBy: { recordedAt: "desc" },
      take: 1000,
      select: { lat: true, lng: true, recordedAt: true },
    }),
  ]);
  const people = new Set<string>(events.map((event) => event.actorId));
  for (const hop of custody) {
    for (const person of [hop.actorId, hop.fromUserId, hop.toUserId]) if (person) people.add(person);
  }
  const actors = await prisma.user.findMany({
    where: { orgId: user.orgId, id: { in: [...people] } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(actors.map((actor) => [actor.id, actor.name]));
  const holder = (userId: string | null, facility: string | null) =>
    userId ? { kind: "driver", name: nameOf.get(userId) ?? "Unknown" } : facility ? { kind: "facility", name: facility } : null;
  return json({
    custody: custody.map((hop) => ({
      id: hop.id,
      from: holder(hop.fromUserId, hop.fromFacility),
      to: holder(hop.toUserId, hop.toFacility),
      sealNumber: hop.sealNumber,
      sealIntact: hop.sealIntact,
      lat: hop.lat,
      lng: hop.lng,
      note: hop.note,
      actor: nameOf.get(hop.actorId) ?? "Unknown",
      createdAt: hop.createdAt,
    })),
    trail: trail.reverse().map((point) => ({ lat: point.lat, lng: point.lng, at: point.recordedAt })),
    events: events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      note: event.rawNote,
      actor: nameOf.get(event.actorId) ?? "Unknown",
      createdAt: event.createdAt,
    })),
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, MANAGERS)) {
    return forbidden("Only a manager or admin can edit or hand off a load.");
  }
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const changes: Record<string, string | Date | null> = {};
  for (const [key, max] of Object.entries(EDITABLE) as [
    EditableKey,
    number,
  ][]) {
    if (!(key in body)) continue;
    const raw = body[key];
    if (raw !== null && typeof raw !== "string")
      return badRequest(`${key} must be text.`);
    const value = (raw ?? "").trim().slice(0, max);
    if (!value && REQUIRED.includes(key))
      return badRequest(`${key} is required.`);
    changes[key] = value || null;
  }
  if ("eta" in body) {
    if (body.eta === null || body.eta === "") changes.eta = null;
    else {
      const eta = new Date(String(body.eta));
      if (Number.isNaN(eta.getTime()))
        return badRequest("eta must be a valid date.");
      changes.eta = eta;
    }
  }
  let newDriver: { id: string; name: string } | null | undefined;
  if ("driverUserId" in body) {
    const driverId = body.driverUserId;
    if (driverId === null || driverId === "") newDriver = null;
    else if (typeof driverId !== "string")
      return badRequest("driverUserId must be text.");
    else {
      newDriver = await prisma.user.findFirst({
        where: { id: driverId, orgId: user.orgId, role: "driver" },
        select: { id: true, name: true },
      });
      if (!newDriver)
        return badRequest("driverUserId must be a driver in your org.");
    }
  }
  const handoffNote =
    typeof body.handoffNote === "string"
      ? body.handoffNote.trim().slice(0, 200)
      : "";

  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Load" WHERE id = ${id} AND "orgId" = ${user.orgId} FOR UPDATE`;
    if (locked.length !== 1) return notFound();
    const load = await tx.load.findUniqueOrThrow({ where: { id } });

    const changed = (Object.keys(changes) as (keyof typeof changes)[]).filter(
      (key) => {
        const before = load[key as keyof typeof load];
        const after = changes[key];
        if (before instanceof Date || after instanceof Date) {
          return (
            (before as Date | null)?.getTime() !==
            (after as Date | null)?.getTime()
          );
        }
        return (before ?? null) !== (after ?? null);
      },
    );
    const blocked = changed.filter((key) =>
      (LOCKED_WHEN_MOVING as readonly string[]).includes(key),
    );
    if (load.currentStatus !== "scheduled" && blocked.length > 0) {
      return forbidden(
        "Dock, destination, and seal are locked once a load is moving. Open a destination or seal change request instead.",
      );
    }

    const previousDriver = load.driverUserId;
    const driverChanged =
      newDriver !== undefined && (newDriver?.id ?? null) !== previousDriver;
    if (changed.length === 0 && !driverChanged) return load;

    const data: Record<string, string | Date | null> = {};
    for (const key of changed) data[key] = changes[key];
    if (driverChanged) {
      data.driverUserId = newDriver?.id ?? null;
      if (newDriver) data.facility = null;
    }
    const updated = await tx.load.update({ where: { id }, data: data as Prisma.LoadUncheckedUpdateInput });

    const parts: string[] = [];
    if (driverChanged)
      parts.push(`Driver → ${newDriver?.name ?? "unassigned"}`);
    if (changed.length > 0) parts.push(`Updated ${changed.join(", ")}`);
    if (handoffNote) parts.push(`at ${handoffNote}`);
    await tx.trackingEvent.create({
      data: {
        orgId: user.orgId,
        loadId: id,
        eventType: driverChanged ? "handoff" : "updated",
        rawNote: parts.join(" · "),
        actorId: user.id,
      },
    });

    if (driverChanged) {
      await tx.custodyTransfer.create({
        data: {
          orgId: user.orgId,
          loadId: id,
          fromUserId: previousDriver,
          fromFacility: previousDriver ? null : load.facility,
          toUserId: newDriver?.id ?? null,
          toFacility: newDriver ? null : load.facility,
          lat: load.lat,
          lng: load.lng,
          note: handoffNote || null,
          actorId: user.id,
        },
      });
      const route = `${updated.origin} → ${updated.destination}`;
      const notes: Prisma.NotificationCreateManyInput[] = [];
      if (newDriver) {
        notes.push({
          orgId: user.orgId,
          userId: newDriver.id,
          role: "driver",
          kind: "load_assigned",
          title: `Load ${updated.loadRef} handed to you`,
          body: `${updated.commodity} · ${route}${handoffNote ? ` · pick up at ${handoffNote}` : ""}. Assigned by ${user.name}.`,
          href: "/driver",
          emailStatus: "in-app",
        });
      }
      if (previousDriver) {
        notes.push({
          orgId: user.orgId,
          userId: previousDriver,
          role: "driver",
          kind: "load_reassigned",
          title: `Load ${updated.loadRef} reassigned`,
          body: `${user.name} handed this load to ${newDriver?.name ?? "nobody yet"}${handoffNote ? ` at ${handoffNote}` : ""}. Stop sharing your position for it.`,
          href: "/driver",
          emailStatus: "in-app",
        });
      }
      if (notes.length) await tx.notification.createMany({ data: notes });
    }
    return updated;
  });

  if (result instanceof Response) return result;
  return json(serializeLoad(result));
}
