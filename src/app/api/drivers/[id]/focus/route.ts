import { hasRole, requireUser } from "@/lib/auth";
import { FocusRefusal, getDriverFocusState } from "@/lib/focus";
import { badRequest, forbidden, json, unauthorized } from "@/lib/http";
import { MANAGERS } from "@/lib/policy";

type Params = { params: Promise<{ id: string }> };

/** Authoritative cab state. Does not change the session. */
export async function GET(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  if (user.role === "driver" && user.id !== id) return forbidden("You can only read your own focus state.");
  if (user.role !== "driver" && !hasRole(user, MANAGERS)) return forbidden("You cannot read this focus state.");
  const loadId = new URL(request.url).searchParams.get("loadId");
  if (!loadId) return badRequest("loadId is required.");
  try {
    return json(await getDriverFocusState({ orgId: user.orgId, driverId: id, loadId }));
  } catch (error) {
    if (error instanceof FocusRefusal) return json(error.body, error.status);
    throw error;
  }
}
