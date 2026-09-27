import { requireUser } from "@/lib/auth";
import { FocusRefusal, issueFocusChallenge } from "@/lib/focus";
import { isFocusAction } from "@/lib/focus-model";
import { badRequest, forbidden, json, unauthorized } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

/** Issues a one-use WebAuthn challenge for a duty action the server currently allows. */
export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  if (user.id !== id || user.role !== "driver") return forbidden("Only that driver can start this authentication.");

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }
  if (!isFocusAction(body.action)) return badRequest("action is not a focus duty action.");
  if (typeof body.loadId !== "string" || !body.loadId) return badRequest("loadId is required.");
  try {
    const issued = await issueFocusChallenge({
      orgId: user.orgId,
      actorId: user.id,
      driverId: id,
      loadId: body.loadId,
      action: body.action,
      targetStatus: body.targetStatus,
      reason: body.reason,
      facility: body.facility,
      sealNumber: body.sealNumber,
    });
    return json(issued);
  } catch (error) {
    if (error instanceof FocusRefusal) return json(error.body, error.status);
    throw error;
  }
}
