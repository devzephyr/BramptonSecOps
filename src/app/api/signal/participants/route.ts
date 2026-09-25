import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { badRequest, json, notFound, unauthorized } from "@/lib/http";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const caseId = new URL(request.url).searchParams.get("caseId");
  if (!caseId) return badRequest("caseId is required.");

  const kase = await prisma.verifyCase.findFirst({
    where: { id: caseId, orgId: user.orgId },
    select: { id: true, createdById: true },
  });
  if (!kase) return notFound();

  const staff = await prisma.user.findMany({
    where: {
      orgId: user.orgId,
      OR: [{ id: kase.createdById }, { role: { in: ["manager", "admin"] } }],
    },
    select: {
      id: true,
      name: true,
      role: true,
      signalIdentity: { select: { identityKey: true } },
    },
  });
  return json({
    participants: staff.map((row) => ({
      userId: row.id,
      name: row.name,
      role: row.role,
      hasKeys: Boolean(row.signalIdentity),
      identityKey: row.signalIdentity?.identityKey ?? null,
    })),
  });
}
