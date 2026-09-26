export type Role = "supplier" | "manager" | "driver" | "receiver" | "admin";
export type Staff = {
  id: string;
  name: string;
  role: Role;
  title: string;
  email: string;
};

export type Partner = {
  id: string;
  company: string;
  city: string;
  domain: string;
  numberOnFile: string;
  onFile: Record<string, string>;
};

export type DeskCase = {
  id: string;
  requestType: string;
  counterparty: string;
  partnerId: string;
  rawText: string;
  onFile: Record<string, string>;
  requested: Record<string, string>;
  flags: string[];
  oobSteps: string[];
  oobDone: boolean[];
  oobNote: string;
  canonical: string;
  payloadHash: string;
  dualControl: boolean;
  status: string;
  approvals: { userId: string; name: string; role: Role; at: string }[];
  token: string | null;
  jev: string[];
};

export type Load = {
  id: string;
  loadRef: string;
  commodity: string;
  origin: string;
  destination: string;
  dock: string;
  carrier: string;
  plate: string;
  trailer: string;
  seal: string;
  setpoint: string;
  status: string;
  eta: string;
  driverId: string;
  lat?: number | null;
  lng?: number | null;
  positionAt?: string | null;
};

export type Note = {
  id: string;
  audience: Role[];
  title: string;
  body: string;
  href: string;
  createdAt: string;
  read: boolean;
};

export const STAFF: Staff[] = [
  {
    id: "seed_user_jordan",
    name: "Jordan Pell",
    role: "supplier",
    title: "Maple Malt billing",
    email: "jordan.pell@maplemalt.example",
  },
  {
    id: "seed_user_amira",
    name: "Amira Shah",
    role: "manager",
    title: "Plant manager",
    email: "amira.shah@lakeontariocold.example",
  },
  {
    id: "seed_user_colin",
    name: "Colin Berger",
    role: "manager",
    title: "Cold store manager",
    email: "colin.berger@lakeontariocold.example",
  },
  {
    id: "seed_user_priya",
    name: "Priya Nandakumar",
    role: "admin",
    title: "Admin",
    email: "priya.nandakumar@lakeontariocold.example",
  },
  {
    id: "seed_user_devon",
    name: "Devon Blake",
    role: "driver",
    title: "Driver",
    email: "devon.blake@lakeontariocold.example",
  },
  {
    id: "seed_user_samir",
    name: "Samir Haddad",
    role: "driver",
    title: "Driver",
    email: "samir.haddad@lakeontariocold.example",
  },
  {
    id: "seed_user_elena",
    name: "Elena Voss",
    role: "receiver",
    title: "Receiver",
    email: "elena.voss@lakeontariocold.example",
  },
];

export const PARTNERS: Partner[] = [
  [
    "maple",
    "Maple Malt Co.",
    "Mississauga",
    "maplemalt.example",
    "905-555-0142",
    {
      institution: "004",
      transit: "30800",
      account: "441290",
      dock: "Door 4",
      carrier: "QEW Cold Carriers",
      seal: "SL-4419",
    },
  ],
  [
    "peel",
    "Peel Produce Co-op",
    "Brampton",
    "peelproduce.example",
    "905-555-0177",
    { dock: "Door 2", carrier: "York Freight Lines" },
  ],
  [
    "halton",
    "Halton Poultry",
    "Burlington",
    "haltonpoultry.example",
    "905-555-0118",
    { dock: "Door 6", carrier: "QEW Cold Carriers" },
  ],
  [
    "dairy",
    "Golden Horseshoe Dairy",
    "Hamilton",
    "ghdairy.example",
    "905-555-0190",
    { institution: "010", transit: "12342", account: "220184" },
  ],
  [
    "don",
    "Don Valley Frozen",
    "Toronto",
    "donvalleyfrozen.example",
    "416-555-0133",
    { dock: "Door 1" },
  ],
  [
    "qew",
    "QEW Cold Carriers",
    "Mississauga",
    "qewcold.example",
    "905-555-0160",
    { carrier: "QEW Cold Carriers" },
  ],
  [
    "york",
    "York Freight Lines",
    "Vaughan",
    "yorkfreight.example",
    "905-555-0124",
    { carrier: "York Freight Lines" },
  ],
  [
    "harbour",
    "Harbourfront Seafood",
    "Toronto",
    "harbourseafood.example",
    "416-555-0188",
    { dock: "Door 3" },
  ],
  [
    "spice",
    "Scarborough Spice Traders",
    "Scarborough",
    "scarbspice.example",
    "416-555-0104",
    { dock: "Door 5" },
  ],
  [
    "grain",
    "Wellington Grain",
    "Guelph",
    "wellingtongrain.example",
    "519-555-0166",
    { institution: "003", transit: "55110", account: "778210" },
  ],
  [
    "cream",
    "Kingston Creamery",
    "Kingston",
    "kingstoncream.example",
    "613-555-0144",
    { dock: "Door 7" },
  ],
  [
    "berry",
    "Barrie Berry Farms",
    "Barrie",
    "barrieberry.example",
    "705-555-0199",
    { dock: "Door 8" },
  ],
  [
    "oven",
    "Oshawa Oven Works",
    "Oshawa",
    "oshawaoven.example",
    "905-555-0129",
    { dock: "Door 9" },
  ],
  [
    "meats",
    "Milton Meats",
    "Milton",
    "miltonmeats.example",
    "905-555-0155",
    { dock: "Door 4" },
  ],
  [
    "ice",
    "Etobicoke Ice Logistics",
    "Etobicoke",
    "etobicokeice.example",
    "416-555-0171",
    { carrier: "Etobicoke Ice Logistics" },
  ],
  [
    "flour",
    "Hamilton Flour Exchange",
    "Hamilton",
    "hamiltonflour.example",
    "905-555-0138",
    { institution: "002", transit: "44001", account: "190334" },
  ],
].map(([id, company, city, domain, numberOnFile, onFile]) => ({
  id: id as string,
  company: company as string,
  city: city as string,
  domain: domain as string,
  numberOnFile: numberOnFile as string,
  onFile: onFile as Record<string, string>,
}));

export const REQUESTS: { id: string; dual: boolean; en: string; fr: string }[] =
  [
    {
      id: "bank_change",
      dual: true,
      en: "Bank change",
      fr: "Changement bancaire",
    },
    {
      id: "destination_change",
      dual: true,
      en: "Destination change",
      fr: "Changement de destination",
    },
    {
      id: "credential_request",
      dual: true,
      en: "Access request",
      fr: "Demande d'accès",
    },
    {
      id: "new_carrier",
      dual: true,
      en: "New carrier",
      fr: "Nouveau transporteur",
    },
    {
      id: "ot_remote",
      dual: false,
      en: "Plant remote access",
      fr: "Accès à distance à l'usine",
    },
    {
      id: "first_order_credit",
      dual: false,
      en: "First-order credit",
      fr: "Crédit de première commande",
    },
    {
      id: "truck_status_update",
      dual: false,
      en: "Truck status",
      fr: "État du camion",
    },
    {
      id: "schedule_only",
      dual: false,
      en: "Schedule only",
      fr: "Horaire seulement",
    },
    {
      id: "bol_pod_alter",
      dual: false,
      en: "Bill or seal change",
      fr: "Changement de connaissement ou de sceau",
    },
  ];

const OOB: Record<string, string[]> = {
  bank_change: [
    "Call the number already on file. Do not use a number written in the message.",
    "Read back the institution, transit, and account. Ask them to confirm the old account ending.",
    "Write the name of the person you spoke with.",
  ],
  destination_change: [
    "Call the planner on file, not the number in the message.",
    "Confirm the dock door and the seal that should still be on the trailer.",
    "Write who confirmed the stop.",
  ],
  credential_request: [
    "Call the person on file and ask if they sent an access request.",
    "Do not open the link in the message.",
    "Write who you spoke with.",
  ],
  new_carrier: [
    "Call the shipper on file and ask which carrier is booked.",
    "Check the carrier name against the directory.",
    "Write who confirmed the truck.",
  ],
  ot_remote: [
    "Call the plant lead on file before anyone shares a remote session.",
    "Confirm the work window and which machine.",
  ],
  first_order_credit: [
    "Call the sales contact on file before extending credit.",
  ],
  truck_status_update: [
    "Match the load number to the board before you act on a status note.",
  ],
  schedule_only: ["Check the appointment against the dock calendar."],
  bol_pod_alter: [
    "Call the receiver on file before accepting a changed seal or bill.",
  ],
};

export function stepsFor(requestType: string): string[] {
  return OOB[requestType] ?? ["Call the number already on file."];
}

export function isDual(requestType: string): boolean {
  return REQUESTS.find((item) => item.id === requestType)?.dual ?? false;
}

export function requestTitle(requestType: string, lang: string): string {
  const found = REQUESTS.find((item) => item.id === requestType);
  if (!found) return requestType;
  return lang === "fr" ? found.fr : found.en;
}

export function deskFlags(
  raw: string,
  onFileDomain: string,
  onFile: Record<string, string>,
  requested: Record<string, string>,
): string[] {
  const flags: string[] = [];
  const emails = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  for (const email of emails) {
    const domain = email.split("@")[1]?.toLowerCase() ?? "";
    if (
      ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"].includes(domain)
    ) {
      flags.push(`Free mailbox: ${email}`);
    }
    if (domain && domain !== onFileDomain)
      flags.push(`Not the domain on file (${onFileDomain})`);
  }
  if (/urgent|immediately|asap|do not call|today only/i.test(raw))
    flags.push("The message rushes you or says not to call");
  if (/eft|transit|account|bank|void cheque|interac/i.test(raw))
    flags.push("Payment instructions are in the message");
  if (/dock|divert|yard|destination/i.test(raw))
    flags.push("A dock or destination may be changing");
  if (/carrier|broker/i.test(raw)) flags.push("A carrier is being introduced");
  if (/portal|sign-?in|remote/i.test(raw))
    flags.push("The message asks for access");
  for (const key of Object.keys(requested)) {
    if (onFile[key] && requested[key] && onFile[key] !== requested[key])
      flags.push(`${key} does not match the file`);
  }
  flags.push("A mail check does not prove this request is real");
  return [...new Set(flags)];
}

export function jevLabels(raw: string, requestType: string): string[] {
  const labels: string[] = [];
  if (requestType === "bank_change" || /eft|transit|account/i.test(raw))
    labels.push("payment-redirection");
  if (/urgent|do not call|asap/i.test(raw)) labels.push("urgency");
  if (requestType === "new_carrier") labels.push("carrier-introduction");
  if (requestType === "destination_change") labels.push("route-change");
  if (requestType === "credential_request" || requestType === "ot_remote")
    labels.push("access-request");
  return labels;
}

export const SCENARIOS: {
  id: string;
  title: string;
  frTitle?: string;
  requestType: string;
  partnerId: string;
  rawText: string;
  requested: Record<string, string>;
}[] = [
  {
    id: "bank",
    title: "Supplier bank change",
    frTitle: "Changement bancaire fournisseur",
    requestType: "bank_change",
    partnerId: "maple",
    rawText:
      "From: accounts@maple-malt-payments.com\nPlease update our EFT before today's settlement. Institution 010, transit 99914, account 9988211. Our usual contact is away. Send payment today and do not call the old number.",
    requested: { institution: "010", transit: "99914", account: "9988211" },
  },
  {
    id: "dock",
    title: "Dock diversion",
    frTitle: "Détournement de quai",
    requestType: "destination_change",
    partnerId: "peel",
    rawText:
      "From: dispatch@peel-produce.co\nUrgent: divert load PP-204 to the yard at 88 Intermodal Court, Brampton. Do not use Door 2. Driver is waiting.",
    requested: { dock: "88 Intermodal Court", destination: "Brampton yard" },
  },
  {
    id: "carrier",
    title: "New carrier",
    frTitle: "Nouveau transporteur",
    requestType: "new_carrier",
    partnerId: "qew",
    rawText:
      "From: booking@northdock-shadow.com\nOur sister company can cover load QE-118 today at a lower rate. Send the dock code to the new driver.",
    requested: { carrier: "North Dock Shadow Logistics" },
  },
  {
    id: "access",
    title: "Access request",
    frTitle: "Demande d'accès",
    requestType: "credential_request",
    partnerId: "don",
    rawText:
      "From: it-help@donvalleyfrozen-portal.com\nYour vendor portal expires in one hour. Open this link and sign in so we can release the invoice.",
    requested: { access: "vendor portal link" },
  },
  {
    id: "ot",
    title: "Plant remote access",
    frTitle: "Accès à distance à l'usine",
    requestType: "ot_remote",
    partnerId: "ice",
    rawText:
      "From: support@reefer-assist.com\nCompressor alarm on door 4. We need remote access to the controller in the next 15 minutes or the load spoils.",
    requested: { access: "reefer controller" },
  },
  {
    id: "haul",
    title: "Mid-haul stop change",
    frTitle: "Changement d'arrêt en route",
    requestType: "destination_change",
    partnerId: "meats",
    rawText:
      "From: night@milton-meats.net\nChange the Milton delivery to a trailer drop in Vaughan. Confirm by reply. Do not call, the planner is driving.",
    requested: { dock: "Vaughan drop lot", destination: "Vaughan" },
  },
];

export function seedLoads(): Load[] {
  return [
    {
      id: "ld1",
      loadRef: "LO-4419",
      commodity: "Malt",
      origin: "Mississauga malt house",
      destination: "Lake Ontario Cold Storage",
      dock: "Door 4",
      carrier: "QEW Cold Carriers",
      plate: "BLNT 214",
      trailer: "TR-88",
      seal: "SL-4419",
      setpoint: "-18 C",
      status: "rolling",
      eta: "Today 16:40",
      driverId: "seed_user_devon",
    },
    {
      id: "ld2",
      loadRef: "LO-4420",
      commodity: "Poultry",
      origin: "Burlington",
      destination: "Lake Ontario Cold Storage",
      dock: "Door 6",
      carrier: "QEW Cold Carriers",
      plate: "CHLK 902",
      trailer: "TR-12",
      seal: "SL-2201",
      setpoint: "-20 C",
      status: "loaded",
      eta: "Today 18:10",
      driverId: "seed_user_samir",
    },
    {
      id: "ld3",
      loadRef: "LO-4422",
      commodity: "Dairy",
      origin: "Hamilton",
      destination: "Lake Ontario Cold Storage",
      dock: "Door 1",
      carrier: "York Freight Lines",
      plate: "MILK 330",
      trailer: "TR-41",
      seal: "SL-7730",
      setpoint: "2 C",
      status: "loaded",
      eta: "Tomorrow 06:00",
      driverId: "seed_user_devon",
    },
    {
      id: "ld4",
      loadRef: "LO-4388",
      commodity: "Flour",
      origin: "Lake Ontario Cold Storage",
      destination: "Hamilton Flour Exchange",
      dock: "Door 9",
      carrier: "Etobicoke Ice Logistics",
      plate: "FLUR 015",
      trailer: "TR-03",
      seal: "SL-1008",
      setpoint: "ambient",
      status: "delayed",
      eta: "Today 19:30",
      driverId: "seed_user_samir",
    },
  ];
}
