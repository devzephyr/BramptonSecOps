import { requireUser } from "@/lib/auth";
import { FocusRefusal, verifyFocusChallenge } from "@/lib/focus";
import { badRequest, forbidden, json, unauthorized } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

/**
 * Verifies the passkey and performs the action stored on the ceremony.
 * An action name in this body is not authority.
 */
export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  if (user.id !== id || user.role !== "driver") return forbidden("Only that driver can finish this authentication.");

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }
  if (typeof body.ceremonyId !== "string" || !body.ceremonyId || body.response == null) {
    return badRequest("ceremonyId and response are required.");
  }
  try {
    const state = await verifyFocusChallenge({
      orgId: user.orgId,
      actorId: user.id,
      driverId: id,
      ceremonyId: body.ceremonyId,
      response: body.response,
    });
    return json(state);
  } catch (error) {
    if (error instanceof FocusRefusal) return json(error.body, error.status);
    throw error;
  }
}
