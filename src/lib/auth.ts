import type { Role, User } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
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

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newEnrollmentCode(): { code: string; hash: string } {
  let raw = "";
  const bytes = randomBytes(12);
  for (const byte of bytes) raw += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  const hash = createHash("sha256").update(code).digest("hex");
  return { code, hash };
}

export function enrollmentExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

export function hashEnrollmentCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
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
