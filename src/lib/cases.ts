import type { CaseStatus, Prisma, VerifyCase } from "@prisma/client";
import { buildPayload, type PayloadFields } from "@/lib/payload";
import { playbookFor } from "@/lib/playbooks";
import { runHeuristics } from "@/lib/heuristics";
import { jevClassify } from "@/lib/jev";
import { DUAL_CONTROL_TYPES } from "@/lib/policy";

export type OobAck = {
  steps: boolean[];
  note: string;
};

export function oobComplete(steps: boolean[], note: string): boolean {
  return steps.length > 0 && steps.every(Boolean) && note.trim().length > 3;
}

export function parseOobAck(json: unknown, stepCount: number): OobAck {
  const raw = json as Partial<OobAck> | null | undefined;
  const steps = Array.isArray(raw?.steps)
    ? raw.steps.map(Boolean)
    : new Array(stepCount).fill(false);
  while (steps.length < stepCount) steps.push(false);
  if (steps.length > stepCount) steps.length = stepCount;
  return { steps, note: typeof raw?.note === "string" ? raw.note : "" };
}

export function statusFromOob(ack: OobAck): CaseStatus {
  return oobComplete(ack.steps, ack.note) ? "pending_approval" : "flagged";
}

const FORBIDDEN_CLIENT_DECISION =
  /^(approved|approve|pass|fully_approved|pending_second)$/i;

export function clientTriedToApprove(body: Record<string, unknown>): boolean {
  for (const key of ["decision", "action", "status"]) {
    const value = body[key];
    if (
      typeof value === "string" &&
      FORBIDDEN_CLIENT_DECISION.test(value.trim())
    ) {
      return true;
    }
  }
  return false;
}

const PAYLOAD_PATCH_KEYS = new Set([
  "requested",
  "requestedJson",
  "bank",
  "dock",
  "carrier",
  "seal",
]);

export function patchTouchesPayload(body: Record<string, unknown>): boolean {
  return Object.keys(body).some((key) => PAYLOAD_PATCH_KEYS.has(key));
}

export function mergeRequestedPatch(
  current: PayloadFields,
  body: Record<string, unknown>,
): PayloadFields {
  const next = { ...current };
  for (const source of [body.requested, body.requestedJson]) {
    if (!source || typeof source !== "object") continue;
    for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
      if (/^[a-z]{1,32}$/i.test(key) && typeof value === "string") {
        next[key] = value.trim().slice(0, 200);
      }
    }
  }
  for (const key of ["bank", "dock", "carrier", "seal"] as const) {
    if (typeof body[key] === "string") next[key] = body[key] as string;
  }
  return next;
}

export function buildCasePayload(caseRow: {
  id: string;
  orgId: string;
  requestType: string;
  counterparty: string;
  onFileJson: unknown;
  requestedJson: unknown;
  rawText: string;
}) {
  return buildPayload({
    caseId: caseRow.id,
    orgId: caseRow.orgId,
    requestType: caseRow.requestType,
    counterparty: caseRow.counterparty,
    onFile: caseRow.onFileJson as PayloadFields,
    requested: caseRow.requestedJson as PayloadFields,
    rawText: caseRow.rawText,
  });
}

export function caseCreateData(input: {
  orgId: string;
  createdById: string;
  requestType: string;
  counterparty: string;
  rawText: string;
  onFile: PayloadFields;
  requested: PayloadFields;
  contactId?: string | null;
  onFileDomain?: string;
  status?: CaseStatus;
}) {
  const book = playbookFor(input.requestType);
  const flags = runHeuristics({
    rawText: input.rawText,
    requestType: input.requestType,
    onFileDomain: input.onFileDomain,
    onFile: input.onFile,
    requested: input.requested,
  });
  const jev = jevClassify(input.rawText, input.requestType);
  const dualControl =
    book.dualControl || DUAL_CONTROL_TYPES.has(input.requestType);
  return {
    flags,
    jev,
    dualControl,
    oobSteps: book.oobSteps,
    status: input.status ?? ("flagged" as CaseStatus),
  };
}

/** Row lock that serializes approve, edit, and revoke on one case. */
export async function lockCase(
  tx: Prisma.TransactionClient,
  id: string,
  orgId: string,
): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "VerifyCase" WHERE id = ${id} AND "orgId" = ${orgId} FOR UPDATE`;
  return rows.length === 1;
}

export const caseInclude = {
  org: { select: { name: true } },
  contact: { select: { numberOnFile: true } },
  attestations: {
    orderBy: { verifiedAt: "asc" },
    select: {
      userId: true,
      verifiedAt: true,
      user: { select: { name: true, role: true } },
    },
  },
} satisfies Prisma.VerifyCaseInclude;

export function serializeCase(
  row: VerifyCase & {
    org?: { name: string };
    contact?: { numberOnFile: string } | null;
    attestations?: {
      userId: string;
      verifiedAt: Date;
      user: { name: string; role: string };
    }[];
  },
  opts?: { includeRawText?: boolean },
) {
  const steps = Array.isArray(row.oobStepsJson)
    ? (row.oobStepsJson as string[])
    : [];
  const ack = parseOobAck(row.oobAckJson, steps.length);
  return {
    id: row.id,
    orgId: row.orgId,
    orgName: row.org?.name,
    requestType: row.requestType,
    counterparty: row.counterparty,
    contactId: row.contactId,
    createdById: row.createdById,
    numberOnFile: row.contact?.numberOnFile ?? null,
    rawText: opts?.includeRawText ? row.rawText : undefined,
    onFile: row.onFileJson,
    requested: row.requestedJson,
    flags: row.flagsJson,
    oobSteps: steps,
    oobAck: ack,
    payloadCanonical: row.payloadCanonical,
    payloadHash: row.payloadHash,
    status: row.status,
    dualControl: row.dualControl,
    matchesUploaded: row.matchesUploaded,
    publicToken: row.publicToken,
    revokedAt: row.revokedAt,
    jev: row.jevJson,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    approvals: (row.attestations ?? []).map((item) => ({
      userId: item.userId,
      name: item.user.name,
      role: item.user.role,
      at:
        item.verifiedAt instanceof Date
          ? item.verifiedAt.toISOString()
          : String(item.verifiedAt),
    })),
  };
}

const REQUEST_LABEL: Record<string, string> = {
  bank_change: "Bank change",
  destination_change: "Destination change",
  credential_request: "Access request",
  new_carrier: "New carrier",
  ot_remote: "Plant remote access",
  first_order_credit: "First-order credit",
  truck_status_update: "Truck status",
  schedule_only: "Schedule",
  bol_pod_alter: "Bill or seal change",
};

/** One row per approver so each person reads and dismisses their own alert. */
export async function notifyApprovers(
  db: Pick<Prisma.TransactionClient, "user" | "notification">,
  input: {
    orgId: string;
    exclude: string[];
    kind: string;
    requestType: string;
    counterparty: string;
    body: string;
  },
) {
  const approvers = await db.user.findMany({
    where: { orgId: input.orgId, role: { in: ["manager", "admin"] }, id: { notIn: input.exclude } },
    select: { id: true, role: true },
  });
  if (approvers.length === 0) return;
  const label = REQUEST_LABEL[input.requestType] ?? "Request";
  await db.notification.createMany({
    data: approvers.map((person) => ({
      orgId: input.orgId,
      userId: person.id,
      role: person.role,
      kind: input.kind,
      title: `${label} from ${input.counterparty}`,
      body: input.body,
      href: "/manager",
      emailStatus: "in-app",
    })),
  });
}
