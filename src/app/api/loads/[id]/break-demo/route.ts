import { requireUser } from "@/lib/auth";
import { confirmBreakRest, restartBreakDemo } from "@/lib/break-demo";
import { badRequest, forbidden, json, unauthorized } from "@/lib/http";
import { DRIVING_LIMIT_MS } from "@/lib/hos";

type Params = { params: Promise<{ id: string }> };

/** Temporary. Restarts the parked break snapshot, or records the rest. Neither signs the driver out. */
export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (user.role !== "driver") return forbidden("Only the driver can update this sim.");
  const { id } = await params;
  let action = "restart";
  let remainingMs = 10 * 60 * 1000;
  try {
    const body = (await request.json()) as { action?: unknown; remainingMs?: unknown };
    if (body.action === "confirm") action = "confirm";
    if (typeof body.remainingMs === "number" && Number.isFinite(body.remainingMs)) remainingMs = body.remainingMs;
  } catch {
    action = "restart";
  }
  try {
    if (action === "confirm") await confirmBreakRest(user.orgId, user.id, id);
    else await restartBreakDemo(user.orgId, user.id, id, Math.min(Math.max(remainingMs, 0), DRIVING_LIMIT_MS));
    return json({ ok: true });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Could not update the break sim.");
  }
}
