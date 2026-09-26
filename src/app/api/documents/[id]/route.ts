import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { documentScope } from "@/lib/documents";
import { readEvidence, sha256Buffer, StorageNotConfigured } from "@/lib/evidence-storage";
import { forbidden, json, notFound, unauthorized } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

/** Streams a stored document only after re-hashing it against the hash recorded at upload. */
export async function GET(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const scope = await documentScope(user);
  if (!scope) return forbidden("Your role cannot view documents.");
  const { id } = await params;

  const asset = await prisma.evidenceAsset.findFirst({ where: { AND: [scope, { id }] } });
  if (!asset) return notFound();

  let body: Buffer;
  try {
    body = await readEvidence(asset.r2Key);
  } catch (error) {
    if (error instanceof StorageNotConfigured) return json({ error: error.message }, 503);
    throw error;
  }
  if (sha256Buffer(body) !== asset.contentHash) {
    return json({ error: "The stored file no longer matches the hash recorded at upload. It was not served." }, 409);
  }

  const filename = asset.label.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "document";
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": asset.contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "X-Content-SHA256": asset.contentHash,
    },
  });
}
