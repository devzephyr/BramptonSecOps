"use client";

import type { DocTypeName } from "@/lib/policy";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import type { DeskCase, Load, Note, Role } from "@/preview/data";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  title?: string | null;
  orgName?: string;
};

export class DeskApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function isServerUnavailable(status: number) {
  // 404 is a normal API "not found" (unknown account, missing route message).
  // Only treat gateway/upstream failures as "Next is not reachable".
  return status === 502 || status === 503 || status === 504;
}

export async function fetchSession(): Promise<SessionUser | null> {
  const res = await fetch("/api/session", { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) {
    if (isServerUnavailable(res.status)) {
      throw new DeskApiError(res.status, "Server unavailable");
    }
    throw new DeskApiError(res.status, "Could not read session");
  }
  const body = (await parseJson(res)) as { user?: SessionUser } | null;
  return body?.user ?? null;
}

export async function signOutSession() {
  const res = await fetch("/api/session/sign-out", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok && !isServerUnavailable(res.status)) {
    throw new DeskApiError(res.status, "Sign out failed");
  }
}

async function failMessage(res: Response, fallback: string) {
  const body = (await parseJson(res)) as { error?: string } | null;
  return body?.error || fallback;
}

export type SignInIdentity = { username: string; org: string; enrollmentToken?: string };

export async function createPasskey(identity: SignInIdentity) {
  const optRes = await fetch("/api/webauthn/register-options", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(identity),
  });
  if (!optRes.ok) {
    throw new DeskApiError(
      optRes.status,
      await failMessage(optRes, "Could not start passkey registration"),
    );
  }
  const { optionsJSON } = (await optRes.json()) as { optionsJSON: unknown };
  const attResp = await startRegistration({
    optionsJSON: optionsJSON as Parameters<
      typeof startRegistration
    >[0]["optionsJSON"],
  });
  const verifyRes = await fetch("/api/webauthn/register-verify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...identity, response: attResp }),
  });
  if (!verifyRes.ok) {
    throw new DeskApiError(
      verifyRes.status,
      await failMessage(verifyRes, "Passkey registration was not verified"),
    );
  }
}

export async function signInWithPasskey(identity: SignInIdentity) {
  const optRes = await fetch("/api/webauthn/sign-in-options", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(identity),
  });
  if (!optRes.ok) {
    throw new DeskApiError(
      optRes.status,
      await failMessage(optRes, "Could not start passkey sign-in"),
    );
  }
  const { hasPasskey, optionsJSON } = (await optRes.json()) as {
    hasPasskey?: boolean;
    optionsJSON?: unknown;
  };
  if (!hasPasskey || !optionsJSON) {
    throw new DeskApiError(
      404,
      "No passkey is registered for this account yet.",
    );
  }
  const authResp = await startAuthentication({
    optionsJSON: optionsJSON as Parameters<
      typeof startAuthentication
    >[0]["optionsJSON"],
  });
  const verifyRes = await fetch("/api/webauthn/sign-in-verify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response: authResp }),
  });
  if (!verifyRes.ok) {
    throw new DeskApiError(
      verifyRes.status,
      await failMessage(verifyRes, "Passkey sign-in was not verified"),
    );
  }
}

type ApiNote = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href?: string | null;
  createdAt: string;
  readAt?: string | null;
  role?: Role | null;
  userId?: string | null;
};

const ALL_ROLES: Role[] = [
  "supplier",
  "manager",
  "driver",
  "receiver",
  "admin",
];

function audienceForNote(row: ApiNote): Role[] {
  if (row.role) return [row.role];
  return ALL_ROLES;
}

export async function fetchNotifications(): Promise<Note[]> {
  const res = await fetch("/api/notifications", { credentials: "include" });
  if (!res.ok) return [];
  const body = (await parseJson(res)) as { notifications?: ApiNote[] } | null;
  return (body?.notifications ?? []).map((row) => ({
    id: row.id,
    kind: row.kind,
    audience: audienceForNote(row),
    title: row.title,
    body: row.body,
    href: row.href ?? "",
    createdAt: row.createdAt,
    read: Boolean(row.readAt),
  }));
}

type ApiLoad = {
  id: string;
  loadRef: string;
  commodity: string;
  origin: string;
  destination: string;
  carrierName?: string;
  plate: string;
  trailer: string;
  sealNumber?: string | null;
  reeferSetpoint?: string | null;
  currentStatus?: string;
  scheduledDock?: string | null;
  approvedDock?: string | null;
  eta?: string | null;
  driverUserId?: string | null;
  lat?: number | null;
  lng?: number | null;
  positionAt?: string | null;
};

export type NewLoad = {
  loadRef: string;
  commodity: string;
  origin: string;
  destination: string;
  carrierName: string;
  plate: string;
  trailer: string;
  scheduledDock?: string;
  sealNumber?: string;
  reeferSetpoint?: string;
  eta?: string;
  driverUserId?: string;
};

export async function createLoad(input: NewLoad): Promise<void> {
  const res = await fetch("/api/loads", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new DeskApiError(res.status, await failMessage(res, "Could not create load"));
  }
}

export type LoadPatch = Partial<Omit<NewLoad, "loadRef" | "driverUserId">> & {
  driverUserId?: string | null;
  handoffNote?: string;
};

export async function updateLoad(id: string, patch: LoadPatch): Promise<void> {
  const res = await fetch(`/api/loads/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new DeskApiError(res.status, await failMessage(res, "Could not update load"));
  }
}

export type LoadEvent = {
  id: string;
  eventType: string;
  note: string | null;
  actor: string;
  createdAt: string;
};

export async function fetchLoadEvents(id: string): Promise<LoadEvent[]> {
  const res = await fetch(`/api/loads/${encodeURIComponent(id)}`, { credentials: "include" });
  if (!res.ok) return [];
  const body = (await parseJson(res)) as { events?: LoadEvent[] } | null;
  return body?.events ?? [];
}

export async function markNotificationRead(id: string) {
  const res = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    throw new DeskApiError(res.status, await failMessage(res, "Could not dismiss alert"));
  }
}

export async function fetchLoads(): Promise<Load[]> {
  const res = await fetch("/api/loads", { credentials: "include" });
  if (!res.ok) return [];
  const body = (await parseJson(res)) as { loads?: ApiLoad[] } | null;
  return (body?.loads ?? []).map((row) => ({
    id: row.id,
    loadRef: row.loadRef,
    commodity: row.commodity,
    origin: row.origin,
    destination: row.destination,
    dock: row.approvedDock || row.scheduledDock || "",
    scheduledDock: row.scheduledDock ?? "",
    etaIso: row.eta ?? "",
    carrier: row.carrierName ?? "",
    plate: row.plate,
    trailer: row.trailer,
    seal: row.sealNumber ?? "",
    setpoint: row.reeferSetpoint ?? "",
    status: row.currentStatus ?? "scheduled",
    eta: row.eta
      ? new Date(row.eta).toLocaleString("en-CA", {
          timeZone: "America/Toronto",
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "",
    driverId: row.driverUserId ?? "",
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    positionAt: row.positionAt ?? null,
  }));
}

export async function postLoadStatus(loadId: string, status: string) {
  const res = await fetch(`/api/loads/${encodeURIComponent(loadId)}/status`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType: status }),
  });
  if (!res.ok) {
    throw new DeskApiError(res.status, await failMessage(res, "Could not update load status"));
  }
}

export async function approveWithPasskey(caseId: string) {
  const optRes = await fetch("/api/webauthn/approve-options", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caseId }),
  });
  if (!optRes.ok) {
    throw new DeskApiError(
      optRes.status,
      await failMessage(optRes, "Could not start approval ceremony"),
    );
  }
  const { optionsJSON, ceremonyId } = (await optRes.json()) as {
    optionsJSON: unknown;
    ceremonyId: string;
  };
  const authResp = await startAuthentication({
    optionsJSON: optionsJSON as Parameters<
      typeof startAuthentication
    >[0]["optionsJSON"],
  });
  const verifyRes = await fetch("/api/webauthn/approve-verify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ceremonyId, response: authResp }),
  });
  if (!verifyRes.ok) {
    throw new DeskApiError(
      verifyRes.status,
      await failMessage(verifyRes, "Approval was not verified"),
    );
  }
  return parseJson(verifyRes);
}

export async function postPosition(loadId: string, lat: number, lng: number) {
  const res = await fetch(`/api/loads/${encodeURIComponent(loadId)}/position`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng }),
  });
  if (!res.ok) {
    throw new DeskApiError(res.status, await failMessage(res, "Could not update position"));
  }
  return parseJson(res);
}

export type CaseMessage = {
  id: string;
  envelopes: Record<string, { type: number; body: string }>;
  bodyHash: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
  own: boolean;
};

export async function fetchMessages(caseId: string): Promise<CaseMessage[]> {
  const res = await fetch(
    `/api/verify-cases/${encodeURIComponent(caseId)}/messages`,
    { credentials: "include" },
  );
  if (!res.ok) return [];
  const body = (await parseJson(res)) as { messages?: CaseMessage[] } | null;
  return body?.messages ?? [];
}

export async function postMessage(
  caseId: string,
  envelopes: Record<string, { type: number; body: string }>,
  bodyHash: string,
): Promise<CaseMessage> {
  const res = await fetch(
    `/api/verify-cases/${encodeURIComponent(caseId)}/messages`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ envelopes, bodyHash }),
    },
  );
  if (!res.ok) {
    throw new DeskApiError(res.status, await failMessage(res, "Could not send message"));
  }
  return (await parseJson(res)) as CaseMessage;
}

export type CaseDocument = {
  id: string;
  label: string;
  contentType: string;
  byteSize: number;
  contentHash: string;
  docType: DocTypeName;
  docNumber: string | null;
  amountCents: number | null;
  currency: string | null;
  caseId: string | null;
  loadId: string | null;
  loadRef: string | null;
  counterparty: string | null;
  uploadedBy: string | null;
  createdAt: string;
};

export async function fetchDocuments(filter: {
  caseId?: string;
  loadId?: string;
  docType?: DocTypeName;
}): Promise<CaseDocument[]> {
  const params = new URLSearchParams();
  if (filter.caseId) params.set("caseId", filter.caseId);
  if (filter.loadId) params.set("loadId", filter.loadId);
  if (filter.docType) params.set("docType", filter.docType);
  const res = await fetch(`/api/documents?${params}`, { credentials: "include" });
  if (!res.ok) {
    throw new DeskApiError(res.status, await failMessage(res, "Could not load documents"));
  }
  const body = (await parseJson(res)) as { documents?: CaseDocument[] } | null;
  return body?.documents ?? [];
}

export function documentDownloadUrl(id: string) {
  return `/api/documents/${encodeURIComponent(id)}`;
}

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Re-encode large photos so they fit the upload limit; other files pass through untouched. */
async function fitForUpload(file: File): Promise<Blob> {
  if (file.size <= MAX_UPLOAD_BYTES || !file.type.startsWith("image/")) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  for (const edge of [2560, 1920, 1280]) {
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (blob && blob.size <= MAX_UPLOAD_BYTES) {
      bitmap.close();
      return blob;
    }
  }
  bitmap.close();
  return file;
}

export async function uploadEvidence(input: {
  file: File;
  label: string;
  caseId?: string;
  loadId?: string;
  docType?: DocTypeName;
  docNumber?: string;
  amount?: string;
  currency?: string;
}): Promise<{ id: string; contentHash: string }> {
  const body = await fitForUpload(input.file);
  if (body.size > MAX_UPLOAD_BYTES) {
    throw new DeskApiError(413, "File is larger than 4 MB.");
  }
  const params = new URLSearchParams({ label: input.label });
  if (input.caseId) params.set("caseId", input.caseId);
  if (input.loadId) params.set("loadId", input.loadId);
  if (input.docType) params.set("docType", input.docType);
  if (input.docNumber) params.set("docNumber", input.docNumber);
  if (input.amount) params.set("amount", input.amount);
  if (input.currency) params.set("currency", input.currency);
  const res = await fetch(`/api/evidence/upload?${params}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": body.type || "application/octet-stream" },
    body,
  });
  if (!res.ok) {
    throw new DeskApiError(res.status, await failMessage(res, "Upload failed"));
  }
  return (await parseJson(res)) as { id: string; contentHash: string };
}

export type ApiCase = {
  id: string;
  requestType: string;
  counterparty: string;
  contactId: string | null;
  createdById: string;
  numberOnFile: string | null;
  rawText?: string;
  onFile: unknown;
  requested: unknown;
  flags: unknown;
  oobSteps: unknown;
  oobAck: { steps: unknown; note: unknown } | null;
  payloadCanonical: string;
  payloadHash: string;
  status: string;
  dualControl: boolean;
  publicToken: string | null;
  jev: unknown;
  approvals: { userId: string; name: string; role: string; at: string }[] | null;
};

export type DeskCaseShape = DeskCase;

function stringRecord(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") out[key] = entry;
    else if (entry != null) out[key] = String(entry);
  }
  return out;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (typeof entry === "string") return entry;
    if (typeof entry === "object" && entry !== null && "detail" in entry) {
      return String((entry as { detail: unknown }).detail);
    }
    return String(entry);
  });
}

function jevLabels(value: unknown): string[] {
  if (Array.isArray(value)) return stringList(value);
  if (typeof value === "object" && value !== null && "labels" in value) {
    return stringList((value as { labels: unknown }).labels);
  }
  return [];
}

export function mapApiCase(row: ApiCase): DeskCase {
  const steps = stringList(row.oobSteps);
  const done = Array.isArray(row.oobAck?.steps)
    ? (row.oobAck.steps as unknown[]).map(Boolean)
    : steps.map(() => false);
  while (done.length < steps.length) done.push(false);
  return {
    id: row.id,
    requestType: row.requestType,
    counterparty: row.counterparty,
    contactId: row.contactId ?? "",
    createdById: row.createdById,
    numberOnFile: row.numberOnFile ?? "",
    rawText: row.rawText ?? "",
    onFile: stringRecord(row.onFile),
    requested: stringRecord(row.requested),
    flags: stringList(row.flags),
    oobSteps: steps,
    oobDone: done.slice(0, steps.length),
    oobNote: typeof row.oobAck?.note === "string" ? row.oobAck.note : "",
    canonical: row.payloadCanonical,
    payloadHash: row.payloadHash,
    dualControl: row.dualControl,
    status: row.status,
    approvals: Array.isArray(row.approvals)
      ? row.approvals.map((item) => ({ ...item, role: item.role as Role }))
      : [],
    token: row.publicToken,
    jev: jevLabels(row.jev),
  };
}

export async function fetchCases(): Promise<DeskCase[]> {
  const res = await fetch("/api/verify-cases", { credentials: "include" });
  if (!res.ok) return [];
  const body = (await parseJson(res)) as { cases?: ApiCase[] } | null;
  return (body?.cases ?? []).map(mapApiCase);
}

export async function fetchCase(id: string): Promise<DeskCase | null> {
  const res = await fetch(`/api/verify-cases/${encodeURIComponent(id)}`, {
    credentials: "include",
  });
  if (!res.ok) return null;
  return mapApiCase((await parseJson(res)) as ApiCase);
}

export async function submitCase(input: {
  requestType: string;
  contactId: string;
  rawText: string;
  requested: Record<string, string>;
}): Promise<DeskCase> {
  const res = await fetch("/api/verify-cases", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new DeskApiError(res.status, await failMessage(res, "Could not submit case"));
  }
  return mapApiCase((await parseJson(res)) as ApiCase);
}

export async function patchOob(
  id: string,
  patch: { oobStepIndex?: number; oobStepDone?: boolean; oobNote?: string },
): Promise<DeskCase> {
  const res = await fetch(`/api/verify-cases/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new DeskApiError(res.status, await failMessage(res, "Could not save checklist"));
  }
  return mapApiCase((await parseJson(res)) as ApiCase);
}

export async function revokeCase(id: string): Promise<void> {
  const res = await fetch(`/api/verify-cases/${encodeURIComponent(id)}/revoke`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    throw new DeskApiError(res.status, await failMessage(res, "Could not revoke case"));
  }
}

export type Contact = {
  id: string;
  seedKey: string | null;
  company: string;
  name: string;
  roleLabel: string;
  city: string;
  domain: string;
  numberOnFile: string;
  onFile: Record<string, string>;
};

export async function fetchDirectory(): Promise<Contact[]> {
  const res = await fetch("/api/directory", { credentials: "include" });
  if (!res.ok) return [];
  const body = (await parseJson(res)) as { contacts?: Contact[] } | null;
  return body?.contacts ?? [];
}

export type NewContact = {
  company: string;
  city: string;
  domain: string;
  numberOnFile: string;
  name?: string;
  institution?: string;
  transit?: string;
  account?: string;
  dock?: string;
  carrier?: string;
};

export async function addContact(input: NewContact): Promise<Contact> {
  const res = await fetch("/api/directory", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new DeskApiError(res.status, await failMessage(res, "Could not add contact"));
  }
  return (await parseJson(res)) as Contact;
}

export type NewOrg = {
  org: { id: string; slug: string; name: string };
  username: string;
  enrollmentToken: string;
};

export async function createOrg(input: {
  name: string;
  city?: string;
  province?: string;
  displayName: string;
  username: string;
}): Promise<NewOrg> {
  const res = await fetch("/api/orgs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new DeskApiError(res.status, await failMessage(res, "Could not create organization"));
  }
  return (await parseJson(res)) as NewOrg;
}

export type TeamMember = {
  id: string;
  username: string | null;
  name: string;
  role: string;
  title: string | null;
  hasKeys: boolean;
  devices: number;
  createdAt: string;
};

export async function fetchTeam(): Promise<TeamMember[]> {
  const res = await fetch("/api/orgs/users", { credentials: "include" });
  if (!res.ok) return [];
  const body = (await parseJson(res)) as { users?: TeamMember[] } | null;
  return body?.users ?? [];
}

export async function addTeammate(input: {
  username: string;
  name: string;
  role: string;
  title?: string;
}): Promise<TeamMember> {
  const res = await fetch("/api/orgs/users", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new DeskApiError(res.status, await failMessage(res, "Could not add teammate"));
  }
  return (await parseJson(res)) as TeamMember;
}

export async function updateTeammate(
  id: string,
  patch: { name?: string; role?: string; title?: string },
): Promise<void> {
  const res = await fetch(`/api/orgs/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new DeskApiError(res.status, await failMessage(res, "Could not update teammate"));
  }
}

export type MemberCredential = {
  id: string;
  createdAt: string;
  transports: string | null;
  deviceType: string | null;
  backedUp: boolean;
};

export async function fetchCredentials(userId: string): Promise<MemberCredential[]> {
  const res = await fetch(`/api/orgs/users/${encodeURIComponent(userId)}/credentials`, {
    credentials: "include",
  });
  if (!res.ok) return [];
  const body = (await parseJson(res)) as { credentials?: MemberCredential[] } | null;
  return body?.credentials ?? [];
}

export async function issueEnrollmentCode(userId: string): Promise<{ username: string | null; code: string }> {
  const res = await fetch(`/api/orgs/users/${encodeURIComponent(userId)}/enrollment`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    throw new DeskApiError(res.status, await failMessage(res, "Could not issue code"));
  }
  return (await parseJson(res)) as { username: string | null; code: string };
}

export async function revokeCredential(userId: string, credentialId: string): Promise<void> {
  const res = await fetch(`/api/orgs/users/${encodeURIComponent(userId)}/credentials`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credentialId }),
  });
  if (!res.ok) {
    throw new DeskApiError(res.status, await failMessage(res, "Could not revoke credential"));
  }
}
