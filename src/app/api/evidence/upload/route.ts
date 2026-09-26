import { requireUser } from "@/lib/auth";
import {
  isOrgEvidenceKey,
  MAX_EVIDENCE_BYTES,
  putObject,
  sha256Buffer,
  storageMode,
  writeLocalEvidence,
} from "@/lib/evidence-storage";
import { badRequest, forbidden, json, unauthorized } from "@/lib/http";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!isOrgEvidenceKey(key, user.orgId)) {
    return forbidden("Invalid evidence key.");
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_EVIDENCE_BYTES) return badRequest("File is larger than 10 MB.");

  const buffer = Buffer.from(await request.arrayBuffer());
  if (!buffer.length) return badRequest("Empty upload.");
  if (buffer.length > MAX_EVIDENCE_BYTES) return badRequest("File is larger than 10 MB.");

  const contentType =
    request.headers.get("content-type") ?? "application/octet-stream";

  if (storageMode() === "s3") {
    await putObject(key, buffer, contentType);
  } else {
    await writeLocalEvidence(key, buffer);
  }

  return json({
    key,
    contentHash: sha256Buffer(buffer),
    byteSize: buffer.length,
    contentType,
  });
}
