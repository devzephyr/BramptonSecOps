import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { MANAGERS, RECEIVERS } from "@/lib/policy";
import { badRequest, forbidden, json, notFound, unauthorized } from "@/lib/http";
import { serializeLoad } from "@/lib/loads";

type Params = { params: Promise<{ id: string }> };

/**
 * Records the load changing hands: to a driver ({ toUserId }) or into a warehouse or yard ({ toFacility }).
 * - Managers and admins can make any transfer, including driver to driver.
 * - The driver holding the load can drop it at a facility.
 * - Receivers can take it into a facility.
 * The seal is checked at every transfer; a mismatch or a broken seal is recorded and alerts managers.
 */
export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const toUserId = typeof body.toUserId === "string" && body.toUserId ? body.toUserId : null;
  const toFacility = typeof body.toFacility === "string" ? body.toFacility.trim().slice(0, 120) : "";
  if (Boolean(toUserId) === Boolean(toFacility)) {
    return badRequest("Send exactly one of toUserId (a driver) or toFacility (a warehouse or yard).");
  }
  const staff = hasRole(user, MANAGERS);
  if (toUserId && !staff) return forbidden("Only a manager can hand a load to another driver.");
  if (!staff && user.role !== "driver" && !hasRole(user, RECEIVERS)) {
    return forbidden("Your role cannot record custody transfers.");
  }

  const sealNumber = typeof body.sealNumber === "string" ? body.sealNumber.trim().slice(0, 40) || null : null;
  const reportedBroken = body.sealIntact === false;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) || null : null;
  const num = (value: unknown, limit: number) =>
    typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit ? value : null;

  let toDriver: { id: string; name: string } | null = null;
  if (toUserId) {
    toDriver = await prisma.user.findFirst({
      where: { id: toUserId, orgId: user.orgId, role: "driver" },
      select: { id: true, name: true },
    });
    if (!toDriver) return badRequest("toUserId must be a driver in your org.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Load" WHERE id = ${id} AND "orgId" = ${user.orgId} FOR UPDATE`;
    if (locked.length !== 1) return notFound();
    const load = await tx.load.findUniqueOrThrow({ where: { id } });

    if (user.role === "driver" && load.driverUserId !== user.id && load.coDriverUserId !== user.id) {
      return forbidden("You can only drop a load you are carrying.");
    }
    if (toDriver && load.driverUserId === toDriver.id) return badRequest(`${toDriver.name} already has this load.`);
    if (toFacility && !load.driverUserId && load.facility === toFacility) {
      return badRequest(`The load is already at ${toFacility}.`);
    }

    const fromDriver = load.driverUserId
      ? await tx.user.findFirst({ where: { id: load.driverUserId }, select: { id: true, name: true } })
      : null;
    const fromLabel = fromDriver?.name ?? load.facility ?? "unassigned";
    const toLabel = toDriver?.name ?? toFacility;

    const sealMismatch = Boolean(sealNumber && load.sealNumber && sealNumber !== load.sealNumber);
    const sealIntact = sealNumber || reportedBroken ? !reportedBroken && !sealMismatch : null;

    const transfer = await tx.custodyTransfer.create({
      data: {
        orgId: user.orgId,
        loadId: id,
        fromUserId: fromDriver?.id ?? null,
        fromFacility: fromDriver ? null : load.facility,
        toUserId: toDriver?.id ?? null,
        toFacility: toDriver ? null : toFacility,
        sealNumber,
        sealIntact,
        lat: num(body.lat, 90) ?? load.lat,
        lng: num(body.lng, 180) ?? load.lng,
        note,
        actorId: user.id,
      },
    });
    const updated = await tx.load.update({
      where: { id },
      // A handoff ends the team: the co-driver seat is cleared and can be re-added from Edit.
      data: toDriver
        ? { driverUserId: toDriver.id, coDriverUserId: null, facility: null }
        : { driverUserId: null, coDriverUserId: null, facility: toFacility },
    });

    const parts = [`${fromLabel} → ${toLabel}`];
    if (sealIntact === false) {
      parts.push(
        sealMismatch ? `Seal mismatch: expected ${load.sealNumber}, found ${sealNumber}` : "Seal reported broken",
      );
    } else if (sealIntact) parts.push(`Seal ${sealNumber} checked`);
    if (note) parts.push(note);
    await tx.trackingEvent.create({
      data: { orgId: user.orgId, loadId: id, eventType: "custody", rawNote: parts.join(" · "), actorId: user.id },
    });

    const notes: Prisma.NotificationCreateManyInput[] = [];
    const route = `${updated.origin} → ${updated.destination}`;
    if (toDriver) {
      notes.push({
        orgId: user.orgId,
        userId: toDriver.id,
        role: "driver",
        kind: "load_assigned",
        title: `Load ${updated.loadRef} handed to you`,
        body: `${updated.commodity} · ${route} · pick up from ${fromLabel}. Assigned by ${user.name}.`,
        href: "/driver",
        emailStatus: "in-app",
      });
    }
    if (fromDriver && fromDriver.id !== user.id) {
      notes.push({
        orgId: user.orgId,
        userId: fromDriver.id,
        role: "driver",
        kind: "load_reassigned",
        title: `Load ${updated.loadRef} handed off`,
        body: `${user.name} recorded the load going to ${toLabel}. Stop sharing your position for it.`,
        href: "/driver",
        emailStatus: "in-app",
      });
    }
    if (load.coDriverUserId && load.coDriverUserId !== user.id) {
      notes.push({
        orgId: user.orgId,
        userId: load.coDriverUserId,
        role: "driver",
        kind: "load_reassigned",
        title: `Load ${updated.loadRef} handed off`,
        body: `${user.name} recorded the load going to ${toLabel}. You are no longer the co-driver on it.`,
        href: "/driver",
        emailStatus: "in-app",
      });
    }
    if (sealIntact === false) {
      const managers = await tx.user.findMany({
        where: { orgId: user.orgId, role: { in: MANAGERS } },
        select: { id: true, role: true, email: true },
      });
      for (const person of managers) {
        notes.push({
          orgId: user.orgId,
          userId: person.id,
          role: person.role,
          kind: "seal_exception",
          title: `Seal exception on load ${updated.loadRef}`,
          body: `${parts.slice(0, 2).join(" · ")}. Recorded by ${user.name}.`,
          href: "/logistics",
          emailTo: person.email,
          emailStatus: "in-app",
        });
      }
    }
    if (notes.length) await tx.notification.createMany({ data: notes });
    return { load: updated, transferId: transfer.id, sealIntact };
  });

  if (result instanceof Response) return result;
  return json({ load: serializeLoad(result.load), transferId: result.transferId, sealIntact: result.sealIntact }, 201);
}
