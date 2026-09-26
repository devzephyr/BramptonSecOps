import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { CASE_STAFF } from "@/lib/policy";
import { badRequest, forbidden, json, notFound, unauthorized } from "@/lib/http";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, CASE_STAFF)) return forbidden("Only supplier or manager staff can view cases.");

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
      signalIdentity: { select: { deviceId: true, identityKey: true } },
    },
  });
  return json({
    participants: staff.map((row) => ({
      userId: row.id,
      name: row.name,
      role: row.role,
      devices: row.signalIdentity
        .slice()
        .sort((a, b) => a.deviceId - b.deviceId)
        .map((key) => ({
          deviceId: key.deviceId,
          hasKeys: true,
          identityKey: key.identityKey,
        })),
    })),
  });
}
