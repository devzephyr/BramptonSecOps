import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { badRequest, json, notFound, unauthorized } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

async function orgCase(id: string, orgId: string) {
  return prisma.verifyCase.findFirst({
    where: { id, orgId },
    select: { id: true },
  });
}

function validEnvelopes(value: unknown): value is Record<string, { type: number; body: string }> {
  if (typeof value !== "object" || value === null) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0 || entries.length > 25) return false;
  return entries.every(([, env]) => {
    const row = env as Record<string, unknown>;
    return (
      (row.type === 1 || row.type === 3) &&
      typeof row.body === "string" &&
      row.body.length > 0 &&
      row.body.length < 20000 &&
      /^[A-Za-z0-9+/=]+$/.test(row.body)
    );
  });
}

export async function GET(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  if (!(await orgCase(id, user.orgId))) return notFound();

  const rows = await prisma.message.findMany({
    where: { orgId: user.orgId, caseId: id },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });
  return json({
    messages: rows.map((row) => ({
      id: row.id,
      envelopes: row.envelopes,
      bodyHash: row.bodyHash,
      createdAt: row.createdAt,
      sender: row.sender,
      own: row.senderId === user.id,
    })),
  });
}

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  if (!(await orgCase(id, user.orgId))) return notFound();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }
  if (!validEnvelopes(body.envelopes)) {
    return badRequest("envelopes must map recipient ids to ciphertext.");
  }
  const bodyHash = body.bodyHash;
  if (typeof bodyHash !== "string" || !/^[a-f0-9]{64}$/.test(bodyHash)) {
    return badRequest("bodyHash must be a sha256 hex digest.");
  }

  const row = await prisma.message.create({
    data: {
      orgId: user.orgId,
      caseId: id,
      senderId: user.id,
      envelopes: body.envelopes,
      bodyHash,
    },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });
  return json(
    {
      id: row.id,
      envelopes: row.envelopes,
      bodyHash: row.bodyHash,
      createdAt: row.createdAt,
      sender: row.sender,
      own: true,
    },
    201,
  );
}
