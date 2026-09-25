import type { Role, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/session";

export type AuthedUser = User & {
  org: { id: string; name: string; slug: string };
};

export async function requireUser(): Promise<AuthedUser | null> {
  const session = await readSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { org: { select: { id: true, name: true, slug: true } } },
  });
  if (!user || user.orgId !== session.orgId) return null;
  return user;
}

export function hasRole(user: { role: Role }, allowed: Role[]) {
  return allowed.includes(user.role);
}

export async function findAccount(username: string, org: string) {
  const handle = username.trim().toLowerCase();
  const orgKey = org.trim();
  if (!handle || !orgKey) return null;
  const orgRow = await prisma.org.findFirst({
    where: {
      OR: [
        { slug: orgKey },
        { name: { equals: orgKey, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (!orgRow) return null;
  return prisma.user.findFirst({
    where: {
      orgId: orgRow.id,
      username: { equals: handle, mode: "insensitive" },
    },
    include: { org: { select: { id: true, name: true, slug: true } } },
  });
}
