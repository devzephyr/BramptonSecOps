import { badRequest, json } from "@/lib/http";
import { signSession, writeSessionCookie } from "@/lib/session";
import { verifyAssertion } from "@/lib/webauthn";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }
  if (!body.response) return badRequest("response is required.");

  try {
    const verification = (await verifyAssertion({
      kind: "sign-in",
      response: body.response,
    })) as Awaited<ReturnType<typeof verifyAssertion>> & {
      credentialRow: {
        id: string;
        user: {
          id: string;
          orgId: string;
          role: string;
          name: string;
          email: string;
        };
      };
    };

    const signedIn = verification.credentialRow.user;
    const token = await signSession({
      sub: signedIn.id,
      orgId: signedIn.orgId,
      role: signedIn.role,
      cid: verification.credentialRow.id,
    });
    await writeSessionCookie(token);

    return json({
      ok: true,
      user: {
        id: signedIn.id,
        name: signedIn.name,
        email: signedIn.email,
        role: signedIn.role,
        orgId: signedIn.orgId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign-in failed.";
    return badRequest(message);
  }
}
