import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import {
  evidenceKey,
  MAX_EVIDENCE_BYTES,
  sha256Buffer,
  StorageNotConfigured,
  storeEvidence,
} from "@/lib/evidence-storage";
import { badRequest, forbidden, json, unauthorized } from "@/lib/http";
import { CASE_STAFF, CURRENCIES, DRIVER_DOC_TYPES, FINANCIAL_DOC_TYPES, isDocType, parseAmountCents } from "@/lib/policy";

const TOO_LARGE = "File is larger than 4 MB.";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const params = new URL(request.url).searchParams;
  const label = (params.get("label") ?? "evidence").slice(0, 200);
  const caseId = params.get("caseId");
  const loadId = params.get("loadId");
  if (!caseId && !loadId && !hasRole(user, CASE_STAFF)) {
    return badRequest("caseId or loadId is required.");
  }

  const rawType = params.get("docType");
  if (rawType && !isDocType(rawType)) return badRequest("Unknown document type.");
  const docType = isDocType(rawType) ? rawType : "other";
  const docNumber = params.get("docNumber")?.trim().slice(0, 80) || null;
  const otherType = docType === "other" ? params.get("otherType")?.trim().slice(0, 60) || null : null;
  if (docType === "other" && !otherType) return badRequest("Say what kind of document this is.");
  if (user.role === "driver" && !DRIVER_DOC_TYPES.includes(docType)) {
    return forbidden("Drivers file trip paperwork: bills of lading, proof of delivery, receipts, packing lists, customs forms.");
  }
  const amountCents = parseAmountCents(params.get("amount"));
  if (amountCents === undefined) return badRequest("Amount must be a number like 1250.00.");
  if (amountCents !== null && !FINANCIAL_DOC_TYPES.includes(docType)) {
    return badRequest("Only invoices, receipts and rate confirmations carry an amount.");
  }
  const currency = params.get("currency") ?? "CAD";
  if (!(CURRENCIES as readonly string[]).includes(currency)) return badRequest("Currency must be CAD or USD.");

  if (caseId) {
    if (!hasRole(user, CASE_STAFF)) {
      return forbidden("Only supplier or logistics staff can attach case documents.");
    }
    const kase = await prisma.verifyCase.findFirst({
      where: { id: caseId, orgId: user.orgId, revokedAt: null },
      select: { id: true },
    });
    if (!kase) return badRequest("caseId is not an open case in your org.");
  }
  if (loadId) {
    const load = await prisma.load.findFirst({
      where: { id: loadId, orgId: user.orgId },
      select: { id: true },
    });
    if (!load) return badRequest("loadId is not in your org.");
  }

  if (Number(request.headers.get("content-length") ?? 0) > MAX_EVIDENCE_BYTES) {
    return badRequest(TOO_LARGE);
  }
  const buffer = Buffer.from(await request.arrayBuffer());
  if (!buffer.length) return badRequest("Empty upload.");
  if (buffer.length > MAX_EVIDENCE_BYTES) return badRequest(TOO_LARGE);

  const contentType = (request.headers.get("content-type") ?? "application/octet-stream").slice(0, 100);
  const key = evidenceKey(user.orgId, label);
  try {
    await storeEvidence(key, buffer, contentType);
  } catch (error) {
    if (error instanceof StorageNotConfigured) return json({ error: error.message }, 503);
    throw error;
  }

  const asset = await prisma.evidenceAsset.create({
    data: {
      orgId: user.orgId,
      caseId,
      loadId,
      r2Key: key,
      contentHash: sha256Buffer(buffer),
      contentType,
      label,
      byteSize: buffer.length,
      docType,
      docNumber,
      otherType,
      amountCents,
      currency: amountCents === null ? null : currency,
      uploadedById: user.id,
    },
  });
  if (caseId) {
    await prisma.verifyCase.updateMany({
      where: { id: caseId, orgId: user.orgId },
      data: { matchesUploaded: true },
    });
  }

  return json({ id: asset.id, contentHash: asset.contentHash, byteSize: asset.byteSize }, 201);
}
