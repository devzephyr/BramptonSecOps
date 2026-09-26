import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { MANAGERS } from "@/lib/policy";
import { evidenceKey, readEvidence, sha256Buffer, StorageNotConfigured, storeEvidence } from "@/lib/evidence-storage";
import { badRequest, forbidden, json, notFound, unauthorized } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

/** The client crops and downsizes to 512 px before upload, so real photos land far under this. */
const MAX_PHOTO_BYTES = 1024 * 1024;

/** Sniff the bytes rather than trusting Content-Type; SVG and anything else is refused. */
function imageType(buffer: Buffer): string | null {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer.length > 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

export async function GET(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const person = await prisma.user.findFirst({
    where: { id, orgId: user.orgId },
    select: { photoKey: true, photoHash: true, photoType: true },
  });
  if (!person?.photoKey || !person.photoHash || !person.photoType) return notFound();

  let body: Buffer;
  try {
    body = await readEvidence(person.photoKey);
  } catch (error) {
    if (error instanceof StorageNotConfigured) return json({ error: error.message }, 503);
    throw error;
  }
  if (sha256Buffer(body) !== person.photoHash) {
    return json({ error: "The stored photo no longer matches its recorded hash." }, 409);
  }
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": person.photoType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=86400",
      ETag: `"${person.photoHash}"`,
    },
  });
}

/** A driver sets their own photo; managers and admins set any driver's. */
export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  if (user.id !== id && !hasRole(user, MANAGERS)) {
    return forbidden("Only a manager can change someone else's photo.");
  }
  const target = await prisma.user.findFirst({ where: { id, orgId: user.orgId, role: "driver" }, select: { id: true } });
  if (!target) return notFound();

  if (Number(request.headers.get("content-length") ?? 0) > MAX_PHOTO_BYTES) return badRequest("Photo is larger than 1 MB.");
  const buffer = Buffer.from(await request.arrayBuffer());
  if (!buffer.length) return badRequest("Empty upload.");
  if (buffer.length > MAX_PHOTO_BYTES) return badRequest("Photo is larger than 1 MB.");
  const type = imageType(buffer);
  if (!type) return badRequest("Photo must be a JPEG, PNG, or WebP image.");

  const key = evidenceKey(user.orgId, `driver-photo-${id}`);
  try {
    await storeEvidence(key, buffer, type);
  } catch (error) {
    if (error instanceof StorageNotConfigured) return json({ error: error.message }, 503);
    throw error;
  }
  const hash = sha256Buffer(buffer);
  await prisma.user.update({ where: { id }, data: { photoKey: key, photoHash: hash, photoType: type } });
  return json({ photoVersion: hash.slice(0, 12) }, 201);
}
