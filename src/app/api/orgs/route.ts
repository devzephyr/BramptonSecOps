import { prisma } from "@/lib/db";
import { badRequest, json } from "@/lib/http";

function slugify(name: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "org";
  return base;
}

function validUsername(value: unknown): value is string {
  return (
    typeof value === "string" && /^[a-z0-9._-]{3,32}$/.test(value.trim().toLowerCase())
  );
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim().slice(0, 80) : "";
  const province = typeof body.province === "string" ? body.province.trim().slice(0, 8) : "";
  if (name.length < 2 || name.length > 80) {
    return badRequest("Organization name must be 2 to 80 characters.");
  }
  if (displayName.length < 2 || displayName.length > 80) {
    return badRequest("Your name must be 2 to 80 characters.");
  }
  if (!validUsername(body.username)) {
    return badRequest("Username must be 3 to 32 characters: letters, numbers, dot, dash, underscore.");
  }
  const username = (body.username as string).trim().toLowerCase();

  const base = slugify(name);
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const org = await prisma.org.create({
        data: {
          slug,
          name,
          city,
          province,
          users: {
            create: {
              username,
              email: `${username}@${slug}.invalid`,
              name: displayName,
              role: "admin",
              title: "Owner",
            },
          },
        },
      });
      return json(
        {
          org: { id: org.id, slug: org.slug, name: org.name },
          username,
        },
        201,
      );
    } catch (err) {
      const conflict =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002";
      if (!conflict || attempt === 4) throw err;
    }
  }
  return badRequest("Could not pick an organization slug. Try a different name.");
}
