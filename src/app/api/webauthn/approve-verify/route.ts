import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { lockCase, notifyApprovers, oobComplete, parseOobAck } from "@/lib/cases";
import {
  approvalProgress,
  MANAGERS,
  redactValue,
  sameUserAlreadyApproved,
} from "@/lib/policy";
import { applyApprovedCaseToLoad, isLoadAffectingType } from "@/lib/loads";
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
  if (!hasRole(user, MANAGERS)) {
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
    return badRequest("This approval has expired. Start the approval again.");
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
    return forbidden("Approving needs your fingerprint, face, or device PIN. Try again and confirm on your device.");
  }

  const response = body.response as {
    id: string;
    response: {
      clientDataJSON: string;
      authenticatorData: string;
      signature: string;
    };
  };

  let outcome: { status: string; approverCount: number; receiptToken: string | null } | Response;
  try {
    outcome = await prisma.$transaction(
      async (tx) => {
      if (!(await lockCase(tx, ceremony.caseId, user.orgId))) return notFound();

      const now = new Date();
      const burned = await tx.pendingCeremony.updateMany({
        where: { id: ceremony.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (burned.count !== 1) return badRequest("This approval was already used or has expired. Start the approval again.");

      const row = await tx.verifyCase.findFirst({
        where: { id: ceremony.caseId, orgId: user.orgId },
        include: { org: true },
      });
      if (!row || row.revokedAt) return notFound();
      if (row.status === "fully_approved") return forbidden("This case is already approved.");
      if (row.payloadHash !== ceremony.payloadHash) {
        return badRequest("The request changed after the approval started. Review it again.");
      }
      if (row.createdById === user.id) {
        return forbidden("The person who opened a case cannot approve it.");
      }

      const steps = Array.isArray(row.oobStepsJson) ? (row.oobStepsJson as string[]) : [];
      const ack = parseOobAck(row.oobAckJson, steps.length);
      if (!oobComplete(ack.steps, ack.note)) {
        return forbidden("Finish the call steps and write who you spoke with first.");
      }

      const prior = await tx.approvalAttestation.findMany({
        where: { caseId: row.id, payloadHash: row.payloadHash },
        select: { userId: true },
      });
      const priorIds = prior.map((item) => item.userId);
      if (sameUserAlreadyApproved(priorIds, user.id)) {
        return forbidden("You have already approved this request. A different person must approve it.");
      }
      if (approvalProgress({ dualControl: row.dualControl, approverIds: priorIds }) === "complete") {
        return forbidden("This request already has all the approvals it needs.");
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
        if (status === "pending_second") {
          await notifyApprovers(tx, {
            orgId: user.orgId,
            exclude: [...distinctIds, row.createdById],
            kind: "case_second_approval",
            requestType: row.requestType,
            counterparty: row.counterparty,
            body: `${user.name} approved it. A second person needs to approve the same request.`,
          });
        }
        return { status, approverCount: distinctIds.length, receiptToken: null };
      }

      if (isLoadAffectingType(row.requestType) && !row.loadId) {
        throw new Error(
          "This request needs a load before it can be fully approved. Open a new change request and pick the load.",
        );
      }

      await applyApprovedCaseToLoad(tx, {
        orgId: user.orgId,
        loadId: row.loadId,
        requestType: row.requestType,
        requestedJson: row.requestedJson,
        payloadHash: row.payloadHash,
        counterparty: row.counterparty,
        actorId: user.id,
        actorName: user.name,
      });

      const receiptToken = randomToken("v");
      const claims = {
        requestType: row.requestType,
        payloadHash: row.payloadHash,
        matchesUploaded: row.matchesUploaded,
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
        data: { status: "fully_approved", publicToken: receiptToken },
      });

      return { status: "fully_approved", approverCount: distinctIds.length, receiptToken };
    },
      { timeout: 15000 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approval failed.";
    if (
      message.includes("needs a load") ||
      message.includes("load fields") ||
      message.includes("load for this request")
    ) {
      return badRequest(message);
    }
    throw error;
  }

  if (outcome instanceof Response) return outcome;
  return json({ ok: true, ...outcome });
}
