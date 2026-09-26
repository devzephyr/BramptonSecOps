import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { lockCase, oobComplete, parseOobAck } from "@/lib/cases";
import {
  approvalProgress,
  redactValue,
  sameUserAlreadyApproved,
} from "@/lib/policy";
import { signReceipt } from "@/lib/receipt";
import { randomToken } from "@/lib/tokens";
import {
  badRequest,
  forbidden,
  json,
  notFound,
  unauthorized,
} from "@/lib/http";
import { assertionHash, verifyAssertion } from "@/lib/webauthn";

function redactMap(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== "string") continue;
    out[key] = redactValue(key, raw);
  }
  return out;
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, ["manager", "admin"])) {
    return forbidden("Only a manager or admin can approve.");
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const ceremonyId = body.ceremonyId;
  if (typeof ceremonyId !== "string") {
    return badRequest("ceremonyId is required.");
  }
  if (!body.response) return badRequest("response is required.");

  const ceremony = await prisma.pendingCeremony.findFirst({
    where: { id: ceremonyId, userId: user.id, orgId: user.orgId },
  });
  if (!ceremony || ceremony.usedAt || ceremony.expiresAt < new Date()) {
    return badRequest("Approval ceremony expired or unknown.");
  }

  let verification: Awaited<ReturnType<typeof verifyAssertion>>;
  try {
    verification = await verifyAssertion({
      kind: "approve",
      response: body.response,
      expectedChallenge: ceremony.challenge,
      userId: user.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approval failed.";
    return badRequest(message);
  }
  if (!verification.authenticationInfo?.userVerified) {
    return forbidden("User verification is required for approval.");
  }

  const response = body.response as {
    id: string;
    response: {
      clientDataJSON: string;
      authenticatorData: string;
      signature: string;
    };
  };

  const outcome = await prisma.$transaction(
    async (tx) => {
      if (!(await lockCase(tx, ceremony.caseId, user.orgId))) return notFound();

      const now = new Date();
      const burned = await tx.pendingCeremony.updateMany({
        where: { id: ceremony.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (burned.count !== 1) return badRequest("Approval ceremony already used or expired.");

      const row = await tx.verifyCase.findFirst({
        where: { id: ceremony.caseId, orgId: user.orgId },
        include: { org: true },
      });
      if (!row || row.revokedAt) return notFound();
      if (row.status === "fully_approved") return forbidden("This case is already approved.");
      if (row.payloadHash !== ceremony.payloadHash) {
        return badRequest("Payload changed since this ceremony started. Review it again.");
      }
      if (row.createdById === user.id) {
        return forbidden("The person who opened a case cannot approve it.");
      }

      const steps = Array.isArray(row.oobStepsJson) ? (row.oobStepsJson as string[]) : [];
      const ack = parseOobAck(row.oobAckJson, steps.length);
      if (!oobComplete(ack.steps, ack.note)) {
        return forbidden("Out-of-band checklist is not complete.");
      }

      const prior = await tx.approvalAttestation.findMany({
        where: { caseId: row.id, payloadHash: row.payloadHash },
        select: { userId: true },
      });
      const priorIds = prior.map((item) => item.userId);
      if (sameUserAlreadyApproved(priorIds, user.id)) {
        return forbidden("You already attested this payload.");
      }
      if (approvalProgress({ dualControl: row.dualControl, approverIds: priorIds }) === "complete") {
        return forbidden("This payload already has enough approvers.");
      }

      await tx.approvalAttestation.create({
        data: {
          orgId: user.orgId,
          caseId: row.id,
          userId: user.id,
          payloadHash: row.payloadHash,
          challenge: ceremony.challenge,
          credentialId: response.id,
          clientDataJSON: response.response.clientDataJSON,
          authenticatorData: response.response.authenticatorData,
          signature: response.response.signature,
          aaguid: null,
          signCount: verification.authenticationInfo.newCounter,
          uv: verification.authenticationInfo.userVerified,
          assertionHash: assertionHash(response.response),
        },
      });

      const all = await tx.approvalAttestation.findMany({
        where: { caseId: row.id, payloadHash: row.payloadHash },
        include: { user: true },
        orderBy: { verifiedAt: "asc" },
      });
      const distinctIds = [...new Set(all.map((item) => item.userId))];
      const progress = approvalProgress({ dualControl: row.dualControl, approverIds: distinctIds });

      if (progress !== "complete") {
        const status = progress === "need_second" ? "pending_second" : "pending_approval";
        await tx.verifyCase.update({ where: { id: row.id }, data: { status } });
        return { status, approverCount: distinctIds.length, receiptToken: null };
      }

      const receiptToken = randomToken("v");
      const claims = {
        requestType: row.requestType,
        payloadHash: row.payloadHash,
        matchesUploaded: true,
        dualControl: row.dualControl,
        uv: true,
        approvers: all.map((item) => ({
          role: item.user.role,
          name: item.user.name,
          approvedAt: item.verifiedAt.toISOString(),
        })),
        org: row.org.name,
        counterparty: row.counterparty,
        oobNote: ack.note,
        onFile: redactMap(row.onFileJson),
        requested: redactMap(row.requestedJson),
      };
      const { jws, kid } = await signReceipt(claims, row.id);
      await tx.verifyReceipt.create({
        data: {
          orgId: user.orgId,
          caseId: row.id,
          token: receiptToken,
          jws,
          jwksKid: kid,
          claimsJson: claims,
        },
      });
      await tx.verifyCase.update({
        where: { id: row.id },
        data: { status: "fully_approved", publicToken: receiptToken, matchesUploaded: true },
      });
      return { status: "fully_approved", approverCount: distinctIds.length, receiptToken };
    },
    { timeout: 15000 },
  );

  if (outcome instanceof Response) return outcome;
  return json({ ok: true, ...outcome });
}
