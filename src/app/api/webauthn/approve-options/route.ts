import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { oobComplete, parseOobAck } from "@/lib/cases";
import { approvalProgress, sameUserAlreadyApproved } from "@/lib/policy";
import {
  badRequest,
  forbidden,
  json,
  notFound,
  unauthorized,
} from "@/lib/http";
import { authenticationOptions, approvalChallenge } from "@/lib/webauthn";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, ["logistics", "admin"])) {
    return forbidden("Only logistics or admin or admin can approve.");
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const caseId = body.caseId;
  if (typeof caseId !== "string") return badRequest("caseId is required.");

  const row = await prisma.verifyCase.findFirst({
    where: { id: caseId, orgId: user.orgId },
  });
  if (!row || row.revokedAt) return notFound();
  if (row.status === "fully_approved") {
    return forbidden("This case is already approved.");
  }
  if (row.createdById === user.id) {
    return forbidden("The person who opened a case cannot approve it.");
  }

  const steps = Array.isArray(row.oobStepsJson)
    ? (row.oobStepsJson as string[])
    : [];
  const ack = parseOobAck(row.oobAckJson, steps.length);
  if (!oobComplete(ack.steps, ack.note)) {
    return forbidden("Finish the out-of-band checklist and note first.");
  }

  const prior = await prisma.approvalAttestation.findMany({
    where: { caseId: row.id, payloadHash: row.payloadHash },
    select: { userId: true },
  });
  const approverIds = prior.map((item) => item.userId);
  if (sameUserAlreadyApproved(approverIds, user.id)) {
    return forbidden(
      "You already attested this payload. A different person must sign.",
    );
  }

  const progress = approvalProgress({
    dualControl: row.dualControl,
    approverIds,
  });
  if (progress === "complete") {
    return forbidden("This payload already has enough approvers.");
  }

  const credentials = await prisma.webAuthnCredential.findMany({
    where: { userId: user.id },
  });
  if (!credentials.length) {
    return badRequest("Register a passkey for this user before approving.");
  }

  const nonce = randomBytes(16).toString("base64url");
  const digest = approvalChallenge(row.payloadCanonical, nonce);
  const options = await authenticationOptions({
    kind: "approve",
    customChallenge: digest,
    allowCredentials: credentials.map((row) => ({
      id: row.credentialId,
      transports: row.transports,
    })),
  });

  const ceremony = await prisma.pendingCeremony.create({
    data: {
      orgId: user.orgId,
      caseId: row.id,
      userId: user.id,
      nonce,
      challenge: options.challenge,
      payloadHash: row.payloadHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  return json({
    ceremonyId: ceremony.id,
    optionsJSON: options,
  });
}
