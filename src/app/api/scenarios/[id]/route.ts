import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { forbidden, json, notFound, unauthorized } from "@/lib/http";
import { MANAGERS } from "@/lib/policy";

type Params = { params: Promise<{ id: string }> };

/** The author can delete their own scenario; logistics and admins can delete any in the org. */
export async function DELETE(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const scenario = await prisma.scenario.findFirst({ where: { id, orgId: user.orgId }, select: { createdById: true } });
  if (!scenario) return notFound();
  if (scenario.createdById !== user.id && !hasRole(user, MANAGERS)) {
    return forbidden("Only the author or logistics can delete this template.");
  }
  await prisma.scenario.delete({ where: { id } });
  return json({ ok: true });
}
