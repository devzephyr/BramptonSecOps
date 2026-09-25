import { findAccount } from "@/lib/auth";
import { badRequest, forbidden, json, notFound } from "@/lib/http";
import { verifyRegistration } from "@/lib/webauthn";

export async function POST(request: Request) {
  if (process.env.DEMO_ENROLL !== "true") {
    return forbidden("Demo enrollment is disabled.");
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const { username, org } = body;
  if (typeof username !== "string" || typeof org !== "string") {
    return badRequest("username and org are required.");
  }
  if (!body.response) return badRequest("response is required.");

  const user = await findAccount(username, org);
  if (!user) return notFound("No account matches that username and organization.");

  try {
    await verifyRegistration({ userId: user.id, response: body.response });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Registration failed.";
    return badRequest(message);
  }

  return json({ ok: true, userId: user.id });
}
