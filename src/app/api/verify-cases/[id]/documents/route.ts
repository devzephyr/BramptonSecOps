import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, notFound, unauthorized } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const kase = await prisma.verifyCase.findFirst({
    where: { id, orgId: user.orgId },
    select: { id: true },
  });
  if (!kase) return notFound();

  const rows = await prisma.evidenceAsset.findMany({
    where: { orgId: user.orgId, caseId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      contentType: true,
      byteSize: true,
      contentHash: true,
      createdAt: true,
    },
  });
  return json({ documents: rows });
}
