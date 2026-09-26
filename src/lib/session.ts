import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "sc_session";

export type SessionClaims = {
  sub: string;
  orgId: string;
  role: string;
  /** WebAuthnCredential row id used to sign in; revoking it ends the session. */
  cid: string;
};

function secret() {
  const raw = process.env.SESSION_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters.");
  }
  return new TextEncoder().encode(raw);
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function readSession(): Promise<SessionClaims | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.orgId !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.cid !== "string"
    ) {
      return null;
    }
    return { sub: payload.sub, orgId: payload.orgId, role: payload.role, cid: payload.cid };
  } catch {
    return null;
  }
}

export async function writeSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure:
      process.env.NODE_ENV === "production" &&
      !process.env.WEBAUTHN_ORIGIN?.startsWith("http://"),
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
