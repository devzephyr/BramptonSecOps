import type { RequestType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { badRequest, forbidden, json, unauthorized } from "@/lib/http";
import {
  buildCasePayload,
  caseCreateData,
  parseOobAck,
  serializeCase,
} from "@/lib/cases";
import type { PayloadFields } from "@/lib/payload";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const rows = await prisma.verifyCase.findMany({
    where: { orgId: user.orgId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
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
  return json({
    cases: rows.map((row) => serializeCase(row, { includeRawText: true })),
  });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (
    user.role !== "supplier" &&
    user.role !== "manager" &&
    user.role !== "admin"
  ) {
    return forbidden("Only supplier or manager staff can open a verify case.");
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const requestType = body.requestType;
  const counterparty = body.counterparty;
  const rawText = body.rawText;
  if (typeof requestType !== "string" || typeof counterparty !== "string") {
    return badRequest("requestType and counterparty are required.");
  }
  if (typeof rawText !== "string" || !rawText.trim()) {
    return badRequest("rawText is required.");
  }

  const onFile = (body.onFile ?? body.onFileJson ?? {}) as PayloadFields;
  const requested = (body.requested ??
    body.requestedJson ??
    {}) as PayloadFields;
  const contactId =
    typeof body.contactId === "string" ? body.contactId : undefined;

  let onFileDomain: string | undefined;
  if (contactId) {
    const contact = await prisma.directoryContact.findFirst({
      where: { id: contactId, orgId: user.orgId },
    });
    if (!contact) return badRequest("Contact not found in your org.");
    onFileDomain = contact.domain;
  }

  const meta = caseCreateData({
    orgId: user.orgId,
    createdById: user.id,
    requestType,
    counterparty,
    rawText,
    onFile,
    requested,
    contactId,
    onFileDomain,
  });

  const created = await prisma.verifyCase.create({
    data: {
      orgId: user.orgId,
      createdById: user.id,
      contactId: contactId ?? null,
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
      status: meta.status,
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
