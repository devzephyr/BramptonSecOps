import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { badRequest, json, notFound, unauthorized } from "@/lib/http";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const targetId = new URL(request.url).searchParams.get("userId");
  if (!targetId) return badRequest("userId is required.");

  const target = await prisma.user.findFirst({
    where: { id: targetId, orgId: user.orgId },
    include: {
      signalIdentity: true,
      signalSignedPreKeys: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!target?.signalIdentity || target.signalSignedPreKeys.length === 0) {
    return notFound("No encryption keys for that user yet.");
  }

  const oneTime = await prisma.signalOneTimePreKey.findFirst({
    where: { userId: target.id },
    orderBy: { createdAt: "asc" },
  });
  if (oneTime) {
    await prisma.signalOneTimePreKey.delete({ where: { id: oneTime.id } });
  }

  const signed = target.signalSignedPreKeys[0];
  return json({
    userId: target.id,
    registrationId: target.signalIdentity.registrationId,
    identityKey: target.signalIdentity.identityKey,
    signedPreKey: {
      keyId: signed.keyId,
      publicKey: signed.publicKey,
      signature: signed.signature,
    },
    oneTimePreKey: oneTime
      ? { keyId: oneTime.keyId, publicKey: oneTime.publicKey }
      : null,
  });
}
