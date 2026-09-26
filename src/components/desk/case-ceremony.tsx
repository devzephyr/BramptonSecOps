"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Dialog, DialogDescription, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue } from "@/components/ui/progress";
import { useI18n, caseStatusTitle } from "@/lib/i18n";
import { PARTNERS, requestTitle } from "@/preview/data";
import { sha256Hex } from "@/preview/hash";
import { useDesk } from "@/preview/store";
import { DocumentUpload } from "@/components/desk/document-upload";
import { MessageThread } from "@/components/desk/message-thread";
import { CallLink } from "@/components/desk/call-link";
import { CopyButton } from "@/components/desk/copy-button";

function shortHash(hash: string) {
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
}

export function CaseCeremony() {
  const desk = useDesk();
  const { lang, t } = useI18n();
  const item = desk.cases.find((entry) => entry.id === desk.caseId);
  const [open, setOpen] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [note, setNote] = useState(item?.oobNote ?? "");
  const [hashOk, setHashOk] = useState<boolean | null>(null);
  const canonical = item?.canonical ?? "";
  const storedHash = item?.payloadHash ?? "";

  useEffect(() => {
    if (!canonical || !storedHash) {
      setHashOk(null);
      return;
    }
    let live = true;
    void sha256Hex(canonical).then((recomputed) => {
      if (live) setHashOk(recomputed === storedHash);
    });
    return () => {
      live = false;
    };
  }, [canonical, storedHash]);

  // ponytail: full bytes surface inside the passkey review dialog, which binds
  // its challenge to this hash; per-recipient PRF-wrapped E2EE is the upgrade
  // path if residency review ever demands it.
  if (!item) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t.noRequestOpen}</EmptyTitle>
          <EmptyDescription>{t.pickFromBoard}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const ready = item.oobDone.every(Boolean) && note.trim().length > 3;
  const partner = PARTNERS.find((entry) => entry.id === item.partnerId);
  const needed = item.dualControl ? 2 : 1;
  const done = Math.min(item.approvals.length, needed);
  const caseId = item.id;

  async function handlePasskeySign() {
    await desk.approve(caseId);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => desk.closeCase()}>
          {t.backToBoard}
        </Button>
        <span className="font-mono text-sm font-semibold">Case {item.id}</span>
        <Badge variant="secondary">{requestTitle(item.requestType, lang)}</Badge>
        <Badge variant={item.status === "fully_approved" ? "success" : "warning"}>{caseStatusTitle(item.status, t)}</Badge>
        <Badge variant={hashOk === null ? "outline" : hashOk ? "success" : "error"}>
          {hashOk === null ? "checking hash…" : hashOk ? "hash verified" : "hash mismatch"}
        </Badge>
        {item.dualControl && <Badge variant="info">{t.dualControl}</Badge>}
        {item.jev.map((tag) => (
          <Badge key={tag} variant="info">
            {tag}
          </Badge>
        ))}
        {item.token && (
          <Button size="sm" variant="secondary" onClick={() => desk.openReceipt(item.token!)}>
            {t.openPartnerPage}
          </Button>
        )}
      </div>
      <Progress value={done} max={needed}>
        <div className="flex items-baseline justify-between gap-3">
          <ProgressLabel>
            {done} of {needed} approved{item.dualControl ? " · two different managers required" : ""}
          </ProgressLabel>
          <ProgressValue />
        </div>
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium">{t.flags}</span>
        {item.flags.map((flag) => (
          <Badge key={flag} variant="error">
            {flag}
          </Badge>
        ))}
      </div>
      {item.jev.length > 0 && (
        <Alert>
          <AlertTitle>Jev</AlertTitle>
          <AlertDescription>
            {item.jev.join(", ")}. {t.jevNote}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Canonical payload</CardTitle>
          <CardDescription className="font-mono text-xs">{shortHash(item.payloadHash)} · {item.counterparty}</CardDescription>
        </CardHeader>
        <CardPanel>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg bg-muted p-3">
              <p className="mb-2 text-sm font-medium">{t.onFile}{partner?.numberOnFile ? <> · <CallLink numberOnFile={partner.numberOnFile} /></> : ""}</p>
              <div className="flex flex-col gap-2 text-sm">
                {Object.entries(item.onFile).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
              <p className="mb-2 text-sm font-medium">{t.asked} · {item.counterparty}</p>
              <div className="flex flex-col gap-2 text-sm">
                {Object.entries(item.requested).map(([key, value]) => {
                  const changed = item.onFile[key] && item.onFile[key] !== value;
                  return (
                    <div key={key} className="flex justify-between gap-3">
                      <span className="text-muted-foreground">{key}</span>
                      <span className={`font-mono ${changed ? "bg-destructive/15 text-destructive-foreground" : ""}`}>
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardPanel>
      </Card>
      <Alert variant="warning">
        <AlertTitle>{t.oob}</AlertTitle>
        <AlertDescription>{t.holdCall}</AlertDescription>
        <div className="mt-2">
          <CheckboxGroup>
            {item.oobSteps.map((step, index) => (
              <label key={step} className="flex items-start gap-3 text-sm text-foreground">
                <Checkbox checked={item.oobDone[index]} onCheckedChange={() => desk.toggleOob(item.id, index, note)} />
                <span>{step}</span>
              </label>
            ))}
          </CheckboxGroup>
          <Input
            className="mt-3"
            value={note}
            placeholder={t.whoSpoke}
            onChange={(event) => {
              setNote(event.target.value);
              if (item.oobDone.some(Boolean)) desk.toggleOob(item.id, -1, event.target.value);
            }}
          />
          <Button className="mt-3" size="lg" disabled={!ready} onClick={() => setOpen(true)}>
            {t.reviewBytes}
          </Button>
        </div>
      </Alert>
      <MessageThread caseId={item.id} userId={desk.user.id} />
      <DocumentUpload caseId={item.id} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPopup className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t.confirmBytes}</DialogTitle>
            <DialogDescription>
              {requestTitle(item.requestType, lang)} · {item.counterparty}
              {item.dualControl ? ` · ${t.dual}` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              The passkey ceremony unlocks these bytes. Its challenge binds to the hash below.
            </p>
            <p className="font-mono text-xs break-all">{item.payloadHash}</p>
            <div>
              <CopyButton text={item.payloadHash} label={t.hash} />
            </div>
            {hashOk === false && (
              <Alert variant="error">
                <AlertTitle>Hash mismatch</AlertTitle>
                <AlertDescription>
                  These bytes do not match the sealed hash. Do not sign.
                </AlertDescription>
              </Alert>
            )}
            <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs">{item.canonical}</pre>
            <p className="text-sm">
              {t.signedSoFar}:{" "}
              {item.approvals.length === 0
                ? t.nobody
                : item.approvals.map((approval) => `${approval.name} (${approval.role})`).join(", ")}
            </p>
            <label className="flex items-center gap-3 text-sm">
              <Checkbox checked={reviewed} onCheckedChange={(checked) => setReviewed(Boolean(checked))} />
              <span>{t.reviewed}</span>
            </label>
            {desk.passkeyError && (
              <Alert variant="error">
                <AlertTitle>{t.passkeyStopped}</AlertTitle>
                <AlertDescription>{desk.passkeyError}</AlertDescription>
              </Alert>
            )}
            <Button size="xl" disabled={!reviewed || !ready || hashOk !== true} onClick={() => void handlePasskeySign()}>
              {t.approve}
            </Button>
          </DialogPanel>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
