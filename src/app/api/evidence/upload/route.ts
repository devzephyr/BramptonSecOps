import { requireUser } from "@/lib/auth";
import {
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
  if (!key || !key.startsWith(`${user.orgId}/`)) {
    return forbidden("Invalid evidence key.");
  }

  const buffer = Buffer.from(await request.arrayBuffer());
  if (!buffer.length) return badRequest("Empty upload.");

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
