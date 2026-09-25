import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, unauthorized } from "@/lib/http";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const receipts = await prisma.verifyReceipt.findMany({
    where: {
      orgId: user.orgId,
      revokedAt: null,
      case: { status: "fully_approved", revokedAt: null },
    },
    include: {
      case: {
        select: {
          requestType: true,
          counterparty: true,
          payloadHash: true,
          publicToken: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return json({
    receipts: receipts.map((row) => ({
      token: row.token,
      createdAt: row.createdAt,
      claims: row.claimsJson,
      case: row.case,
    })),
  });
}
