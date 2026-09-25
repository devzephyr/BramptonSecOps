import { requireUser } from "@/lib/auth";
import { evidenceKey, presignPut, storageMode } from "@/lib/evidence-storage";
import { badRequest, json, unauthorized } from "@/lib/http";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const label = typeof body.label === "string" ? body.label : "upload";
  const contentType =
    typeof body.contentType === "string"
      ? body.contentType
      : "application/octet-stream";

  const key = evidenceKey(user.orgId, label);

  if (storageMode() === "local") {
    return json({
      mode: "local",
      uploadUrl: `/api/evidence/upload?key=${encodeURIComponent(key)}`,
      key,
      contentType,
    });
  }

  const signed = await presignPut(key, contentType);
  return json({
    mode: "s3",
    uploadUrl: signed.url,
    key: signed.key,
    bucket: signed.bucket,
    contentType,
  });
}
