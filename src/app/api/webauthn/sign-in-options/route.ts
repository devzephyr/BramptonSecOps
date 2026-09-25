import { findAccount } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { badRequest, json, notFound } from "@/lib/http";
import { authenticationOptions } from "@/lib/webauthn";

const NO_ACCOUNT = "No account matches that username and organization.";

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    if (request.headers.get("content-length") !== "0") {
      body = (await request.json()) as Record<string, unknown>;
    }
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const { username, org } = body;
  if (typeof username !== "string" || typeof org !== "string") {
    return badRequest("username and org are required.");
  }

  const user = await findAccount(username, org);
  if (!user) return notFound(NO_ACCOUNT);

  const credentials = await prisma.webAuthnCredential.findMany({
    where: { userId: user.id },
    select: { credentialId: true, transports: true },
  });
  if (credentials.length === 0) {
    return json({ hasPasskey: false });
  }

  const options = await authenticationOptions({
    kind: "sign-in",
    allowCredentials: credentials.map((row) => ({
      id: row.credentialId,
      transports: row.transports,
    })),
  });
  return json({ hasPasskey: true, optionsJSON: options });
}
