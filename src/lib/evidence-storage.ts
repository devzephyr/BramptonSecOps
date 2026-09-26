import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export function sha256Buffer(data: Buffer | Uint8Array) {
  return createHash("sha256").update(data).digest("hex");
}

function s3Enabled() {
  return Boolean(process.env.S3_ENDPOINT);
}

function s3Client() {
  const endpoint = process.env.S3_ENDPOINT!;
  return new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? "minio",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "minio123",
    },
  });
}

export function evidenceKey(orgId: string, label: string) {
  const safe = label.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
  return `${orgId}/${Date.now()}_${randomBytes(8).toString("hex")}_${safe}`;
}

/** Vercel caps function request bodies at 4.5 MB; the client downscales photos to fit. */
export const MAX_EVIDENCE_BYTES = 4 * 1024 * 1024;

export class StorageNotConfigured extends Error {}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
) {
  const client = s3Client();
  const bucket = process.env.S3_BUCKET ?? "supplychek-evidence";
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return { bucket, key };
}

export async function writeLocalEvidence(key: string, body: Buffer) {
  const root = path.join(process.cwd(), "data", "evidence");
  const file = path.join(root, key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
  return file;
}

export async function storeEvidence(key: string, body: Buffer, contentType: string) {
  if (s3Enabled()) {
    await putObject(key, body, contentType);
    return;
  }
  if (process.env.VERCEL) {
    throw new StorageNotConfigured("Evidence storage is not configured. Set the S3_* variables for R2.");
  }
  await writeLocalEvidence(key, body);
}
