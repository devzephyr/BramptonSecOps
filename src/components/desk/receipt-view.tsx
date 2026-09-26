"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/desk/copy-button";
import { useI18n } from "@/lib/i18n";
import { requestTitle } from "@/preview/data";
import { useDesk } from "@/preview/store";

function stamp(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "America/Toronto",
  }).format(new Date(iso));
}

function shortHash(hash: string) {
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
}

export function ReceiptView() {
  const desk = useDesk();
  const { lang, t } = useI18n();
  const item =
    desk.cases.find((entry) => entry.token === desk.receiptToken) ?? desk.cases.find((entry) => entry.token);

  if (!item || !item.token) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t.noPartnerPage}</EmptyTitle>
          <EmptyDescription>{t.noPartnerPageBody}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Card className="print-stamp">
      <CardHeader>
        <CardTitle>{t.partnerCheck}</CardTitle>
        <CardDescription>{requestTitle(item.requestType, lang)}</CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-col gap-3 text-sm">
        <p>{item.counterparty}</p>
        <p className="font-mono text-xs break-all">{item.payloadHash}</p>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={item.payloadHash} label={t.hash} />
          <CopyButton
            text={typeof window !== "undefined" ? `${window.location.origin}/v/${item.token}` : `/v/${item.token}`}
            label={t.partnerCheck}
          />
        </div>
        <p className="font-mono text-xs">{shortHash(item.payloadHash)}</p>
        <p>
          {t.matches}: <strong>{t.yes}</strong>
        </p>
        <Separator />
        {item.approvals.map((approval) => (
          <p key={approval.userId}>
            {approval.role} · {approval.name} · {stamp(approval.at)}
          </p>
        ))}
        <p>
          {t.dualControl}: {item.dualControl ? t.yes : t.no}
        </p>
        <p>
          {t.userVerification}: {t.yes}
        </p>
        <Alert variant="success">
          <AlertTitle>{t.bytesLocked}</AlertTitle>
          <AlertDescription>{t.bytesLockedBody}</AlertDescription>
        </Alert>
        <p className="text-xs text-muted-foreground">{t.notGov}</p>
        <Button variant="outline" onClick={() => window.print()}>
          {t.print}
        </Button>
      </CardPanel>
    </Card>
  );
}
