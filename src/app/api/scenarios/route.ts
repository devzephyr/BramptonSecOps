import { RequestType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { mergeRequestedPatch } from "@/lib/cases";
import { badRequest, forbidden, json, unauthorized } from "@/lib/http";
import { CASE_STAFF } from "@/lib/policy";

const PICKABLE = (Object.values(RequestType) as string[]).filter((type) => type !== "truck_status_update");

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, CASE_STAFF)) return forbidden("Only supplier or logistics staff can use scenarios.");

  const rows = await prisma.scenario.findMany({
    where: { orgId: user.orgId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, title: true, requestType: true, contactId: true, rawText: true, requested: true, createdById: true },
  });
  return json({ scenarios: rows });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, CASE_STAFF)) return forbidden("Only supplier or logistics staff can save scenarios.");

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 80) : "";
  if (!title) return badRequest("Give the scenario a name.");
  const requestType = typeof body.requestType === "string" ? body.requestType : "";
  if (!PICKABLE.includes(requestType)) return badRequest("Pick a request type.");
  const rawText = typeof body.rawText === "string" ? body.rawText.trim().slice(0, 4000) : "";
  if (rawText.length < 8) return badRequest("Write at least a sentence describing the request.");

  let contactId: string | null = null;
  if (typeof body.contactId === "string" && body.contactId) {
    const contact = await prisma.directoryContact.findFirst({
      where: { id: body.contactId, orgId: user.orgId },
      select: { id: true },
    });
    if (!contact) return badRequest("That counterparty is not in your directory.");
    contactId = contact.id;
  }

  const scenario = await prisma.scenario.create({
    data: {
      orgId: user.orgId,
      title,
      requestType: requestType as RequestType,
      contactId,
      rawText,
      requested: mergeRequestedPatch({}, body),
      createdById: user.id,
    },
    select: { id: true, title: true, requestType: true, contactId: true, rawText: true, requested: true, createdById: true },
  });
  return json(scenario, 201);
}
