import { CaseStatus, Prisma, RequestType, Role } from "@prisma/client";
import { enrollmentExpiry, newEnrollmentCode } from "../src/lib/auth";
import { prisma } from "../src/lib/db";
import { buildPayload, type PayloadFields } from "../src/lib/payload";
import {
  deskFlags,
  isDual,
  jevLabels,
  SCENARIOS,
  stepsFor,
} from "../src/preview/data";

const ORG_SLUG = "lake-ontario-cold-storage";
const ORG2_SLUG = "brampton-cross-dock";

type ContactSeed = {
  seedKey: string;
  company: string;
  city: string;
  domain: string;
  numberOnFile: string;
  name: string;
  roleLabel: string;
  email: string;
  bankOnFile?: { institution: string; transit: string; account: string };
  dockOnFile?: string;
  carrierOnFile?: string;
  onFile: PayloadFields;
};

const CONTACTS: ContactSeed[] = [
  {
    seedKey: "maple",
    company: "Maple Malt",
    city: "Mississauga",
    domain: "maplemalt.example",
    numberOnFile: "905-555-0142",
    name: "Jordan Pell",
    roleLabel: "Accounts payable",
    email: "jordan.pell@maplemalt.example",
    bankOnFile: { institution: "004", transit: "30800", account: "441290" },
    dockOnFile: "Door 4",
    carrierOnFile: "QEW Cold Carriers",
    onFile: {
      institution: "004",
      transit: "30800",
      account: "441290",
      dock: "Door 4",
      carrier: "QEW Cold Carriers",
      seal: "SL-4419",
    },
  },
  {
    seedKey: "peel",
    company: "Peel Produce",
    city: "Brampton",
    domain: "peelproduce.example",
    numberOnFile: "905-555-0177",
    name: "Rina Cho",
    roleLabel: "Dispatch",
    email: "dispatch@peelproduce.example",
    dockOnFile: "Door 2",
    carrierOnFile: "York Freight Lines",
    onFile: { dock: "Door 2", carrier: "York Freight Lines" },
  },
  {
    seedKey: "halton",
    company: "Halton Poultry",
    city: "Burlington",
    domain: "haltonpoultry.example",
    numberOnFile: "905-555-0118",
    name: "Marcus Lee",
    roleLabel: "Shipping",
    email: "shipping@haltonpoultry.example",
    dockOnFile: "Door 6",
    carrierOnFile: "QEW Cold Carriers",
    onFile: { dock: "Door 6", carrier: "QEW Cold Carriers" },
  },
  {
    seedKey: "dairy",
    company: "Golden Horseshoe Dairy",
    city: "Hamilton",
    domain: "ghdairy.example",
    numberOnFile: "905-555-0190",
    name: "Helen Frost",
    roleLabel: "Finance",
    email: "ap@ghdairy.example",
    onFile: { institution: "010", transit: "12342", account: "220184" },
  },
  {
    seedKey: "don",
    company: "Don Valley Frozen",
    city: "Toronto",
    domain: "donvalleyfrozen.example",
    numberOnFile: "416-555-0133",
    name: "Owen Grant",
    roleLabel: "Vendor relations",
    email: "vendors@donvalleyfrozen.example",
    dockOnFile: "Door 1",
    onFile: { dock: "Door 1" },
  },
  {
    seedKey: "qew",
    company: "QEW Cold Carriers",
    city: "Mississauga",
    domain: "qewcold.example",
    numberOnFile: "905-555-0160",
    name: "Tina Morales",
    roleLabel: "Dispatch",
    email: "dispatch@qewcold.example",
    carrierOnFile: "QEW Cold Carriers",
    onFile: { carrier: "QEW Cold Carriers" },
  },
  {
    seedKey: "york",
    company: "York Freight Lines",
    city: "Vaughan",
    domain: "yorkfreight.example",
    numberOnFile: "905-555-0124",
    name: "Noah Singh",
    roleLabel: "Fleet desk",
    email: "fleet@yorkfreight.example",
    carrierOnFile: "York Freight Lines",
    onFile: { carrier: "York Freight Lines" },
  },
  {
    seedKey: "harbour",
    company: "Harbourfront Seafood",
    city: "Toronto",
    domain: "harbourseafood.example",
    numberOnFile: "416-555-0188",
    name: "Ava Chen",
    roleLabel: "Receiving",
    email: "receiving@harbourseafood.example",
    dockOnFile: "Door 3",
    onFile: { dock: "Door 3" },
  },
  {
    seedKey: "spice",
    company: "Scarborough Spice Traders",
    city: "Scarborough",
    domain: "scarbspice.example",
    numberOnFile: "416-555-0104",
    name: "Imran Qureshi",
    roleLabel: "Warehouse lead",
    email: "warehouse@scarbspice.example",
    dockOnFile: "Door 5",
    onFile: { dock: "Door 5" },
  },
  {
    seedKey: "grain",
    company: "Wellington Grain",
    city: "Guelph",
    domain: "wellingtongrain.example",
    numberOnFile: "519-555-0166",
    name: "Claire Dubois",
    roleLabel: "Treasury",
    email: "treasury@wellingtongrain.example",
    onFile: { institution: "003", transit: "55110", account: "778210" },
  },
  {
    seedKey: "cream",
    company: "Kingston Creamery",
    city: "Kingston",
    domain: "kingstoncream.example",
    numberOnFile: "613-555-0144",
    name: "Ethan Roy",
    roleLabel: "Plant manager",
    email: "plant@kingstoncream.example",
    dockOnFile: "Door 7",
    onFile: { dock: "Door 7" },
  },
  {
    seedKey: "berry",
    company: "Barrie Berry Farms",
    city: "Barrie",
    domain: "barrieberry.example",
    numberOnFile: "705-555-0199",
    name: "Sofia Martins",
    roleLabel: "Grower relations",
    email: "growers@barrieberry.example",
    dockOnFile: "Door 8",
    onFile: { dock: "Door 8" },
  },
  {
    seedKey: "oven",
    company: "Oshawa Oven Works",
    city: "Oshawa",
    domain: "oshawaoven.example",
    numberOnFile: "905-555-0129",
    name: "Derek Walsh",
    roleLabel: "Logistics",
    email: "logistics@oshawaoven.example",
    dockOnFile: "Door 9",
    onFile: { dock: "Door 9" },
  },
  {
    seedKey: "meats",
    company: "Milton Meats",
    city: "Milton",
    domain: "miltonmeats.example",
    numberOnFile: "905-555-0155",
    name: "Nadia Farouk",
    roleLabel: "Night planner",
    email: "night@miltonmeats.example",
    dockOnFile: "Door 4",
    onFile: { dock: "Door 4" },
  },
  {
    seedKey: "ice",
    company: "Etobicoke Ice Logistics",
    city: "Etobicoke",
    domain: "etobicokeice.example",
    numberOnFile: "416-555-0171",
    name: "Victor Hahn",
    roleLabel: "Carrier desk",
    email: "desk@etobicokeice.example",
    carrierOnFile: "Etobicoke Ice Logistics",
    onFile: { carrier: "Etobicoke Ice Logistics" },
  },
  {
    seedKey: "flour",
    company: "Hamilton Flour Exchange",
    city: "Hamilton",
    domain: "hamiltonflour.example",
    numberOnFile: "905-555-0138",
    name: "Grace Okonkwo",
    roleLabel: "Accounts",
    email: "accounts@hamiltonflour.example",
    onFile: { institution: "002", transit: "44001", account: "190334" },
  },
];

const USERS: {
  id: string;
  email: string;
  username: string;
  org: "loc" | "bcdf";
  name: string;
  role: Role;
  title: string;
  numberOnFile?: string;
}[] = [
  {
    id: "seed_user_jordan",
    email: "jordan.pell@maplemalt.example",
    username: "jordan",
    org: "loc",
    name: "Jordan Pell",
    role: "supplier",
    title: "Maple Malt billing",
  },
  {
    id: "seed_user_amira",
    email: "amira.shah@lakeontariocold.example",
    username: "amira",
    org: "loc",
    name: "Amira Shah",
    role: "logistics",
    title: "Plant logistics",
    numberOnFile: "905-555-0201",
  },
  {
    id: "seed_user_colin",
    email: "colin.berger@lakeontariocold.example",
    username: "colin",
    org: "loc",
    name: "Colin Berger",
    role: "logistics",
    title: "Cold store logistics",
    numberOnFile: "905-555-0202",
  },
  {
    id: "seed_user_priya",
    email: "priya.nandakumar@lakeontariocold.example",
    username: "priya",
    org: "loc",
    name: "Priya Nandakumar",
    role: "admin",
    title: "Admin",
  },
  {
    id: "seed_user_devon",
    email: "devon.blake@lakeontariocold.example",
    username: "devon",
    org: "loc",
    name: "Devon Blake",
    role: "driver",
    title: "Driver",
  },
  {
    id: "seed_user_samir",
    email: "samir.haddad@lakeontariocold.example",
    username: "samir",
    org: "loc",
    name: "Samir Haddad",
    role: "driver",
    title: "Driver",
  },
  {
    id: "seed_user_elena",
    email: "elena.voss@lakeontariocold.example",
    username: "elena",
    org: "loc",
    name: "Elena Voss",
    role: "receiver",
    title: "Receiver",
  },
  {
    id: "seed_user_kai",
    email: "kai.okonkwo@lakeontariocold.example",
    username: "kai",
    org: "loc",
    name: "Kai Okonkwo",
    role: "warehouse",
    title: "Warehouse lead",
  },
  {
    id: "seed_user_noah",
    email: "noah.reid@bramptoncrossdock.example",
    username: "noah",
    org: "bcdf",
    name: "Noah Reid",
    role: "logistics",
    title: "Cross-dock logistics",
    numberOnFile: "905-555-0301",
  },
  {
    id: "seed_user_maya",
    email: "maya.lund@bramptoncrossdock.example",
    username: "maya",
    org: "bcdf",
    name: "Maya Lund",
    role: "supplier",
    title: "Billing",
  },
  {
    id: "seed_user_omar",
    email: "omar.fadel@bramptoncrossdock.example",
    username: "omar",
    org: "bcdf",
    name: "Omar Fadel",
    role: "driver",
    title: "Driver",
  },
];

const CASE_STATUS: Record<string, CaseStatus> = {
  bank: "flagged",
  dock: "oob_pending",
  carrier: "flagged",
  access: "oob_pending",
  ot: "flagged",
  haul: "oob_pending",
};

function mergeRequested(
  onFile: PayloadFields,
  patch: PayloadFields,
): PayloadFields {
  return { ...onFile, ...patch };
}

async function main() {
  const org = await prisma.org.upsert({
    where: { slug: ORG_SLUG },
    create: {
      id: "seed_org_loc",
      slug: ORG_SLUG,
      name: "Lake Ontario Cold Storage",
      city: "Mississauga",
      province: "ON",
    },
    update: {
      name: "Lake Ontario Cold Storage",
      city: "Mississauga",
      province: "ON",
    },
  });

  const org2 = await prisma.org.upsert({
    where: { slug: ORG2_SLUG },
    create: {
      id: "seed_org_bcdf",
      slug: ORG2_SLUG,
      name: "Brampton Cross-Dock Freight",
      city: "Brampton",
      province: "ON",
    },
    update: {
      name: "Brampton Cross-Dock Freight",
      city: "Brampton",
      province: "ON",
    },
  });

  const orgs = { loc: org, bcdf: org2 };
  const issuedCodes: { username: string; org: string; code: string }[] = [];

  for (const user of USERS) {
    const owner = orgs[user.org];
    const seeded = await prisma.user.upsert({
      where: { orgId_email: { orgId: owner.id, email: user.email } },
      create: {
        id: user.id,
        orgId: owner.id,
        clerkId: null,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        title: user.title,
        numberOnFile: user.numberOnFile ?? null,
      },
      update: {
        username: user.username,
        name: user.name,
        role: user.role,
        title: user.title,
        numberOnFile: user.numberOnFile ?? null,
        clerkId: null,
      },
    });

    // Enrollment demands a code while an account has no passkey, and only a
    // signed-in logistics staff can issue one, so seeded accounts need a first code here.
    const passkeys = await prisma.webAuthnCredential.count({
      where: { userId: seeded.id },
    });
    if (passkeys === 0) {
      const { code, hash } = newEnrollmentCode();
      await prisma.user.update({
        where: { id: seeded.id },
        data: {
          enrollmentTokenHash: hash,
          enrollmentTokenExpires: enrollmentExpiry(),
        },
      });
      issuedCodes.push({ username: user.username, org: owner.slug, code });
    }
  }

  const contactBySeed = new Map<string, string>();
  for (const row of CONTACTS) {
    const contact = await prisma.directoryContact.upsert({
      where: { seedKey: row.seedKey },
      create: {
        id: `seed_contact_${row.seedKey}`,
        orgId: org.id,
        seedKey: row.seedKey,
        name: row.name,
        company: row.company,
        roleLabel: row.roleLabel,
        email: row.email,
        numberOnFile: row.numberOnFile,
        domain: row.domain,
        bankOnFile: row.bankOnFile ?? undefined,
        dockOnFile: row.dockOnFile ?? null,
        carrierOnFile: row.carrierOnFile ?? null,
        city: row.city,
      },
      update: {
        orgId: org.id,
        name: row.name,
        company: row.company,
        roleLabel: row.roleLabel,
        email: row.email,
        numberOnFile: row.numberOnFile,
        domain: row.domain,
        bankOnFile: row.bankOnFile ?? undefined,
        dockOnFile: row.dockOnFile ?? null,
        carrierOnFile: row.carrierOnFile ?? null,
        city: row.city,
      },
    });
    contactBySeed.set(row.seedKey, contact.id);
  }

  const jordanId = USERS[0].id;

  for (const scenario of SCENARIOS) {
    const partner = CONTACTS.find((c) => c.seedKey === scenario.partnerId);
    if (!partner) continue;

    const caseId = `seed_case_${scenario.id}`;
    const onFile = partner.onFile;
    const requested = mergeRequested(onFile, scenario.requested);
    const payload = buildPayload({
      caseId,
      orgId: org.id,
      requestType: scenario.requestType,
      counterparty: partner.company,
      onFile,
      requested,
      rawText: scenario.rawText,
    });

    const oobSteps = stepsFor(scenario.requestType);
    const status = CASE_STATUS[scenario.id] ?? "flagged";
    const oobAckJson: Prisma.InputJsonValue | undefined =
      status === "oob_pending"
        ? { steps: oobSteps.map((_, i) => i === 0), note: "" }
        : undefined;

    await prisma.verifyCase.upsert({
      where: { seedKey: scenario.id },
      create: {
        id: caseId,
        orgId: org.id,
        seedKey: scenario.id,
        createdById: jordanId,
        contactId: contactBySeed.get(scenario.partnerId) ?? null,
        requestType: scenario.requestType as RequestType,
        counterparty: partner.company,
        rawText: scenario.rawText,
        onFileJson: onFile,
        requestedJson: requested,
        flagsJson: deskFlags(
          scenario.rawText,
          partner.domain,
          onFile,
          requested,
        ),
        oobStepsJson: oobSteps,
        oobAckJson,
        payloadCanonical: payload.canonical,
        payloadHash: payload.payloadHash,
        status,
        dualControl: isDual(scenario.requestType),
        matchesUploaded: false,
        publicToken: null,
        jevJson: jevLabels(scenario.rawText, scenario.requestType),
      },
      update: {
        orgId: org.id,
        createdById: jordanId,
        contactId: contactBySeed.get(scenario.partnerId) ?? null,
        requestType: scenario.requestType as RequestType,
        counterparty: partner.company,
        rawText: scenario.rawText,
        onFileJson: onFile,
        requestedJson: requested,
        flagsJson: deskFlags(
          scenario.rawText,
          partner.domain,
          onFile,
          requested,
        ),
        oobStepsJson: oobSteps,
        oobAckJson,
        payloadCanonical: payload.canonical,
        payloadHash: payload.payloadHash,
        status,
        dualControl: isDual(scenario.requestType),
        jevJson: jevLabels(scenario.rawText, scenario.requestType),
      },
    });
  }

  const loads: {
    seedKey: string;
    org: "loc" | "bcdf";
    loadRef: string;
    commodity: string;
    origin: string;
    destination: string;
    scheduledDock: string;
    carrierName: string;
    plate: string;
    trailer: string;
    sealNumber: string;
    reeferSetpoint: string;
    currentStatus: string;
    lastKnown: string;
    driverUserId: string;
    eta: Date;
  }[] = [
    {
      seedKey: "ld-malt",
      org: "loc",
      loadRef: "LO-4419",
      commodity: "malt",
      origin: "Mississauga malt house",
      destination: "Lake Ontario Cold Storage",
      scheduledDock: "Door 4",
      carrierName: "QEW Cold Carriers",
      plate: "BLNT 214",
      trailer: "TR-88",
      sealNumber: "SL-4419",
      reeferSetpoint: "-18 C",
      currentStatus: "rolling",
      lastKnown: "QEW eastbound near Oakville",
      driverUserId: "seed_user_devon",
      eta: new Date("2026-09-25T20:40:00.000Z"),
    },
    {
      seedKey: "ld-poultry",
      org: "loc",
      loadRef: "LO-4420",
      commodity: "poultry",
      origin: "Burlington",
      destination: "Lake Ontario Cold Storage",
      scheduledDock: "Door 6",
      carrierName: "QEW Cold Carriers",
      plate: "CHLK 902",
      trailer: "TR-12",
      sealNumber: "SL-2201",
      reeferSetpoint: "-20 C",
      currentStatus: "loaded",
      lastKnown: "Halton Poultry yard",
      driverUserId: "seed_user_samir",
      eta: new Date("2026-09-25T22:10:00.000Z"),
    },
    {
      seedKey: "ld-dairy",
      org: "loc",
      loadRef: "LO-4422",
      commodity: "dairy",
      origin: "Hamilton",
      destination: "Lake Ontario Cold Storage",
      scheduledDock: "Door 1",
      carrierName: "York Freight Lines",
      plate: "MILK 330",
      trailer: "TR-41",
      sealNumber: "SL-7730",
      reeferSetpoint: "2 C",
      currentStatus: "loaded",
      lastKnown: "Golden Horseshoe Dairy",
      driverUserId: "seed_user_devon",
      eta: new Date("2026-09-26T10:00:00.000Z"),
    },
    {
      seedKey: "ld-flour",
      org: "loc",
      loadRef: "LO-4388",
      commodity: "flour",
      origin: "Lake Ontario Cold Storage",
      destination: "Hamilton Flour Exchange",
      scheduledDock: "Door 9",
      carrierName: "Etobicoke Ice Logistics",
      plate: "FLUR 015",
      trailer: "TR-03",
      sealNumber: "SL-1008",
      reeferSetpoint: "ambient",
      currentStatus: "delayed",
      lastKnown: "Held at gate — paperwork review",
      driverUserId: "seed_user_samir",
      eta: new Date("2026-09-25T23:30:00.000Z"),
    },
    {
      seedKey: "ld-produce",
      org: "bcdf",
      loadRef: "LO-5001",
      commodity: "produce",
      origin: "Brampton cross-dock",
      destination: "North York fresh market",
      scheduledDock: "Door 1",
      carrierName: "Brampton Cross-Dock Freight",
      plate: "PRDC 517",
      trailer: "TR-60",
      sealNumber: "SL-5001",
      reeferSetpoint: "4 C",
      currentStatus: "loaded",
      lastKnown: "Brampton cross-dock",
      driverUserId: "seed_user_omar",
      eta: new Date("2026-09-26T12:00:00.000Z"),
    },
  ];

  for (const load of loads) {
    const { org: owner, ...rest } = load;
    const orgId = orgs[owner].id;
    await prisma.load.upsert({
      where: { seedKey: load.seedKey },
      create: {
        id: `seed_${load.seedKey}`,
        orgId,
        ...rest,
      },
      update: {
        orgId,
        loadRef: load.loadRef,
        commodity: load.commodity,
        origin: load.origin,
        destination: load.destination,
        scheduledDock: load.scheduledDock,
        carrierName: load.carrierName,
        plate: load.plate,
        trailer: load.trailer,
        sealNumber: load.sealNumber,
        reeferSetpoint: load.reeferSetpoint,
        currentStatus: load.currentStatus,
        lastKnown: load.lastKnown,
        driverUserId: load.driverUserId,
        eta: load.eta,
      },
    });
  }

  const inventory: {
    seedKey: string;
    org: "loc" | "bcdf";
    sku: string;
    commodity: string;
    quantity: number;
    unit: string;
    location: string;
    status: string;
    receivedAt: Date;
    notes?: string;
  }[] = [
    {
      seedKey: "inv-malt-a12",
      org: "loc",
      sku: "MALT-4419",
      commodity: "malt",
      quantity: 24,
      unit: "pallets",
      location: "Cold room A · Bay 12",
      status: "Stored",
      receivedAt: new Date("2026-09-20T14:00:00.000Z"),
    },
    {
      seedKey: "inv-poultry-b3",
      org: "loc",
      sku: "PLY-2201",
      commodity: "poultry",
      quantity: 18,
      unit: "pallets",
      location: "Freezer B · Bay 3",
      status: "Stored",
      receivedAt: new Date("2026-09-22T09:30:00.000Z"),
      notes: "Hold for QC release",
    },
    {
      seedKey: "inv-dairy-c1",
      org: "loc",
      sku: "DRY-7730",
      commodity: "dairy",
      quantity: 40,
      unit: "pallets",
      location: "Cooler C · Bay 1",
      status: "Stored",
      receivedAt: new Date("2026-09-18T16:15:00.000Z"),
    },
    {
      seedKey: "inv-flour-d9",
      org: "loc",
      sku: "FLR-1008",
      commodity: "flour",
      quantity: 12,
      unit: "pallets",
      location: "Dry dock · Bay 9",
      status: "Staged Out",
      receivedAt: new Date("2026-09-15T11:00:00.000Z"),
      notes: "Staged for LO-4388 pickup",
    },
    {
      seedKey: "inv-produce-x1",
      org: "bcdf",
      sku: "PRD-5001",
      commodity: "produce",
      quantity: 30,
      unit: "pallets",
      location: "Cross-dock · Lane 1",
      status: "Stored",
      receivedAt: new Date("2026-09-24T08:00:00.000Z"),
    },
  ];

  for (const lot of inventory) {
    const { org: owner, ...rest } = lot;
    const orgId = orgs[owner].id;
    await prisma.inventoryLot.upsert({
      where: { seedKey: lot.seedKey },
      create: {
        id: `seed_${lot.seedKey}`,
        orgId,
        ...rest,
      },
      update: {
        orgId,
        sku: lot.sku,
        commodity: lot.commodity,
        quantity: lot.quantity,
        unit: lot.unit,
        location: lot.location,
        status: lot.status,
        receivedAt: lot.receivedAt,
        notes: lot.notes ?? null,
      },
    });
  }

  await prisma.notification.upsert({
    where: { seedKey: "dual-bank" },
    create: {
      id: "seed_notif_dual_bank",
      orgId: org.id,
      seedKey: "dual-bank",
      role: "logistics",
      kind: "dual_control",
      title: "Bank change is waiting",
      body: "A supplier bank change needs two different logistics approvers. Nothing is approved yet.",
      href: "/logistics",
    },
    update: {
      orgId: org.id,
      role: "logistics",
      kind: "dual_control",
      title: "Bank change is waiting",
      body: "A supplier bank change needs two different logistics approvers. Nothing is approved yet.",
      href: "/logistics",
    },
  });

  if (issuedCodes.length > 0) {
    console.log("\nEnrollment codes (expire in 24h, one use each):");
    console.table(issuedCodes);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
