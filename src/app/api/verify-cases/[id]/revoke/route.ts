import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { forbidden, json, notFound, unauthorized } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, ["manager", "admin"])) {
    return forbidden("Only a manager or admin can revoke a case.");
  }

  const { id } = await params;
  const row = await prisma.verifyCase.findFirst({
    where: { id, orgId: user.orgId },
  });
  if (!row) return notFound();

  const now = new Date();
  await prisma.$transaction([
    prisma.verifyCase.update({
      where: { id: row.id },
      data: { status: "revoked", revokedAt: now },
    }),
    prisma.verifyReceipt.updateMany({
      where: { caseId: row.id, revokedAt: null },
      data: { revokedAt: now },
    }),
  ]);

  return json({ id: row.id, status: "revoked", revokedAt: now.toISOString() });
}
