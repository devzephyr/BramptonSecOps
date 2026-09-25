import { headers } from "next/headers";
import Link from "next/link";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

type PortalReceipt = {
  token: string;
  createdAt: string;
  case: {
    requestType: string;
    counterparty: string;
    payloadHash: string;
    publicToken: string | null;
    createdAt: string;
  };
};

async function appOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) {
    return process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3000";
  }
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

async function loadHistory(): Promise<
  | { kind: "signed_out" }
  | { kind: "ok"; receipts: PortalReceipt[] }
  | { kind: "error" }
> {
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  const origin = await appOrigin();
  const res = await fetch(`${origin}/api/portal/history`, {
    headers: { cookie },
    cache: "no-store",
  });
  if (res.status === 401) return { kind: "signed_out" };
  if (!res.ok) return { kind: "error" };
  const body = (await res.json()) as { receipts: PortalReceipt[] };
  return { kind: "ok", receipts: body.receipts ?? [] };
}

function humanRequestType(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function shortHash(hash: string) {
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 16)}…`;
}

function formatToronto(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "shortOffset",
  }).format(new Date(iso));
}

function HistoryEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ClipboardList />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export default async function PortalPage() {
  const result = await loadHistory();

  return (
    <main className="mx-auto min-h-screen max-w-5xl p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Verify history</CardTitle>
        </CardHeader>
        <CardContent>
          {result.kind === "signed_out" ? (
            <HistoryEmpty
              title="Sign in to view history"
              description="Passkey sign-in is required to see your organization’s approved verification receipts."
            />
          ) : null}
          {result.kind === "error" ? (
            <HistoryEmpty
              title="History unavailable"
              description="We could not load verify history right now. Try again in a moment."
            />
          ) : null}
          {result.kind === "ok" && result.receipts.length === 0 ? (
            <HistoryEmpty
              title="No receipts yet"
              description="Fully approved cases with public receipts will appear here."
            />
          ) : null}
          {result.kind === "ok" && result.receipts.length > 0 ? (
            <Table variant="card">
              <TableHeader>
                <TableRow>
                  <TableHead>Approved</TableHead>
                  <TableHead>Request type</TableHead>
                  <TableHead>Counterparty</TableHead>
                  <TableHead>Payload hash</TableHead>
                  <TableHead>Public link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.receipts.map((row) => (
                  <TableRow key={row.token}>
                    <TableCell>{formatToronto(row.createdAt)}</TableCell>
                    <TableCell>
                      {humanRequestType(row.case.requestType)}
                    </TableCell>
                    <TableCell>{row.case.counterparty}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {shortHash(row.case.payloadHash)}
                    </TableCell>
                    <TableCell>
                      <Link
                        className="text-primary underline-offset-4 hover:underline"
                        href={`/v/${encodeURIComponent(row.token)}`}
                      >
                        Open receipt
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
