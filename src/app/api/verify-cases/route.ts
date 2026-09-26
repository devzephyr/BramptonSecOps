import { RequestType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { CASE_STAFF } from "@/lib/policy";
import { badRequest, forbidden, json, unauthorized } from "@/lib/http";
import {
  buildCasePayload,
  caseCreateData,
  parseOobAck,
  caseInclude,
  serializeCase,
} from "@/lib/cases";
import type { PayloadFields } from "@/lib/payload";
import { contactOnFile } from "@/lib/directory";
import { REQUEST_FIELDS } from "@/preview/data";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, CASE_STAFF)) return forbidden("Only supplier or manager staff can view cases.");

  const rows = await prisma.verifyCase.findMany({
    where: { orgId: user.orgId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: caseInclude,
  });
  return json({
    cases: rows.map((row) => serializeCase(row, { includeRawText: true })),
  });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, CASE_STAFF)) return forbidden("Only supplier or manager staff can open a verify case.");

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const requestType = body.requestType;
  const rawText = body.rawText;
  const contactId = body.contactId;
  if (
    typeof requestType !== "string" ||
    !(Object.values(RequestType) as string[]).includes(requestType)
  ) {
    return badRequest("requestType is not a known request type.");
  }
  if (typeof rawText !== "string" || !rawText.trim()) {
    return badRequest("rawText is required.");
  }
  if (rawText.length > 5000) {
    return badRequest("The sealed note is limited to 5,000 characters.");
  }
  if (typeof contactId !== "string") {
    return badRequest("Pick a counterparty from the directory.");
  }

  const contact = await prisma.directoryContact.findFirst({
    where: { id: contactId, orgId: user.orgId },
  });
  if (!contact) return badRequest("Contact not found in your org.");

  const counterparty = contact.company;
  const onFileDomain = contact.domain;
  const onFile = contactOnFile(contact);
  const requested: PayloadFields = { ...onFile };
  if (body.requested && typeof body.requested === "object") {
    for (const [key, value] of Object.entries(body.requested as Record<string, unknown>)) {
      if (/^[a-z]{1,32}$/i.test(key) && typeof value === "string" && value.trim()) {
        requested[key] = value.trim().slice(0, 200);
      }
    }
  }

  const sent = (body.requested ?? {}) as Record<string, unknown>;
  const missing = (REQUEST_FIELDS[requestType] ?? []).filter((key) => {
    const value = sent[key];
    return typeof value !== "string" || !value.trim();
  });
  if (missing.length > 0) {
    return badRequest(`Enter the requested ${missing.join(", ")}.`);
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
      contactId,
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
    include: caseInclude,
  });

  const payload = buildCasePayload(created);
  const updated = await prisma.verifyCase.update({
    where: { id: created.id },
    data: {
      payloadCanonical: payload.canonical,
      payloadHash: payload.payloadHash,
    },
    include: caseInclude,
  });

  return json(serializeCase(updated, { includeRawText: true }), 201);
}
