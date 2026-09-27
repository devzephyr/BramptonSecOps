"use client";

import { createLocalJWKSet, jwtVerify } from "jose";
import { AlertCircle, CheckCircle2, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { redactValue } from "@/lib/policy";
import { referenceCode } from "@/lib/reference";
import { requestTitle } from "@/preview/data";

export type ReceiptApprover = {
  role: string;
  name: string;
  approvedAt: string;
};

export type ReceiptClaims = {
  requestType: string;
  payloadHash: string;
  matchesUploaded: boolean;
  dualControl: boolean;
  uv: boolean;
  approvers: ReceiptApprover[];
  org: string;
  counterparty: string;
  oobNote?: string;
  onFile?: Record<string, string>;
  requested?: Record<string, string>;
};

export type PublicReceiptData = {
  token: string;
  jws: string;
  jwksKid?: string;
  claims: ReceiptClaims;
  createdAt: string;
  onFile?: Record<string, string>;
  requested?: Record<string, string>;
};

type VerifyState =
  | { status: "idle" | "checking" }
  | { status: "verified" }
  | { status: "failed"; message: string };

function humanRequestType(value: string) {
  return requestTitle(value, "en");
}

const FIELD_NAMES: Record<string, string> = {
  institution: "Institution number",
  transit: "Transit number",
  account: "Account number",
  dock: "Dock",
  destination: "Destination",
  carrier: "Carrier",
  seal: "Seal number",
};

function fieldName(key: string) {
  return FIELD_NAMES[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

const ROLE_NAMES: Record<string, string> = {
  logistics: "Logistics",
  manager: "Logistics",
  admin: "Admin",
  supplier: "Supplier desk",
  warehouse: "Warehouse",
  receiver: "Receiver",
  driver: "Driver",
};

function roleName(role: string) {
  return ROLE_NAMES[role] ?? role;
}

function formatToronto(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "shortOffset",
  }).format(new Date(iso));
}

function redactFields(fields: Record<string, string> | undefined) {
  if (!fields) return null;
  const entries = Object.entries(fields);
  if (entries.length === 0) return null;
  return Object.fromEntries(
    entries.map(([key, value]) => [key, redactValue(key, value)]),
  );
}

function SummaryBlock({
  claims,
  onFile,
  requested,
}: {
  claims: ReceiptClaims;
  onFile?: Record<string, string>;
  requested?: Record<string, string>;
}) {
  const onFileRedacted = redactFields(onFile ?? claims.onFile);
  const requestedRedacted = redactFields(requested ?? claims.requested);

  return (
    <dl className="grid gap-3 text-sm">
      <div className="grid gap-0.5">
        <dt className="text-muted-foreground">Organization</dt>
        <dd className="font-medium">{claims.org}</dd>
      </div>
      <div className="grid gap-0.5">
        <dt className="text-muted-foreground">Partner</dt>
        <dd className="font-medium">{claims.counterparty}</dd>
      </div>
      {onFileRedacted ? (
        <div className="grid gap-1">
          <dt className="text-muted-foreground">On file</dt>
          <dd className="font-mono text-xs">
            {Object.entries(onFileRedacted).map(([key, value]) => (
              <div key={key}>
                {fieldName(key)}: {value}
              </div>
            ))}
          </dd>
        </div>
      ) : null}
      {requestedRedacted ? (
        <div className="grid gap-1">
          <dt className="text-muted-foreground">Requested change</dt>
          <dd className="font-mono text-xs">
            {Object.entries(requestedRedacted).map(([key, value]) => (
              <div key={key}>
                {fieldName(key)}: {value}
              </div>
            ))}
          </dd>
        </div>
      ) : null}
      {claims.oobNote?.trim() ? (
        <div className="grid gap-0.5">
          <dt className="text-muted-foreground">Confirmed by phone</dt>
          <dd>{claims.oobNote.trim()}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export function PublicReceipt({
  token,
  initial,
}: {
  token: string;
  initial?: PublicReceiptData | null;
}) {
  const [data, setData] = useState<PublicReceiptData | null>(initial ?? null);
  const [loadError, setLoadError] = useState<string | null>(
    initial === undefined ? null : initial === null ? "Not found" : null,
  );
  const [verify, setVerify] = useState<VerifyState>({ status: "idle" });

  useEffect(() => {
    if (initial !== undefined) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/receipts/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) {
            setLoadError(res.status === 404 ? "Not found" : "Could not load receipt.");
          }
          return;
        }
        const body = (await res.json()) as PublicReceiptData;
        if (!cancelled) {
          setData(body);
          setLoadError(null);
        }
      } catch {
        if (!cancelled) setLoadError("Could not load receipt.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial, token]);

  useEffect(() => {
    if (!data?.jws) return;
    let cancelled = false;
    setVerify({ status: "checking" });
    (async () => {
      try {
        const res = await fetch("/.well-known/jwks.json");
        if (!res.ok) throw new Error("JWKS unavailable");
        const jwks = createLocalJWKSet(await res.json());
        await jwtVerify(data.jws, jwks, { issuer: "supplychek" });
        if (!cancelled) setVerify({ status: "verified" });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Signature verification failed.";
        if (!cancelled) setVerify({ status: "failed", message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data?.jws]);

  const claims = data?.claims;
  const matchesLine = useMemo(() => {
    if (!claims) return null;
    return `Supporting documents attached: ${claims.matchesUploaded ? "Yes" : "No"}`;
  }, [claims]);

  if (loadError) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center p-6">
        <Alert variant="error" className="w-full">
          <AlertCircle />
          <AlertTitle>Receipt unavailable</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!data || !claims) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-6 text-muted-foreground text-sm">
        Loading receipt…
      </main>
    );
  }

  return (
    <main className="public-receipt mx-auto min-h-screen max-w-2xl p-6 pb-16">
      <div
        className="receipt-watermark pointer-events-none fixed inset-0 flex items-center justify-center opacity-[0.07] print:opacity-20"
        aria-hidden
      >
        <p className="max-w-md rotate-[-18deg] text-center font-heading text-lg">
          Issued by SupplyChek. Not a government certification.
        </p>
      </div>

      <Card className="print-stamp relative">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Verification receipt</CardTitle>
              <CardDescription>
                Proof that this change was checked and approved before anyone acted on it
              </CardDescription>
            </div>
            <div className="no-print flex flex-col items-end gap-2">
              {verify.status === "verified" ? (
                <Badge variant="success">
                  <CheckCircle2 />
                  Authentic receipt
                </Badge>
              ) : null}
              {verify.status === "checking" ? (
                <Badge variant="outline">Checking authenticity…</Badge>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                <Printer />
                Print
              </Button>
            </div>
          </div>
          {verify.status === "failed" ? (
            <Alert variant="error">
              <AlertCircle />
              <AlertTitle>This receipt could not be confirmed as authentic</AlertTitle>
              <AlertDescription>{verify.message}</AlertDescription>
            </Alert>
          ) : null}
          {verify.status === "verified" ? (
            <div className="print-only hidden">
              <Badge variant="success">
                <CheckCircle2 />
                Authentic receipt
              </Badge>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-6">
          <p className="text-muted-foreground text-xs print:text-foreground">
            Issued by SupplyChek. Not a government certification.
          </p>

          <section className="grid gap-2">
            <h2 className="font-heading font-semibold text-sm">Request</h2>
            <p className="text-sm">{humanRequestType(claims.requestType)}</p>
          </section>

          <section className="grid gap-2">
            <h2 className="font-heading font-semibold text-sm">
              Summary (sensitive numbers partly hidden)
            </h2>
            <SummaryBlock
              claims={claims}
              onFile={data.onFile}
              requested={data.requested}
            />
          </section>

          <section className="grid gap-2">
            <h2 className="font-heading font-semibold text-sm">Reference code</h2>
            <p className="font-mono text-base font-semibold tracking-wider">
              {referenceCode(claims.payloadHash)}
            </p>
            <p className="text-muted-foreground text-xs">
              Ask your contact to read you their code. If it matches, you are both looking at the same approved request.
            </p>
            <p className="text-sm">{matchesLine}</p>
          </section>

          <section className="grid gap-2">
            <h2 className="font-heading font-semibold text-sm">Approvers</h2>
            <ul className="grid gap-2 text-sm">
              {claims.approvers.map((approver) => (
                <li key={`${approver.name}-${approver.approvedAt}`}>
                  <span className="font-medium">{approver.name}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    ({roleName(approver.role)}) · {formatToronto(approver.approvedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-1 text-sm">
            <p>
              Two-person approval:{" "}
              <span className="font-medium">
                {claims.dualControl ? "Yes" : "No"}
              </span>
            </p>
            <p>
              Each approver confirmed with fingerprint, face, or PIN:{" "}
              <span className="font-medium">{claims.uv ? "Yes" : "No"}</span>
            </p>
          </section>

          <section className="border-t pt-4 text-muted-foreground text-xs">
            <p>Issued {formatToronto(data.createdAt)}</p>
            <details className="mt-2">
              <summary className="cursor-pointer">Technical details</summary>
              <p className="mt-1">Full fingerprint of the request (SHA-256):</p>
              <p className="font-mono break-all">{claims.payloadHash}</p>
              <p className="mt-1 font-mono">Receipt ID: {data.token}</p>
            </details>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
