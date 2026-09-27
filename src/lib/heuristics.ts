import { readFileSync } from "node:fs";
import path from "node:path";

export type Flag = {
  code: string;
  kind: "heuristic";
  /** English sentence kept for older readers; the desks translate from `code` and `params`. */
  detail: string;
  params: Record<string, string>;
};

type Catalog = {
  codes: { code: string; meaning: string }[];
  freeEmailDomains: string[];
};

let catalog: Catalog | null = null;

function loadCatalog(): Catalog {
  if (!catalog) {
    const file = path.join(process.cwd(), "content", "heuristic_catalog.json");
    catalog = JSON.parse(readFileSync(file, "utf8")) as Catalog;
  }
  return catalog;
}

function push(flags: Flag[], code: string, detail: string, params: Record<string, string> = {}) {
  if (flags.some((flag) => flag.code === code && flag.detail === detail))
    return;
  flags.push({ code, kind: "heuristic", detail, params });
}

export function runHeuristics(input: {
  rawText: string;
  requestType: string;
  onFileDomain?: string;
  onFile?: Record<string, string>;
  requested?: Record<string, string>;
}): Flag[] {
  const { freeEmailDomains } = loadCatalog();
  const flags: Flag[] = [];
  const raw = input.rawText;
  const lower = raw.toLowerCase();
  const emails = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];

  for (const email of emails) {
    const domain = email.split("@")[1]?.toLowerCase() ?? "";
    if (freeEmailDomains.includes(domain)) {
      push(flags, "FREE_EMAIL_DOMAIN", `${email} uses a free mailbox domain`, { email });
    }
    if (
      input.onFileDomain &&
      domain &&
      domain !== input.onFileDomain.toLowerCase()
    ) {
      const folded = domain.replace(/[^a-z0-9]/g, "");
      const expected = input.onFileDomain
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      if (
        folded !== expected &&
        (folded.includes(expected.slice(0, 6)) ||
          expected.includes(folded.slice(0, 6)))
      ) {
        push(
          flags,
          "LOOKALIKE_DOMAIN",
          `${domain} is not ${input.onFileDomain}. This is a spelling check, not a mail-authentication result.`,
          { domain, onFile: input.onFileDomain },
        );
      } else if (domain !== input.onFileDomain.toLowerCase()) {
        push(
          flags,
          "DOMAIN_NOT_ON_FILE",
          `${domain} is not the domain on file (${input.onFileDomain}).`,
          { domain, onFile: input.onFileDomain },
        );
      }
    }
  }

  if (/[\u0400-\u04FF\u0370-\u03FF]/.test(raw)) {
    push(
      flags,
      "HOMOGLYPH",
      "The text contains letters from another alphabet that can look like Latin letters.",
    );
  }

  if (
    /urgent|immediately|right away|asap|within the hour|today only|do not (call|phone|delay)/i.test(
      raw,
    )
  ) {
    push(
      flags,
      "URGENCY_OR_SECRECY",
      "The message pushes speed or tells the reader not to call.",
    );
  }

  if (
    /new (bank|account|eft|transit)|updated banking|void cheque|payment details have changed|interac/i.test(
      raw,
    ) ||
    input.requestType === "bank_change"
  ) {
    push(
      flags,
      "PAYMENT_DETAIL_CHANGE",
      "Payment instructions are part of this request.",
    );
  }

  if (input.onFile && input.requested) {
    for (const key of Object.keys(input.requested)) {
      const before = input.onFile[key];
      const after = input.requested[key];
      if (before && after && before !== after) {
        push(
          flags,
          "ON_FILE_MISMATCH",
          `${key} on file does not match the request.`,
          { field: key },
        );
      }
    }
  }

  if (
    /portal|sign-?in link|reset (your )?(access|login)|one-time code|share (your )?(code|link)/i.test(
      raw,
    ) ||
    input.requestType === "credential_request"
  ) {
    push(
      flags,
      "CREDENTIAL_ASK",
      "The message asks someone to open a link or hand over access.",
    );
  }

  if (
    /remote (access|support)|teamviewer|anydesk|plc|scada|ot network/i.test(
      raw,
    ) ||
    input.requestType === "ot_remote"
  ) {
    push(
      flags,
      "OT_REMOTE_ACCESS",
      "The message asks for remote access to plant or warehouse systems.",
    );
  }

  if (
    /new carrier|double broker|we can cover this load|sister company/i.test(
      raw,
    ) ||
    input.requestType === "new_carrier"
  ) {
    push(
      flags,
      "NEW_CARRIER",
      "A carrier that may not be on file is being introduced.",
    );
  }

  if (
    /dock|divert|yard|destination/i.test(lower) ||
    input.requestType === "destination_change"
  ) {
    push(
      flags,
      "DESTINATION_OR_DOCK_CHANGE",
      "A dock, yard, or destination may be changing.",
    );
  }

  if (/seal/i.test(lower) || input.requestType === "bol_pod_alter") {
    push(
      flags,
      "DOCUMENT_OR_SEAL_CHANGE",
      "A seal, bill, or proof of delivery may be altered.",
    );
  }

  push(
    flags,
    "MAIL_AUTH_NOT_CHECKED",
    "A mail-authentication pass does not prove this request is legitimate. Call the number already on file.",
  );

  return flags;
}
