import type { RequestType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  buildCasePayload,
  caseCreateData,
  parseOobAck,
  serializeCase,
} from "@/lib/cases";
import type { PayloadFields } from "@/lib/payload";
import { badRequest, forbidden, json, unauthorized } from "@/lib/http";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (user.role === "driver" || user.role === "receiver") {
    return forbidden("This role cannot create mailbox drafts.");
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const requestType =
    typeof body.requestType === "string" ? body.requestType : "schedule_only";
  const counterparty =
    typeof body.counterparty === "string"
      ? body.counterparty
      : "Unknown sender";
  const rawText =
    typeof body.rawText === "string"
      ? body.rawText
      : "Draft imported from mailbox.";

  const onFile = (body.onFile ?? {}) as PayloadFields;
  const requested = (body.requested ?? {}) as PayloadFields;

  const meta = caseCreateData({
    orgId: user.orgId,
    createdById: user.id,
    requestType,
    counterparty,
    rawText,
    onFile,
    requested,
    status: "draft",
  });

  const created = await prisma.verifyCase.create({
    data: {
      orgId: user.orgId,
      createdById: user.id,
      requestType: requestType as RequestType,
      counterparty,
      rawText,
      onFileJson: onFile,
      requestedJson: requested,
      flagsJson: meta.flags,
      oobStepsJson: meta.oobSteps,
      oobAckJson: parseOobAck(null, meta.oobSteps.length),
      payloadCanonical: "",
      payloadHash: "",
      status: "draft",
      dualControl: meta.dualControl,
      jevJson: meta.jev ?? undefined,
    },
    include: { org: { select: { name: true } } },
  });

  const payload = buildCasePayload(created);
  const updated = await prisma.verifyCase.update({
    where: { id: created.id },
    data: {
      payloadCanonical: payload.canonical,
      payloadHash: payload.payloadHash,
    },
    include: { org: { select: { name: true } } },
  });

  return json(serializeCase(updated, { includeRawText: true }), 201);
}
