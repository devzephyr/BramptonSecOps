import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import {
  badRequest,
  forbidden,
  json,
  notFound,
  unauthorized,
} from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

const ROLES: Role[] = ["supplier", "manager", "driver", "receiver", "admin"];
const APPROVER: Role[] = ["manager", "admin"];

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, APPROVER))
    return forbidden("Only managers can edit teammates.");
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const data: { name?: string; title?: string | null; role?: Role } = {};
  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 80)
      return badRequest("Name must be 2 to 80 characters.");
    data.name = name;
  }
  if ("title" in body) {
    if (body.title !== null && typeof body.title !== "string")
      return badRequest("title must be text.");
    data.title = (body.title ?? "").trim().slice(0, 80) || null;
  }
  if ("role" in body) {
    if (typeof body.role !== "string" || !ROLES.includes(body.role as Role)) {
      return badRequest(
        "Role must be supplier, manager, driver, receiver, or admin.",
      );
    }
    data.role = body.role as Role;
  }

  const result = await prisma.$transaction(async (tx) => {
    const target = await tx.user.findFirst({
      where: { id, orgId: user.orgId },
      select: { id: true, role: true, name: true, username: true, title: true },
    });
    if (!target) return notFound();

    const touchesApprover =
      APPROVER.includes(target.role) ||
      (data.role && APPROVER.includes(data.role));
    if (touchesApprover && user.role !== "admin" && target.id !== user.id) {
      return forbidden(
        "Only an admin can edit approvers or grant manager or admin roles.",
      );
    }
    if (data.role && data.role !== target.role) {
      if (target.id === user.id)
        return forbidden("You cannot change your own role. Ask another admin.");
      if (APPROVER.includes(data.role) && user.role !== "admin") {
        return forbidden("Only an admin can grant manager or admin roles.");
      }
      if (target.role === "admin") {
        const admins = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM "User" WHERE "orgId" = ${user.orgId} AND role = 'admin' FOR UPDATE`;
        if (admins.length <= 1)
          return forbidden("The organization needs at least one admin.");
      }
    } else {
      delete data.role;
    }

    return tx.user.update({
      where: { id: target.id },
      data,
      select: { id: true, username: true, name: true, role: true, title: true },
    });
  });

  if (result instanceof Response) return result;
  return json(result);
}
