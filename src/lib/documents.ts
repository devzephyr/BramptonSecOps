import type { Prisma } from "@prisma/client";
import type { AuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasRole } from "@/lib/auth";
import { CASE_STAFF } from "@/lib/policy";

/** Which documents a user may list or download: staff see the whole org, drivers their own loads, receivers any load. */
export async function documentScope(user: AuthedUser): Promise<Prisma.EvidenceAssetWhereInput | null> {
  if (hasRole(user, CASE_STAFF)) return { orgId: user.orgId };
  if (user.role === "receiver") return { orgId: user.orgId, loadId: { not: null } };
  if (user.role === "driver") {
    const loads = await prisma.load.findMany({
      where: { orgId: user.orgId, OR: [{ driverUserId: user.id }, { coDriverUserId: user.id }] },
      select: { id: true },
    });
    return { orgId: user.orgId, loadId: { in: loads.map((load) => load.id) } };
  }
  return null;
}
