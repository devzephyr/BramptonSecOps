import { canonicalize, sha256Hex } from "@/lib/canonical";

export type PayloadFields = Record<string, string>;

export function buildPayload(input: {
  caseId: string;
  orgId: string;
  requestType: string;
  counterparty: string;
  onFile: PayloadFields;
  requested: PayloadFields;
  rawText: string;
  evidenceHashes?: string[];
}) {
  const body = {
    v: 1,
    caseId: input.caseId,
    orgId: input.orgId,
    requestType: input.requestType,
    counterparty: input.counterparty,
    onFile: input.onFile,
    requested: input.requested,
    rawTextSha256: sha256Hex(input.rawText),
    evidenceHashes: [...(input.evidenceHashes ?? [])].sort(),
  };
  const canonical = canonicalize(body);
  return { body, canonical, payloadHash: sha256Hex(canonical) };
}
