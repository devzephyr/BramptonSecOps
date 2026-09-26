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
      signalIdentity: { orderBy: { deviceId: "asc" } },
      signalSignedPreKeys: { orderBy: { deviceId: "asc" } },
    },
  });
  if (!target || target.signalIdentity.length === 0) {
    return notFound("No encryption keys for that user yet.");
  }

  const devices = [];
  for (const identity of target.signalIdentity) {
    const signed = target.signalSignedPreKeys.find(
      (row) => row.deviceId === identity.deviceId,
    );
    if (!signed) continue;
    const [oneTime] = await prisma.$queryRaw<{ keyId: number; publicKey: string }[]>`
      DELETE FROM "SignalOneTimePreKey"
      WHERE id = (
        SELECT id FROM "SignalOneTimePreKey"
        WHERE "userId" = ${target.id} AND "deviceId" = ${identity.deviceId}
        ORDER BY "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "keyId", "publicKey"`;
    devices.push({
      userId: target.id,
      deviceId: identity.deviceId,
      registrationId: identity.registrationId,
      identityKey: identity.identityKey,
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
  if (devices.length === 0) return notFound("No encryption keys for that user yet.");
  return json({ devices });
}
