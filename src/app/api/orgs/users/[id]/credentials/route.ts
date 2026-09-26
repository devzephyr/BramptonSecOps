import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { MANAGERS } from "@/lib/policy";
import { badRequest, forbidden, json, notFound, unauthorized } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

async function orgMember(orgId: string, id: string) {
  return prisma.user.findFirst({
    where: { id, orgId },
    select: { id: true, role: true },
  });
}

export async function GET(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, MANAGERS)) {
    return forbidden("Only managers can see credentials.");
  }
  const { id } = await params;
  if (!(await orgMember(user.orgId, id))) return notFound();

  const rows = await prisma.webAuthnCredential.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      transports: true,
      deviceType: true,
      backedUp: true,
    },
  });
  return json({ credentials: rows });
}

export async function DELETE(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, MANAGERS)) {
    return forbidden("Only managers can revoke credentials.");
  }
  const { id } = await params;
  const target = await orgMember(user.orgId, id);
  if (!target) return notFound();
  if (
    (target.role === "admin" || target.role === "logistics") &&
    target.id !== user.id &&
    user.role !== "admin"
  ) {
    return forbidden("Only an admin can revoke an approver's passkey.");
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }
  const credentialId = body.credentialId;
  if (typeof credentialId !== "string") {
    return badRequest("credentialId is required.");
  }

  const deleted = await prisma.webAuthnCredential.deleteMany({
    where: { id: credentialId, userId: id },
  });
  if (deleted.count === 0) return notFound();
  return json({ ok: true });
}
