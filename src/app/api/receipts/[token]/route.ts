import { prisma } from "@/lib/db";
import { tokensEqual } from "@/lib/canonical";
import { json, notFound } from "@/lib/http";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const receipt = await prisma.verifyReceipt.findUnique({
    where: { token },
    include: { case: { select: { revokedAt: true } } },
  });
  if (
    !receipt ||
    receipt.revokedAt ||
    receipt.case.revokedAt ||
    !tokensEqual(receipt.token, token)
  ) {
    return notFound();
  }

  return json({
    token: receipt.token,
    jws: receipt.jws,
    jwksKid: receipt.jwksKid,
    claims: receipt.claimsJson,
    createdAt: receipt.createdAt,
  });
}
