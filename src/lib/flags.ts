/**
 * Warning signs on a request, as codes plus the values they mention. The words live in i18n,
 * so a French desk reads French. Older rows stored English sentences; `toFlagView` maps those
 * back to codes so they translate too.
 */
export const FLAG_CODES = [
  "FREE_EMAIL_DOMAIN",
  "LOOKALIKE_DOMAIN",
  "DOMAIN_NOT_ON_FILE",
  "HOMOGLYPH",
  "URGENCY_OR_SECRECY",
  "PAYMENT_DETAIL_CHANGE",
  "ON_FILE_MISMATCH",
  "CREDENTIAL_ASK",
  "OT_REMOTE_ACCESS",
  "NEW_CARRIER",
  "DESTINATION_OR_DOCK_CHANGE",
  "DOCUMENT_OR_SEAL_CHANGE",
  "MAIL_AUTH_NOT_CHECKED",
] as const;
export type FlagCode = (typeof FLAG_CODES)[number];

/** A standing reminder, not a finding about this request. Shown apart from the warning signs. */
export const REMINDER_CODES: readonly string[] = ["MAIL_AUTH_NOT_CHECKED"];

export type FlagView = { code: FlagCode | "OTHER"; params: Record<string, string>; text?: string };

export function isFlagCode(value: unknown): value is FlagCode {
  return typeof value === "string" && (FLAG_CODES as readonly string[]).includes(value);
}

const LEGACY: [RegExp, FlagCode, string[]][] = [
  [/^Free mailbox: (.+)$/, "FREE_EMAIL_DOMAIN", ["email"]],
  [/^(\S+) uses a free mailbox domain$/, "FREE_EMAIL_DOMAIN", ["email"]],
  [/^Not the domain on file \((.+)\)$/, "DOMAIN_NOT_ON_FILE", ["onFile"]],
  [/^(\S+) is not the domain on file \((.+)\)\.?$/, "DOMAIN_NOT_ON_FILE", ["domain", "onFile"]],
  [/^(\S+) is not (\S+)\. This is a spelling check/, "LOOKALIKE_DOMAIN", ["domain", "onFile"]],
  [/letters from another alphabet/, "HOMOGLYPH", []],
  [/rushes you|pushes speed/, "URGENCY_OR_SECRECY", []],
  [/^Payment instructions/, "PAYMENT_DETAIL_CHANGE", []],
  [/^(\w+) does not match the file$/, "ON_FILE_MISMATCH", ["field"]],
  [/^(\w+) on file does not match the request\.?$/, "ON_FILE_MISMATCH", ["field"]],
  [/remote access to plant/, "OT_REMOTE_ACCESS", []],
  [/asks for access|open a link or hand over access/, "CREDENTIAL_ASK", []],
  [/carrier (is being introduced|that may not be on file)/, "NEW_CARRIER", []],
  [/^A dock/, "DESTINATION_OR_DOCK_CHANGE", []],
  [/^A seal, bill/, "DOCUMENT_OR_SEAL_CHANGE", []],
  [/mail check does not prove|mail-authentication pass/, "MAIL_AUTH_NOT_CHECKED", []],
];

function fromText(text: string): FlagView {
  for (const [pattern, code, names] of LEGACY) {
    const match = text.match(pattern);
    if (!match) continue;
    const params: Record<string, string> = {};
    names.forEach((name, index) => {
      if (match[index + 1]) params[name] = match[index + 1];
    });
    return { code, params };
  }
  return { code: "OTHER", params: {}, text };
}

/** Accepts a stored flag in any shape the app has written: {code, params}, {code, detail}, or a sentence. */
export function toFlagView(entry: unknown): FlagView {
  if (typeof entry === "string") return fromText(entry);
  if (entry && typeof entry === "object") {
    const row = entry as { code?: unknown; params?: unknown; detail?: unknown };
    if (isFlagCode(row.code)) {
      if (row.params && typeof row.params === "object") {
        return { code: row.code, params: row.params as Record<string, string> };
      }
      const parsed = typeof row.detail === "string" ? fromText(row.detail) : null;
      return { code: row.code, params: parsed?.code === row.code ? parsed.params : {} };
    }
    if (typeof row.detail === "string") return fromText(row.detail);
  }
  return { code: "OTHER", params: {}, text: String(entry) };
}

export function flagKey(flag: FlagView) {
  return `${flag.code}:${JSON.stringify(flag.params)}:${flag.text ?? ""}`;
}
