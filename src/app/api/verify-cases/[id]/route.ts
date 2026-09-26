import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import {
  badRequest,
  forbidden,
  json,
  notFound,
  unauthorized,
} from "@/lib/http";
import {
  buildCasePayload,
  clientTriedToApprove,
  mergeRequestedPatch,
  parseOobAck,
  patchTouchesPayload,
  caseInclude,
  serializeCase,
  statusFromOob,
} from "@/lib/cases";
import type { PayloadFields } from "@/lib/payload";
import { approvalProgress } from "@/lib/policy";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const row = await prisma.verifyCase.findFirst({
    where: { id, orgId: user.orgId },
    include: caseInclude,
  });
  if (!row || row.revokedAt) return notFound();
  return json(serializeCase(row, { includeRawText: true }));
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, ["supplier", "manager", "admin"])) {
    return forbidden("Only supplier or manager staff can edit a case.");
  }
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  if (clientTriedToApprove(body)) {
    return forbidden(
      "Approvals require a passkey ceremony, not a client decision.",
    );
  }

  const row = await prisma.verifyCase.findFirst({
    where: { id, orgId: user.orgId },
    include: caseInclude,
  });
  if (!row || row.revokedAt) return notFound();
  if (row.status === "fully_approved") {
    return forbidden("This case is already approved.");
  }

  const steps = Array.isArray(row.oobStepsJson)
    ? (row.oobStepsJson as string[])
    : [];
  let ack = parseOobAck(row.oobAckJson, steps.length);

  if (typeof body.oobNote === "string") {
    ack = { ...ack, note: body.oobNote.slice(0, 500) };
  }
  if (Array.isArray(body.oobSteps)) {
    ack = {
      ...ack,
      steps: body.oobSteps.map(Boolean).slice(0, steps.length),
    };
  }
  if (
    typeof body.oobStepIndex === "number" &&
    typeof body.oobStepDone === "boolean"
  ) {
    const index = body.oobStepIndex;
    if (index >= 0 && index < ack.steps.length) {
      ack.steps[index] = body.oobStepDone;
    }
  }

  let requested = row.requestedJson as PayloadFields;
  let payloadCanonical = row.payloadCanonical;
  let payloadHash = row.payloadHash;
  let status = statusFromOob(ack);

  if (patchTouchesPayload(body)) {
    requested = mergeRequestedPatch(requested, body);
    const payload = buildCasePayload({
      ...row,
      requestedJson: requested,
    });
    payloadCanonical = payload.canonical;
    payloadHash = payload.payloadHash;
    ack = parseOobAck(null, steps.length);
    status = "flagged";
  } else if (status === "pending_approval") {
    const prior = await prisma.approvalAttestation.findMany({
      where: { caseId: row.id, payloadHash },
      select: { userId: true },
    });
    if (
      approvalProgress({
        dualControl: row.dualControl,
        approverIds: prior.map((item) => item.userId),
      }) === "need_second"
    ) {
      status = "pending_second";
    }
  }

  const updated = await prisma.verifyCase.update({
    where: { id: row.id },
    data: {
      requestedJson: requested,
      oobAckJson: ack,
      payloadCanonical,
      payloadHash,
      status,
    },
    include: caseInclude,
  });

  return json(serializeCase(updated, { includeRawText: true }));
}
