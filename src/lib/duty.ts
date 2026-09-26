import type { DutyEntry, Prisma } from "@prisma/client";
import { canonicalize, sha256Hex } from "@/lib/canonical";
import { prisma } from "@/lib/db";
import { isUniqueViolation } from "@/lib/http";
import { DRIVING_LIMIT_MS, formatDuration, summarizeHos, type DutyStatusName, type HosSummary } from "@/lib/hos";
import { MANAGERS } from "@/lib/policy";

export const GENESIS_HASH = "0".repeat(64);

type Hashable = Pick<
  DutyEntry,
  "driverId" | "seq" | "kind" | "status" | "at" | "lat" | "lng" | "loadId" | "note" | "source" | "refId" | "actorId" | "prevHash"
>;

export function dutyHash(entry: Hashable): string {
  return sha256Hex(
    canonicalize({
      driverId: entry.driverId,
      seq: entry.seq,
      kind: entry.kind,
      status: entry.status ?? null,
      at: entry.at.toISOString(),
      lat: entry.lat ?? null,
      lng: entry.lng ?? null,
      loadId: entry.loadId ?? null,
      note: entry.note ?? null,
      source: entry.source,
      refId: entry.refId ?? null,
      actorId: entry.actorId,
      prevHash: entry.prevHash,
    }),
  );
}

export type DutyInput = {
  orgId: string;
  driverId: string;
  actorId: string;
  kind: "status" | "note";
  status?: DutyStatusName | null;
  source: "driver" | "gps" | "status" | "manager";
  lat?: number | null;
  lng?: number | null;
  loadId?: string | null;
  note?: string | null;
  refId?: string | null;
};

/**
 * Appends one entry to a driver's log. The server clock sets `at` (never the client), clamped so it
 * never runs behind the previous entry. (driverId, seq) is unique, so two concurrent appends cannot
 * both extend the same link; the loser retries on the new head.
 */
export async function appendDuty(input: DutyInput): Promise<DutyEntry> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const head = await prisma.dutyEntry.findFirst({
      where: { driverId: input.driverId },
      orderBy: { seq: "desc" },
    });
    const now = new Date();
    const at = head && head.at > now ? head.at : now;
    const entry = {
      orgId: input.orgId,
      driverId: input.driverId,
      seq: (head?.seq ?? 0) + 1,
      kind: input.kind,
      status: input.status ?? null,
      at,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      loadId: input.loadId ?? null,
      note: input.note ?? null,
      source: input.source,
      refId: input.refId ?? null,
      actorId: input.actorId,
      prevHash: head?.hash ?? GENESIS_HASH,
    };
    try {
      return await prisma.dutyEntry.create({ data: { ...entry, hash: dutyHash(entry) } });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new Error("Could not append to the duty log. Try again.");
}

/** Status entries from the last 24 h plus the one in force when that window opened. */
export async function recentStatusEntries(driverId: string, now = new Date()) {
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [before, inside] = await Promise.all([
    prisma.dutyEntry.findFirst({
      where: { driverId, kind: "status", at: { lt: windowStart } },
      orderBy: { seq: "desc" },
    }),
    prisma.dutyEntry.findMany({
      where: { driverId, kind: "status", at: { gte: windowStart } },
      orderBy: { seq: "asc" },
    }),
  ]);
  return before ? [before, ...inside] : inside;
}

export function hosOf(entries: Pick<DutyEntry, "status" | "at">[], now = new Date()): HosSummary {
  return summarizeHos(
    entries.flatMap((entry) => (entry.status ? [{ status: entry.status, at: entry.at }] : [])),
    now,
  );
}

export async function driverHos(driverId: string, now = new Date()) {
  return hosOf(await recentStatusEntries(driverId, now), now);
}

export class BreakRequired extends Error {
  constructor(public summary: HosSummary) {
    super(
      `Break required: ${formatDuration(DRIVING_LIMIT_MS)} of driving reached. ` +
        `Stay stopped ${formatDuration(Math.ceil(summary.breakLeftMs / 60000) * 60000)} more before driving again.`,
    );
  }
}

/**
 * Changes a driver's duty status. A driver (or a status tap that implies driving) cannot start
 * driving while a break is owed. GPS-detected driving is always recorded, because the log has to
 * say what actually happened; it raises a violation alert instead.
 */
export async function setDutyStatus(input: DutyInput & { status: DutyStatusName }) {
  const summary = await driverHos(input.driverId);
  if (summary.status === input.status && summary.since) return { entry: null, summary };
  if (input.status === "driving" && input.source !== "gps" && summary.breakOwed) {
    throw new BreakRequired(summary);
  }
  const entry = await appendDuty({ ...input, kind: "status" });
  const after = await driverHos(input.driverId);
  await alertIfOverLimit(input.orgId, input.driverId, after);
  return { entry, summary: after };
}

/** One alert per driving stretch past the limit, to managers, admins, and the driver. */
export async function alertIfOverLimit(orgId: string, driverId: string, summary: HosSummary) {
  if (summary.status !== "driving" || !summary.breakOwed || !summary.stretchStart) return;
  const [driver, staff] = await Promise.all([
    prisma.user.findFirst({ where: { id: driverId, orgId }, select: { id: true, name: true } }),
    prisma.user.findMany({
      where: { orgId, role: { in: MANAGERS } },
      select: { id: true, role: true, email: true },
    }),
  ]);
  if (!driver) return;
  const key = `hos:${driverId}:${summary.stretchStart}`;
  const data: Prisma.NotificationCreateManyInput[] = [
    ...staff.map((person) => ({
      orgId,
      userId: person.id,
      role: person.role,
      kind: "hos_violation",
      title: `${driver.name} is driving past the ${formatDuration(DRIVING_LIMIT_MS)} limit`,
      body: `${formatDuration(summary.drivingMs)} of driving since the last break. A break is required now.`,
      href: "/manager",
      emailTo: person.email,
      emailStatus: "in-app",
      dedupeKey: `${key}:${person.id}`,
    })),
    {
      orgId,
      userId: driver.id,
      role: "driver",
      kind: "hos_violation",
      title: "Break required now",
      body: `You have driven ${formatDuration(summary.drivingMs)} since your last break. Stop at the next safe place.`,
      href: "/driver",
      emailStatus: "in-app",
      dedupeKey: `${key}:${driver.id}`,
    },
  ];
  await prisma.notification.createMany({ data, skipDuplicates: true });
}

/** Recomputes every hash in a driver's log. Returns the first broken link, if any. */
export async function verifyDutyChain(driverId: string) {
  const entries = await prisma.dutyEntry.findMany({ where: { driverId }, orderBy: { seq: "asc" } });
  let prev = GENESIS_HASH;
  for (const [index, entry] of entries.entries()) {
    const ok = entry.seq === index + 1 && entry.prevHash === prev && dutyHash(entry) === entry.hash;
    if (!ok) return { intact: false, count: entries.length, brokenAt: entry.seq };
    prev = entry.hash;
  }
  return { intact: true, count: entries.length, brokenAt: null };
}

export function serializeDuty(entry: DutyEntry) {
  return {
    id: entry.id,
    seq: entry.seq,
    kind: entry.kind,
    status: entry.status,
    at: entry.at,
    lat: entry.lat,
    lng: entry.lng,
    loadId: entry.loadId,
    note: entry.note,
    source: entry.source,
    refId: entry.refId,
    actorId: entry.actorId,
    hash: entry.hash,
  };
}
