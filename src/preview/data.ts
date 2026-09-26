export type Role = "supplier" | "driver" | "receiver" | "admin" | "logistics" | "warehouse";
export type DeskCase = {
  id: string;
  requestType: string;
  counterparty: string;
  contactId: string;
  createdById: string;
  numberOnFile: string;
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
  scheduledDock: string;
  etaIso: string;
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
  /** Warehouse or yard holding the load when no driver has it. */
  facility?: string;
};

export type Note = {
  id: string;
  kind: string;
  audience: Role[];
  title: string;
  body: string;
  href: string;
  createdAt: string;
  read: boolean;
};

/** Suggested job titles per role; the field also accepts free text. */
export const JOB_TITLES: Record<Role, string[]> = {
  supplier: ["Accounts payable", "Accounts receivable", "Dispatch coordinator", "Vendor relations", "Sales representative"],
  driver: ["Driver", "Long-haul driver", "Local delivery driver", "Owner-operator", "Relay driver"],
  receiver: ["Receiver", "Dock supervisor", "Shipping and receiving clerk", "Warehouse lead", "Inventory control"],
  admin: ["Owner", "General manager", "IT administrator", "Controller"],
  logistics: ["Logistics coordinator", "Freight broker", "Customs compliance", "Route planner", "3PL manager"],
  warehouse: ["Warehouse associate", "Forklift operator", "Yard jockey", "Cold storage lead", "Inventory control"],
};

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

/** Types a person can raise as a new request. Truck status comes from driver taps, not requests. */
export const NEW_REQUEST_TYPES = REQUESTS.filter((item) => item.id !== "truck_status_update");

/** Fields a request of each type changes; the composer asks for them and the payload records them. */
export const REQUEST_FIELDS: Record<string, ("institution" | "transit" | "account" | "dock" | "destination" | "carrier" | "seal")[]> = {
  bank_change: ["institution", "transit", "account"],
  destination_change: ["dock", "destination"],
  new_carrier: ["carrier"],
  bol_pod_alter: ["seal"],
};

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
  {
    id: "bol",
    title: "Bill of lading correction",
    frTitle: "Correction de connaissement",
    requestType: "bol_pod_alter",
    partnerId: "halton",
    rawText:
      "From: shipping@halton-poultry-docs.com\nThe seal on the BOL for load HP-311 was typed wrong. Please change it to SL-9902 before the receiver signs. No need to call, we are short staffed.",
    requested: { seal: "SL-9902" },
  },
  {
    id: "credit",
    title: "First-order credit terms",
    frTitle: "Conditions de crédit, première commande",
    requestType: "first_order_credit",
    partnerId: "grain",
    rawText:
      "From: treasury@wellington-grain-ca.com\nWe are placing our first bulk order this week. Please release it on net-60 terms today; our credit application will follow.",
    requested: {},
  },
  {
    id: "schedule",
    title: "Pickup time change",
    frTitle: "Changement d'heure de ramassage",
    requestType: "schedule_only",
    partnerId: "harbour",
    rawText:
      "From: receiving@harbourfront-seafood.net\nMove tomorrow's pickup from 06:00 to 02:00. The driver will be a new contractor, please give them the gate code.",
    requested: {},
  },
];
