"use client";

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
  return status === 404 || status === 501 || status === 502 || status === 503;
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

export type SignInIdentity = { username: string; org: string };

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
    carrier: row.carrierName ?? "",
    plate: row.plate,
    trailer: row.trailer,
    seal: row.sealNumber ?? "",
    setpoint: row.reeferSetpoint ?? "",
    status: row.currentStatus ?? "scheduled",
    eta: row.eta
      ? new Date(row.eta).toLocaleString("en-CA", {
          timeZone: "America/Toronto",
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
    throw new DeskApiError(res.status, "Could not update load status");
  }
}

export async function approveWithPasskey(caseId: string) {  const optRes = await fetch("/api/webauthn/approve-options", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caseId }),
  });
  if (!optRes.ok) {
    throw new DeskApiError(optRes.status, "Could not start approval ceremony");
  }
  const { optionsJSON } = (await optRes.json()) as { optionsJSON: unknown };
  const authResp = await startAuthentication({
    optionsJSON: optionsJSON as Parameters<
      typeof startAuthentication
    >[0]["optionsJSON"],
  });
  const verifyRes = await fetch("/api/webauthn/approve-verify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caseId, response: authResp }),
  });
  if (!verifyRes.ok) {
    throw new DeskApiError(verifyRes.status, "Approval was not verified");
  }
  return parseJson(verifyRes);
}

export async function postPosition(loadId: string, lat: number, lng: number) {  const res = await fetch(`/api/loads/${encodeURIComponent(loadId)}/position`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng }),
  });
  if (!res.ok) {
    throw new DeskApiError(res.status, "Could not update position");
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
  createdAt: string;
};

export async function fetchDocuments(caseId: string): Promise<CaseDocument[]> {
  const res = await fetch(
    `/api/verify-cases/${encodeURIComponent(caseId)}/documents`,
    { credentials: "include" },
  );
  if (!res.ok) return [];
  const body = (await parseJson(res)) as { documents?: CaseDocument[] } | null;
  return body?.documents ?? [];
}

async function sha256HexFile(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function uploadEvidence(input: {
  file: File;
  label: string;
  caseId?: string;
  loadId?: string;
}): Promise<{ id: string; contentHash: string }> {
  const presignRes = await fetch("/api/evidence/presign", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: input.label, contentType: input.file.type || "application/octet-stream" }),
  });
  if (!presignRes.ok) {
    throw new DeskApiError(
      presignRes.status,
      await failMessage(presignRes, "Could not start upload"),
    );
  }
  const { mode, uploadUrl, key } = (await presignRes.json()) as {
    mode: string;
    uploadUrl: string;
    key: string;
  };

  const bytes = await input.file.arrayBuffer();
  let contentHash: string;
  let byteSize = bytes.byteLength;
  if (mode === "local") {
    const putRes = await fetch(uploadUrl, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": input.file.type || "application/octet-stream" },
      body: bytes,
    });
    if (!putRes.ok) {
      throw new DeskApiError(putRes.status, await failMessage(putRes, "Upload failed"));
    }
    const putBody = (await parseJson(putRes)) as {
      contentHash?: string;
      byteSize?: number;
    } | null;
    contentHash = putBody?.contentHash ?? (await sha256HexFile(bytes));
    byteSize = putBody?.byteSize ?? byteSize;
  } else {
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": input.file.type || "application/octet-stream" },
      body: bytes,
    });
    if (!putRes.ok) {
      throw new DeskApiError(putRes.status, "Upload failed");
    }
    contentHash = await sha256HexFile(bytes);
  }

  const doneRes = await fetch("/api/evidence/complete", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key,
      contentHash,
      label: input.label,
      contentType: input.file.type || "application/octet-stream",
      byteSize,
      caseId: input.caseId,
      loadId: input.loadId,
    }),
  });
  if (!doneRes.ok) {
    throw new DeskApiError(doneRes.status, await failMessage(doneRes, "Upload was not recorded"));
  }
  return (await parseJson(doneRes)) as { id: string; contentHash: string };
}

export type ApiCase = {
  id: string;
  requestType: string;
  counterparty: string;
  contactId: string | null;
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
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
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
    partnerId: row.contactId ?? "",
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
    jev: stringList(row.jev),
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
  counterparty: string;
  rawText: string;
  onFile: Record<string, string>;
  requested: Record<string, string>;
  contactId?: string;
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

export async function patchOob(  id: string,
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

export type NewOrg = {
  org: { id: string; slug: string; name: string };
  username: string;
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
