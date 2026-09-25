import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { forbidden, json, notFound, unauthorized } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const row = await prisma.notification.findFirst({
    where: { id, orgId: user.orgId },
  });
  if (!row) return notFound();

  const allowed =
    row.userId === user.id || (row.userId === null && row.role === user.role);
  if (!allowed) return forbidden();

  const updated = await prisma.notification.update({
    where: { id: row.id },
    data: { readAt: new Date() },
  });

  return json({ id: updated.id, readAt: updated.readAt });
}
