import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { documentScope } from "@/lib/documents";
import { badRequest, forbidden, json, unauthorized } from "@/lib/http";
import { isDocType } from "@/lib/policy";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const scope = await documentScope(user);
  if (!scope) return forbidden("Your role cannot view documents.");

  const params = new URL(request.url).searchParams;
  const docType = params.get("docType");
  if (docType && !isDocType(docType)) return badRequest("Unknown document type.");
  const caseId = params.get("caseId");
  const loadId = params.get("loadId");

  const rows = await prisma.evidenceAsset.findMany({
    where: {
      AND: [
        scope,
        isDocType(docType) ? { docType } : {},
        caseId ? { caseId } : {},
        loadId ? { loadId } : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      label: true,
      contentType: true,
      byteSize: true,
      contentHash: true,
      docType: true,
      docNumber: true,
      amountCents: true,
      currency: true,
      caseId: true,
      loadId: true,
      uploadedById: true,
      createdAt: true,
    },
  });

  const [loads, cases, uploaders] = await Promise.all([
    prisma.load.findMany({
      where: { orgId: user.orgId, id: { in: rows.flatMap((row) => (row.loadId ? [row.loadId] : [])) } },
      select: { id: true, loadRef: true },
    }),
    prisma.verifyCase.findMany({
      where: { orgId: user.orgId, id: { in: rows.flatMap((row) => (row.caseId ? [row.caseId] : [])) } },
      select: { id: true, counterparty: true },
    }),
    prisma.user.findMany({
      where: { orgId: user.orgId, id: { in: rows.flatMap((row) => (row.uploadedById ? [row.uploadedById] : [])) } },
      select: { id: true, name: true },
    }),
  ]);
  const loadRef = new Map(loads.map((load) => [load.id, load.loadRef]));
  const counterparty = new Map(cases.map((kase) => [kase.id, kase.counterparty]));
  const uploader = new Map(uploaders.map((member) => [member.id, member.name]));

  return json({
    documents: rows.map(({ uploadedById, ...row }) => ({
      ...row,
      loadRef: row.loadId ? (loadRef.get(row.loadId) ?? null) : null,
      counterparty: row.caseId ? (counterparty.get(row.caseId) ?? null) : null,
      uploadedBy: uploadedById ? (uploader.get(uploadedById) ?? null) : null,
    })),
  });
}
