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
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requestTitle } from "@/preview/data";

async function loadHistory() {
  const user = await requireUser();
  if (!user) return { kind: "signed_out" as const };
  const receipts = await prisma.verifyReceipt.findMany({
    where: {
      orgId: user.orgId,
      revokedAt: null,
      case: { status: "fully_approved", revokedAt: null },
    },
    select: {
      token: true,
      createdAt: true,
      case: { select: { requestType: true, counterparty: true, payloadHash: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return { kind: "ok" as const, receipts };
}

function shortHash(hash: string) {
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 16)}…`;
}

function formatToronto(when: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "shortOffset",
  }).format(when);
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
          {result.kind === "signed_out" ? (
            <Link className="text-primary underline-offset-4 hover:underline" href="/sign-in">
              Sign in
            </Link>
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
                      {requestTitle(row.case.requestType, "en")}
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
