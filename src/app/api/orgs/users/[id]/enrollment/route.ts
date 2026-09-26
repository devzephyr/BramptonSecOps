import { prisma } from "@/lib/db";
import { enrollmentExpiry, hasRole, newEnrollmentCode, requireUser } from "@/lib/auth";
import { badRequest, forbidden, json, notFound, unauthorized } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, ["manager", "admin"])) {
    return forbidden("Only managers can issue enrollment codes.");
  }
  const { id } = await params;

  const target = await prisma.user.findFirst({
    where: { id, orgId: user.orgId },
    select: { id: true, role: true, username: true },
  });
  if (!target) return notFound();
  if (target.role === "admin" && user.role !== "admin") {
    return forbidden("Only an admin can issue codes for another admin.");
  }

  const { code, hash } = newEnrollmentCode();
  await prisma.user.update({
    where: { id: target.id },
    data: { enrollmentTokenHash: hash, enrollmentTokenExpires: enrollmentExpiry() },
  });
  return json({ username: target.username, code }, 201);
}
