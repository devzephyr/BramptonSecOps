import { requireUser } from "@/lib/auth";
import { json, unauthorized } from "@/lib/http";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  return json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.orgId,
      orgName: user.org.name,
      orgSlug: user.org.slug,
    },
  });
}
