import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { badRequest, json, unauthorized } from "@/lib/http";
import { isOrgEvidenceKey, MAX_EVIDENCE_BYTES } from "@/lib/evidence-storage";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const key = body.key;
  const contentHash = body.contentHash;
  const label = typeof body.label === "string" ? body.label.slice(0, 200) : "evidence";
  const contentType =
    typeof body.contentType === "string"
      ? body.contentType
      : "application/octet-stream";
  const byteSize = typeof body.byteSize === "number" ? body.byteSize : 0;
  const caseId = typeof body.caseId === "string" ? body.caseId : null;
  const loadId = typeof body.loadId === "string" ? body.loadId : null;

  if (!isOrgEvidenceKey(key, user.orgId)) {
    return badRequest("key is required.");
  }
  if (!Number.isInteger(byteSize) || byteSize <= 0 || byteSize > MAX_EVIDENCE_BYTES) {
    return badRequest("byteSize must be between 1 byte and 10 MB.");
  }
  if (typeof contentHash !== "string" || !/^[a-f0-9]{64}$/.test(contentHash)) {
    return badRequest("contentHash must be a sha256 hex digest.");
  }

  if (caseId) {
    const kase = await prisma.verifyCase.findFirst({
      where: { id: caseId, orgId: user.orgId },
      select: { id: true },
    });
    if (!kase) return badRequest("caseId is not in your org.");
  }
  if (loadId) {
    const load = await prisma.load.findFirst({
      where: { id: loadId, orgId: user.orgId },
      select: { id: true },
    });
    if (!load) return badRequest("loadId is not in your org.");
  }

  const asset = await prisma.evidenceAsset.create({
    data: {
      orgId: user.orgId,
      caseId,
      loadId,
      r2Key: key,
      contentHash,
      contentType,
      label,
      byteSize,
    },
  });

  if (caseId) {
    await prisma.verifyCase.updateMany({
      where: { id: caseId, orgId: user.orgId },
      data: { matchesUploaded: true },
    });
  }

  return json({ id: asset.id, contentHash: asset.contentHash }, 201);
}
