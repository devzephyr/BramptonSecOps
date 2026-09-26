import type { Role } from "@prisma/client";

/** Roles that may read or act on verify cases, their threads, documents, and the directory. */
export const CASE_STAFF: Role[] = ["supplier", "manager", "admin"];

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
