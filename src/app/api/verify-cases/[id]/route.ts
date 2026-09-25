import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
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
  serializeCase,
  statusFromOob,
} from "@/lib/cases";
import type { PayloadFields } from "@/lib/payload";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const row = await prisma.verifyCase.findFirst({
    where: { id, orgId: user.orgId },
    include: {
      org: { select: { name: true } },
      attestations: {
        orderBy: { verifiedAt: "asc" },
        select: {
          userId: true,
          verifiedAt: true,
          user: { select: { name: true, role: true } },
        },
      },
    },
  });
  if (!row || row.revokedAt) return notFound();
  return json(serializeCase(row, { includeRawText: true }));
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
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
    include: { org: { select: { name: true } } },
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
    ack = { ...ack, note: body.oobNote };
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
    include: {
      org: { select: { name: true } },
      attestations: {
        orderBy: { verifiedAt: "asc" },
        select: {
          userId: true,
          verifiedAt: true,
          user: { select: { name: true, role: true } },
        },
      },
    },
  });

  return json(serializeCase(updated, { includeRawText: true }));
}
