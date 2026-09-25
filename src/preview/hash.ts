export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(",")}}`;
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(buf)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function buildCanonical(input: {
  id: string;
  requestType: string;
  counterparty: string;
  onFile: Record<string, string>;
  requested: Record<string, string>;
  rawText: string;
}) {
  const rawTextSha256 = await sha256Hex(input.rawText);
  const canonical = canonicalize({
    v: 1,
    caseId: input.id,
    requestType: input.requestType,
    counterparty: input.counterparty,
    onFile: input.onFile,
    requested: input.requested,
    rawTextSha256,
  });
  const payloadHash = await sha256Hex(canonical);
  return { canonical, payloadHash };
}

export function randomId(prefix: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `${prefix}_${[...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
