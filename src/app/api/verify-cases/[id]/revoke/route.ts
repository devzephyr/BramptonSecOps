import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { MANAGERS } from "@/lib/policy";
import { lockCase } from "@/lib/cases";
import { forbidden, json, notFound, unauthorized } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, MANAGERS)) {
    return forbidden("Only a manager or admin can revoke a case.");
  }

  const { id } = await params;
  const now = new Date();
  const revoked = await prisma.$transaction(async (tx) => {
    if (!(await lockCase(tx, id, user.orgId))) return false;
    await tx.verifyCase.update({
      where: { id },
      data: { status: "revoked", revokedAt: now },
    });
    await tx.verifyReceipt.updateMany({
      where: { caseId: id, revokedAt: null },
      data: { revokedAt: now },
    });
    await tx.pendingCeremony.updateMany({
      where: { caseId: id, usedAt: null },
      data: { usedAt: now },
    });
    return true;
  });
  if (!revoked) return notFound();

  return json({ id, status: "revoked", revokedAt: now.toISOString() });
}
