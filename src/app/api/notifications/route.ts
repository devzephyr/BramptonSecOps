import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, unauthorized } from "@/lib/http";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const where: Prisma.NotificationWhereInput = {
    orgId: user.orgId,
    OR: [{ userId: user.id }, { userId: null, role: user.role }],
  };

  const rows = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return json({
    notifications: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      body: row.body,
      href: row.href,
      role: row.role,
      userId: row.userId,
      readAt: row.readAt,
      createdAt: row.createdAt,
      emailStatus: row.emailStatus,
    })),
  });
}
