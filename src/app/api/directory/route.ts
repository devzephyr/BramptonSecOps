import { prisma } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { serializeContact } from "@/lib/directory";
import { badRequest, forbidden, json, unauthorized } from "@/lib/http";

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const rows = await prisma.directoryContact.findMany({
    where: { orgId: user.orgId },
    orderBy: { company: "asc" },
  });
  return json({ contacts: rows.map(serializeContact) });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!hasRole(user, ["manager", "admin"])) {
    return forbidden("Only a manager or admin can add to the directory.");
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const company = text(body.company, 120);
  const city = text(body.city, 80);
  const domain = text(body.domain, 120).toLowerCase();
  const numberOnFile = text(body.numberOnFile, 40);
  const name = text(body.name, 80);
  if (company.length < 2) return badRequest("Company name is required.");
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) {
    return badRequest("Enter the company's email domain, like example.com.");
  }
  if (!/^[+0-9 ()-]{7,}$/.test(numberOnFile)) {
    return badRequest("Enter the phone number you already have on file.");
  }

  const institution = text(body.institution, 8);
  const transit = text(body.transit, 8);
  const account = text(body.account, 20);
  const bank = [institution, transit, account];
  if (bank.some(Boolean) && !bank.every((part) => /^\d+$/.test(part))) {
    return badRequest(
      "Bank on file needs institution, transit, and account as digits.",
    );
  }

  const created = await prisma.directoryContact.create({
    data: {
      orgId: user.orgId,
      company,
      city,
      domain,
      numberOnFile,
      name: name || company,
      roleLabel: text(body.roleLabel, 80),
      email: text(body.email, 120),
      bankOnFile: bank.every(Boolean)
        ? { institution, transit, account }
        : undefined,
      dockOnFile: text(body.dock, 80) || null,
      carrierOnFile: text(body.carrier, 120) || null,
    },
  });
  return json(serializeContact(created), 201);
}
