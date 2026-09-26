import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { badRequest, forbidden, isUniqueViolation, json, unauthorized } from "@/lib/http";

const ROLES = ["supplier", "logistics", "warehouse", "driver", "receiver", "admin"] as const;

function validUsername(value: unknown): value is string {
  return (
    typeof value === "string" && /^[a-z0-9._-]{3,32}$/.test(value.trim().toLowerCase())
  );
}

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, ["logistics", "admin"])) {
    return forbidden("Only logistics staff can see the team.");
  }

  const rows = await prisma.user.findMany({
    where: { orgId: user.orgId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      title: true,
      createdAt: true,
      signalIdentity: { select: { deviceId: true } },
    },
  });
  return json({
    users: rows.map((row) => ({
      id: row.id,
      username: row.username,
      name: row.name,
      role: row.role,
      title: row.title,
      hasKeys: row.signalIdentity.length > 0,
      devices: row.signalIdentity.length,
      createdAt: row.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, ["logistics", "admin"])) {
    return forbidden("Only logistics staff can add teammates.");
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const role = typeof body.role === "string" ? body.role : "";
  if (name.length < 2 || name.length > 80) {
    return badRequest("Name must be 2 to 80 characters.");
  }
  if (!(ROLES as readonly string[]).includes(role)) {
    return badRequest("Role must be supplier, logistics, warehouse, driver, receiver, or admin.");
  }
  if ((role === "admin" || role === "logistics") && user.role !== "admin") {
    return forbidden("Only an admin can add approvers (logistics or admins).");
  }
  if (!validUsername(body.username)) {
    return badRequest("Username must be 3 to 32 characters: letters, numbers, dot, dash, underscore.");
  }
  const username = (body.username as string).trim().toLowerCase();

  const created = await prisma.user
    .create({
      data: {
        orgId: user.orgId,
        username,
        email: `${username}@${user.org.slug}.invalid`,
        name,
        role: role as (typeof ROLES)[number],
        title: typeof body.title === "string" ? body.title.trim().slice(0, 80) || null : null,
      },
      select: { id: true, username: true, name: true, role: true, title: true },
    })
    .catch((error: unknown) => {
      if (isUniqueViolation(error)) return null;
      throw error;
    });
  if (!created) return badRequest("That username is already taken in your organization.");
  return json(created, 201);
}
