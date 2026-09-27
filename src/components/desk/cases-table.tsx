"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { caseStatusTitle, timeAgo, useI18n } from "@/lib/i18n";
import { referenceCode } from "@/lib/reference";
import { requestTitle, type DeskCase } from "@/preview/data";

/** Work that needs someone first, then waiting on a call, then finished; newest first within each. */
const ORDER = [
  "pending_approval",
  "pending_second",
  "oob_pending",
  "flagged",
  "draft",
  "fully_approved",
  "rejected",
  "revoked",
];

export function sortCases(cases: DeskCase[]): DeskCase[] {
  const rank = (status: string) => {
    const index = ORDER.indexOf(status);
    return index === -1 ? ORDER.length : index;
  };
  return [...cases].sort(
    (a, b) => rank(a.status) - rank(b.status) || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );
}

export function statusVariant(status: string) {
  if (status === "fully_approved") return "success" as const;
  if (status === "rejected" || status === "revoked") return "outline" as const;
  if (status === "pending_approval" || status === "pending_second") return "info" as const;
  return "warning" as const;
}

export function CasesTable({ cases, onOpen }: { cases: DeskCase[]; onOpen?: (id: string) => void }) {
  const { lang, t } = useI18n();
  return (
    <div className="overflow-x-auto">
      <Table variant="card">
        <TableHeader>
          <TableRow>
            <TableHead>{t.who}</TableHead>
            <TableHead>{t.type}</TableHead>
            <TableHead>{t.status}</TableHead>
            <TableHead>{t.approvalsColumn}</TableHead>
            <TableHead>{t.received}</TableHead>
            <TableHead>{t.hash}</TableHead>
            {onOpen && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortCases(cases).map((item) => {
            const needed = item.dualControl ? 2 : 1;
            const done = Math.min(item.approvals.length, needed);
            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.counterparty}</TableCell>
                <TableCell>{requestTitle(item.requestType, lang)}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(item.status)}>{caseStatusTitle(item.status, t)}</Badge>
                </TableCell>
                <TableCell className="tabular-nums">
                  {t.approvalsOf.replace("{done}", String(done)).replace("{needed}", String(needed))}
                </TableCell>
                <TableCell className="text-muted-foreground">{timeAgo(item.createdAt, t)}</TableCell>
                <TableCell className="font-mono text-xs">{referenceCode(item.payloadHash)}</TableCell>
                {onOpen && (
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => onOpen(item.id)}>
                      {t.open}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
