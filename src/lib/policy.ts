import type { Role } from "@prisma/client";

/** Roles that may read or act on verify cases, their threads, documents, and the directory. */
export const CASE_STAFF: Role[] = ["supplier", "logistics", "admin"];

/** Roles with manager-grade power: approvals, team management, duty oversight. */
export const MANAGERS: Role[] = ["logistics", "admin"];

/** Roles that work receiving docks and custody transfers. */
export const RECEIVERS: Role[] = ["receiver", "warehouse"];

/** Mirrors the DocType enum in prisma/schema.prisma; the client needs it without importing Prisma. */
export const DOC_TYPES = [
  "bill_of_lading",
  "proof_of_delivery",
  "invoice",
  "receipt",
  "rate_confirmation",
  "packing_list",
  "customs",
  "insurance",
  "other",
] as const;
export type DocTypeName = (typeof DOC_TYPES)[number];

export function isDocType(value: string | null): value is DocTypeName {
  return value !== null && (DOC_TYPES as readonly string[]).includes(value);
}

export const LOAD_REF_PREFIX = "LO-";

/** "4419", "lo-4419" or "LO 4419" -> "LO-4419"; anything that is not a load number -> null. */
export function normalizeLoadRef(raw: string): string | null {
  const digits = raw.trim().toUpperCase().replace(/^LO[-\s]*/, "");
  return /^\d{1,10}$/.test(digits) ? `${LOAD_REF_PREFIX}${digits}` : null;
}

export const CURRENCIES = ["CAD", "USD"] as const;

/** "1,234.50" -> 123450. Returns null for blank, undefined for anything that is not a non-negative amount with up to 2 decimals. */
export function parseAmountCents(raw: string | null): number | null | undefined {
  const text = (raw ?? "").replace(/[,\s$]/g, "");
  if (!text) return null;
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(text)) return undefined;
  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export const DUAL_CONTROL_TYPES = new Set([
  "bank_change",
  "destination_change",
  "credential_request",
  "new_carrier",
]);

export const DRIVER_STATUS = new Set([
  "loaded",
  "rolling",
  "fifteen_min",
  "arrived",
  "delayed",
]);

export function approvalProgress(input: {
  dualControl: boolean;
  approverIds: string[];
}): "need_first" | "need_second" | "complete" {
  const distinct = [...new Set(input.approverIds)];
  if (!input.dualControl) {
    return distinct.length >= 1 ? "complete" : "need_first";
  }
  if (distinct.length >= 2) return "complete";
  if (distinct.length === 1) return "need_second";
  return "need_first";
}

export function sameUserAlreadyApproved(
  approverIds: string[],
  userId: string,
): boolean {
  return approverIds.includes(userId);
}

export function redactValue(key: string, value: string): string {
  const sensitive = /account|transit|institution|seal/i.test(key);
  if (!sensitive) return value;
  const tail = value.slice(-4);
  return `••••${tail}`;
}
