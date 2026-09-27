import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticatorTransport,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
  type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/db";
import { challengeBytes, sha256Hex } from "@/lib/canonical";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function rpID() {
  if (process.env.WEBAUTHN_RP_ID) return process.env.WEBAUTHN_RP_ID;
  const origin = process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3000";
  return new URL(origin).hostname;
}

export function expectedOrigin() {
  return process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3000";
}

export function challengeExpiry() {
  return new Date(Date.now() + CHALLENGE_TTL_MS);
}

export async function storeChallenge(input: {
  kind: string;
  challenge: string;
  userId?: string | null;
}) {
  await prisma.webAuthnChallenge.create({
    data: {
      kind: input.kind,
      challenge: input.challenge,
      userId: input.userId ?? null,
      expiresAt: challengeExpiry(),
    },
  });
}

export async function markChallengeUsed(challenge: string, kind: string) {
  const now = new Date();
  const result = await prisma.webAuthnChallenge.updateMany({
    where: {
      challenge,
      kind,
      usedAt: null,
      expiresAt: { gt: now },
    },
    data: { usedAt: now },
  });
  return result.count === 1;
}

export async function registrationOptions(user: {
  id: string;
  email: string;
  name: string;
}) {
  const existing = await prisma.webAuthnCredential.findMany({
    where: { userId: user.id },
  });
  const options = await generateRegistrationOptions({
    rpName: "SupplyChek",
    rpID: rpID(),
    userName: user.email,
    userDisplayName: user.name,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: existing.map((row) => ({
      id: row.credentialId,
      transports: row.transports
        ? (row.transports.split(",") as AuthenticatorTransport[])
        : undefined,
    })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
  });
  await storeChallenge({
    kind: "register",
    challenge: options.challenge,
    userId: user.id,
  });
  return options;
}

export async function verifyRegistration(input: {
  userId: string;
  response: unknown;
  /** When set, the matching unexpired enrollment code is consumed with the credential write. */
  enrollmentHash?: string;
}) {
  const body = input.response as RegistrationResponseJSON;
  const clientData = JSON.parse(
    Buffer.from(body.response.clientDataJSON, "base64url").toString("utf8"),
  ) as { challenge?: string };
  const challenge = clientData.challenge;
  if (!challenge) throw new Error("Challenge missing.");
  const issued = await prisma.webAuthnChallenge.findFirst({
    where: { challenge, kind: "register", usedAt: null },
  });
  if (!issued || issued.userId !== input.userId) {
    throw new Error("Challenge expired or already used.");
  }
  if (!(await markChallengeUsed(challenge, "register"))) {
    throw new Error("Challenge expired or already used.");
  }
  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge: challenge,
    expectedOrigin: expectedOrigin(),
    expectedRPID: rpID(),
    requireUserVerification: true,
  });
  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Registration could not be verified.");
  }
  const { credential, aaguid, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;
  await prisma.$transaction(async (tx) => {
    if (input.enrollmentHash) {
      const consumed = await tx.user.updateMany({
        where: {
          id: input.userId,
          enrollmentTokenHash: input.enrollmentHash,
          enrollmentTokenExpires: { gt: new Date() },
        },
        data: { enrollmentTokenHash: null, enrollmentTokenExpires: null },
      });
      if (consumed.count !== 1) throw new Error("Enrollment code already used or expired.");
    }
    await tx.webAuthnCredential.create({
      data: {
        userId: input.userId,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString("base64"),
        counter: credential.counter,
        transports: credential.transports?.join(",") ?? null,
        aaguid: aaguid ?? null,
        deviceType: credentialDeviceType ?? null,
        backedUp: credentialBackedUp ?? false,
      },
    });
  });
  return verification;
}

export async function authenticationOptions(input: {
  kind: "sign-in" | "approve";
  allowCredentials?: { id: string; transports?: string | null }[];
  customChallenge?: Uint8Array;
}) {
  const options = await generateAuthenticationOptions({
    rpID: rpID(),
    userVerification: "required",
    challenge: input.customChallenge
      ? new Uint8Array(input.customChallenge)
      : undefined,
    allowCredentials: input.allowCredentials?.map((row) => ({
      id: row.id,
      transports: row.transports
        ? (row.transports.split(",") as AuthenticatorTransport[])
        : undefined,
    })),
  });
  await storeChallenge({
    kind: input.kind,
    challenge: options.challenge,
  });
  return options;
}

export async function verifyAssertion(input: {
  kind: "sign-in" | "approve";
  response: unknown;
  expectedChallenge?: string;
  userId?: string;
}): Promise<VerifiedAuthenticationResponse> {
  const body = input.response as AuthenticationResponseJSON;
  const clientData = JSON.parse(
    Buffer.from(body.response.clientDataJSON, "base64url").toString("utf8"),
  ) as { challenge?: string };
  const challenge = input.expectedChallenge ?? clientData.challenge;
  if (!challenge || !(await markChallengeUsed(challenge, input.kind))) {
    throw new Error("Challenge expired or already used.");
  }
  const stored = await prisma.webAuthnCredential.findUnique({
    where: { credentialId: body.id },
    include: { user: true },
  });
  if (!stored) throw new Error("Unknown credential.");
  if (input.userId && stored.userId !== input.userId) {
    throw new Error("That passkey belongs to a different account.");
  }
  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge: challenge,
    expectedOrigin: expectedOrigin(),
    expectedRPID: rpID(),
    credential: {
      id: stored.credentialId,
      publicKey: new Uint8Array(Buffer.from(stored.publicKey, "base64")),
      counter: stored.counter,
      transports: stored.transports
        ? (stored.transports.split(",") as AuthenticatorTransport[])
        : undefined,
    },
    requireUserVerification: true,
  });
  if (!verification.verified || !verification.authenticationInfo) {
    throw new Error("Assertion could not be verified.");
  }
  if (!verification.authenticationInfo.userVerified) {
    throw new Error("Confirm with your fingerprint, face, or device PIN to continue.");
  }
  await prisma.webAuthnCredential.update({
    where: { id: stored.id },
    data: { counter: verification.authenticationInfo.newCounter },
  });
  return Object.assign(verification, { credentialRow: stored });
}

export function approvalChallenge(canonical: string, nonce: string) {
  return challengeBytes(canonical, nonce);
}

export function assertionHash(input: {
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
}) {
  return sha256Hex(
    `${input.clientDataJSON}.${input.authenticatorData}.${input.signature}`,
  );
}
