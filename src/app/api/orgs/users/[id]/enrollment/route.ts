import { prisma } from "@/lib/db";
import { enrollmentExpiry, hasRole, newEnrollmentCode, requireUser } from "@/lib/auth";
import { MANAGERS } from "@/lib/policy";
import { forbidden, json, notFound, unauthorized } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, MANAGERS)) {
    return forbidden("Only managers can issue enrollment codes.");
  }
  const { id } = await params;

  const target = await prisma.user.findFirst({
    where: { id, orgId: user.orgId },
    select: { id: true, role: true, username: true },
  });
  if (!target) return notFound();
  if ((target.role === "admin" || target.role === "logistics") && user.role !== "admin") {
    return forbidden("Only an admin can issue codes for approvers.");
  }

  const { code, hash } = newEnrollmentCode();
  await prisma.user.update({
    where: { id: target.id },
    data: { enrollmentTokenHash: hash, enrollmentTokenExpires: enrollmentExpiry() },
  });
  return json({ username: target.username, code }, 201);
}
