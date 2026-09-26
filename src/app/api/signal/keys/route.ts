import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { badRequest, json, unauthorized } from "@/lib/http";

function isB64(value: unknown, max = 256): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= max &&
    /^[A-Za-z0-9+/=_-]+$/.test(value)
  );
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const { registrationId, identityKey, signedPreKey, oneTimePreKeys } = body;
  if (typeof registrationId !== "number" || !Number.isInteger(registrationId)) {
    return badRequest("registrationId is required.");
  }
  if (!isB64(identityKey, 128)) return badRequest("identityKey is required.");
  const signed = signedPreKey as Record<string, unknown> | undefined;
  if (
    !signed ||
    typeof signed.keyId !== "number" ||
    !isB64(signed.publicKey, 128) ||
    !isB64(signed.signature, 256)
  ) {
    return badRequest("signedPreKey is required.");
  }
  if (!Array.isArray(oneTimePreKeys) || oneTimePreKeys.length > 100) {
    return badRequest("oneTimePreKeys must be an array of at most 100.");
  }
  for (const row of oneTimePreKeys) {
    const pre = row as Record<string, unknown>;
    if (typeof pre.keyId !== "number" || !isB64(pre.publicKey, 128)) {
      return badRequest("Each one-time prekey needs keyId and publicKey.");
    }
  }

  await prisma.signalIdentity.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      registrationId,
      identityKey: identityKey as string,
    },
    update: {
      registrationId,
      identityKey: identityKey as string,
    },
  });
  await prisma.signalSignedPreKey.upsert({
    where: { userId_keyId: { userId: user.id, keyId: signed.keyId as number } },
    create: {
      userId: user.id,
      keyId: signed.keyId as number,
      publicKey: signed.publicKey as string,
      signature: signed.signature as string,
    },
    update: {
      publicKey: signed.publicKey as string,
      signature: signed.signature as string,
    },
  });
  await prisma.signalOneTimePreKey.deleteMany({ where: { userId: user.id } });
  if (oneTimePreKeys.length > 0) {
    await prisma.signalOneTimePreKey.createMany({
      data: (oneTimePreKeys as Record<string, unknown>[]).map((pre) => ({
        userId: user.id,
        keyId: pre.keyId as number,
        publicKey: pre.publicKey as string,
      })),
      skipDuplicates: true,
    });
  }
  return json({ ok: true });
}
