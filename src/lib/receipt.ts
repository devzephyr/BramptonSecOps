import {
  calculateJwkThumbprint,
  exportJWK,
  importPKCS8,
  SignJWT,
  type JWK,
} from "jose";
import { prisma } from "@/lib/db";

type ReceiptKey = {
  privateKey: CryptoKey;
  publicJwk: JWK;
  kid: string;
};

let cached: ReceiptKey | null = null;

export async function receiptKey(): Promise<ReceiptKey> {
  if (cached) return cached;
  const b64 = process.env.RECEIPT_PRIVATE_KEY_B64;
  if (!b64) {
    throw new Error(
      "RECEIPT_PRIVATE_KEY_B64 is not set. The receipt key stays on the server.",
    );
  }
  const pkcs8 = Buffer.from(b64, "base64").toString("utf8");
  const privateKey = await importPKCS8(pkcs8, "EdDSA");
  const exported = await exportJWK(privateKey);
  delete exported.d;
  const publicJwk: JWK = {
    ...exported,
    alg: "EdDSA",
    use: "sig",
  };
  const kid = await calculateJwkThumbprint(publicJwk);
  publicJwk.kid = kid;
  cached = { privateKey, publicJwk, kid };
  return cached;
}

export async function publicJwks() {
  const { publicJwk } = await receiptKey();
  return { keys: [publicJwk] };
}

export async function signReceipt(
  claims: Record<string, unknown>,
  subject: string,
) {
  const { privateKey, kid } = await receiptKey();
  const jws = await new SignJWT(claims)
    .setProtectedHeader({ alg: "EdDSA", kid, typ: "JWT" })
    .setIssuer("supplychek")
    .setSubject(subject)
    .setIssuedAt()
    .sign(privateKey);
  return { jws, kid };
}

export async function loadPublicReceipt(token: string) {
  const receipt = await prisma.verifyReceipt.findUnique({
    where: { token },
    include: { case: { select: { revokedAt: true } } },
  });
  if (!receipt || receipt.revokedAt || receipt.case.revokedAt) return null;
  return {
    token: receipt.token,
    jws: receipt.jws,
    jwksKid: receipt.jwksKid,
    claims: receipt.claimsJson,
    createdAt: receipt.createdAt.toISOString(),
  };
}
