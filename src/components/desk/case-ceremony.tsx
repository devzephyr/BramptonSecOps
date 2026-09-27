"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Dialog, DialogDescription, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue } from "@/components/ui/progress";
import { toastManager } from "@/components/ui/toast";
import { caseStatusTitle, fieldTitle, flagTitle, jevTitle, roleTitle, useI18n } from "@/lib/i18n";
import { flagKey, REMINDER_CODES } from "@/lib/flags";
import { referenceCode } from "@/lib/reference";
import { requestTitle } from "@/preview/data";
import { sha256Hex } from "@/preview/hash";
import { useDesk } from "@/preview/store";
import { fetchCase } from "@/lib/desk-client";
import { DocumentUpload } from "@/components/desk/document-upload";
import { MessageThread } from "@/components/desk/message-thread";
import { CallLink } from "@/components/desk/call-link";
import { CopyButton } from "@/components/desk/copy-button";

export function CaseCeremony({ onBack }: { onBack?: () => void }) {
  const desk = useDesk();
  const { lang, t } = useI18n();
  const item = desk.cases.find((entry) => entry.id === desk.caseId);
  const [open, setOpen] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [note, setNote] = useState(item?.oobNote ?? "");
  const [hashOk, setHashOk] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canonical = item?.canonical ?? "";
  const storedHash = item?.payloadHash ?? "";
  const itemId = item?.id;
  const savedNote = item?.oobNote;

  const [rawText, setRawText] = useState<string | null>(null);
  useEffect(() => {
    setRawText(null);
    if (!itemId) return;
    let live = true;
    // The list omits the logged text; the case itself carries it.
    void fetchCase(itemId).then((full) => live && setRawText(full?.rawText ?? ""));
    return () => {
      live = false;
    };
  }, [itemId]);

  const [noteFor, setNoteFor] = useState(itemId);
  if (noteFor !== itemId) {
    setNoteFor(itemId);
    setNote(savedNote ?? "");
  }

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

  const caseId = item.id;
  const ready = item.oobDone.every(Boolean) && note.trim().length > 3;
  const needed = item.dualControl ? 2 : 1;
  const done = Math.min(item.approvals.length, needed);
  const approved = item.status === "fully_approved";
  const iApproved = item.approvals.some((approval) => approval.userId === desk.user.id);
  // Once anyone has approved, the call record is part of what they approved; the server refuses edits.
  const callLocked = item.approvals.length > 0;
  const warnings = item.flags.filter((flag) => !REMINDER_CODES.includes(flag.code));
  const reference = referenceCode(item.payloadHash);
  const fields = [...new Set([...Object.keys(item.requested), ...Object.keys(item.onFile)])].filter(
    (key) => key in item.requested,
  );
  const back = onBack ?? desk.closeCase;

  async function save(patch: { index?: number; note?: string }) {
    setSaving(true);
    setError(null);
    const failure = await desk.saveOob(caseId, patch);
    setSaving(false);
    if (failure) setError(failure);
    return failure === null;
  }

  async function saveNote() {
    if (note.trim() === item?.oobNote.trim()) return true;
    return save({ note });
  }

  async function openReview() {
    if (await saveNote()) {
      setReviewed(false);
      setOpen(true);
    }
  }

  async function sign() {
    setSigning(true);
    const failure = await desk.approve(caseId);
    setSigning(false);
    if (failure) return;
    setOpen(false);
    toastManager.add({
      type: "success",
      title: t.approvalRecorded,
      description: item?.dualControl && item.approvals.length === 0 ? t.secondSignerNeeded : undefined,
    });
  }

  async function revoke() {
    const failure = await desk.revoke(caseId);
    if (failure) setError(failure);
    else back();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={back}>
          {t.backToBoard}
        </Button>
        <span className="text-sm font-semibold">
          {t.caseLabel} · {item.counterparty}
          {item.loadRef ? ` · ${item.loadRef}` : ""}
        </span>
        <Badge variant="secondary">{requestTitle(item.requestType, lang)}</Badge>
        <Badge variant={approved ? "success" : "warning"}>{caseStatusTitle(item.status, t)}</Badge>
        <Badge variant={hashOk === null ? "outline" : hashOk ? "success" : "error"}>
          {hashOk === null ? t.checkingHash : hashOk ? t.hashVerified : t.hashMismatch}
        </Badge>
        {item.dualControl && <Badge variant="info">{t.dualControl}</Badge>}
        {item.token && (
          <Button size="sm" variant="secondary" onClick={() => desk.openReceipt(item.token!)}>
            {t.openPartnerPage}
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger render={<Button size="sm" variant="destructive-outline" className="ml-auto" />}>
            {t.revokeCase}
          </AlertDialogTrigger>
          <AlertDialogPopup>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.revokeCase}</AlertDialogTitle>
              <AlertDialogDescription>{t.revokeCaseConfirm}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button variant="ghost" />}>{t.cancel}</AlertDialogClose>
              <AlertDialogClose render={<Button variant="destructive" />} onClick={() => void revoke()}>
                {t.revokeCase}
              </AlertDialogClose>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
      </div>
      {error && (
        <Alert variant="error">
          <AlertTitle>{t.saveFailed}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Progress value={done} max={needed}>
        <div className="flex items-baseline justify-between gap-3">
          <ProgressLabel>
            {t.approvalProgress.replace("{done}", String(done)).replace("{needed}", String(needed))}
            {item.dualControl ? ` · ${t.twoManagers}` : ""}
          </ProgressLabel>
          <ProgressValue />
        </div>
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
      {warnings.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{t.flags}</span>
          <ul className="flex flex-col gap-1.5">
            {warnings.map((flag) => (
              <li key={flagKey(flag)} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive" aria-hidden />
                {flagTitle(flag, t)}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t.mailReminder}</p>
        </div>
      )}
      {item.jev.length > 0 && (
        <Alert>
          <AlertTitle>{t.jevTitle}</AlertTitle>
          <AlertDescription>
            {item.jev.map((label) => jevTitle(label, t)).join(" · ")}. {t.jevNote}
          </AlertDescription>
        </Alert>
      )}
      {rawText && (
        <Card>
          <CardHeader>
            <CardTitle>{t.loggedRequest}</CardTitle>
            <CardDescription>{t.loggedRequestHint}</CardDescription>
          </CardHeader>
          <CardPanel>
            <p className="whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">{rawText}</p>
          </CardPanel>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{t.canonicalPayload}</CardTitle>
          <CardDescription>
            {item.counterparty} · {t.referenceCode} <span className="font-mono">{reference}</span>
          </CardDescription>
        </CardHeader>
        <CardPanel>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg bg-muted p-3">
              <p className="mb-2 text-sm font-medium">
                {t.onFile}
                {item.numberOnFile && (
                  <>
                    {" · "}
                    <CallLink numberOnFile={item.numberOnFile} />
                  </>
                )}
              </p>
              <div className="flex flex-col gap-2 text-sm">
                {Object.entries(item.onFile).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{fieldTitle(key, t)}</span>
                    <span className="font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
              <p className="mb-2 text-sm font-medium">
                {t.asked} · {item.counterparty}
              </p>
              <div className="flex flex-col gap-2 text-sm">
                {Object.entries(item.requested).map(([key, value]) => {
                  const changed = item.onFile[key] && item.onFile[key] !== value;
                  return (
                    <div key={key} className="flex justify-between gap-3">
                      <span className="text-muted-foreground">{fieldTitle(key, t)}</span>
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
      {!approved && iApproved && (
        <Alert variant="success">
          <AlertTitle>{t.youApproved}</AlertTitle>
          <AlertDescription>{t.youApprovedBody}</AlertDescription>
        </Alert>
      )}
      {!approved && (
        <Alert variant={callLocked ? "default" : "warning"}>
          <AlertTitle>{callLocked ? t.calledBy : t.oob}</AlertTitle>
          <AlertDescription>{callLocked ? t.callRecordLocked : t.holdCall}</AlertDescription>
          <div className="mt-2">
            <CheckboxGroup>
              {item.oobSteps.map((step, index) => (
                <label key={step} className="flex items-start gap-3 text-sm text-foreground">
                  <Checkbox
                    checked={item.oobDone[index]}
                    disabled={saving || callLocked}
                    onCheckedChange={() => void save({ index })}
                  />
                  <span>{step}</span>
                </label>
              ))}
            </CheckboxGroup>
            <Input
              className="mt-3"
              value={note}
              maxLength={500}
              readOnly={callLocked}
              aria-label={t.whoSpoke}
              placeholder={t.whoSpoke}
              onChange={(event) => setNote(event.target.value)}
              onBlur={() => void (callLocked ? undefined : saveNote())}
            />
            {!iApproved && (
              <Button className="mt-3" size="lg" disabled={!ready || saving} onClick={() => void openReview()}>
                {t.reviewBytes}
              </Button>
            )}
          </div>
        </Alert>
      )}
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
            <p className="text-sm text-muted-foreground">{t.ceremonyHint}</p>
            {hashOk === false && (
              <Alert variant="error">
                <AlertTitle>{t.hashMismatch}</AlertTitle>
                <AlertDescription>{t.hashMismatchBody}</AlertDescription>
              </Alert>
            )}
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium" />
                    <th className="px-3 py-2 font-medium">{t.currentValue}</th>
                    <th className="px-3 py-2 font-medium">{t.newValue}</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((key) => {
                    const before = item.onFile[key] ?? "";
                    const after = item.requested[key] ?? "";
                    const changed = before !== after;
                    return (
                      <tr key={key} className="border-t">
                        <th scope="row" className="px-3 py-2 text-left font-medium">
                          {fieldTitle(key, t)}
                        </th>
                        <td className="px-3 py-2 font-mono">{before || "—"}</td>
                        <td className={`px-3 py-2 font-mono ${changed ? "font-semibold text-destructive-foreground" : ""}`}>
                          {after || "—"}
                          {!changed && <span className="ml-2 font-sans text-xs text-muted-foreground">{t.unchanged}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted p-3">
              <span className="text-sm">{t.referenceCode}</span>
              <span className="font-mono text-base font-semibold tracking-wider">{reference}</span>
              <CopyButton text={reference} label={t.referenceCode} />
              <p className="w-full text-xs text-muted-foreground">{t.referenceHint}</p>
            </div>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">{t.technicalDetails}</summary>
              <p className="mt-2">{t.fullFingerprint}</p>
              <p className="mt-1 font-mono break-all">{item.payloadHash}</p>
            </details>
            <p className="text-sm">
              {t.signedSoFar}:{" "}
              {item.approvals.length === 0
                ? t.nobody
                : item.approvals.map((approval) => `${approval.name} (${roleTitle(approval.role, t)})`).join(", ")}
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
            <Button size="xl" disabled={!reviewed || !ready || hashOk !== true || signing} onClick={() => void sign()}>
              {signing ? t.waitingPasskey : t.approve}
            </Button>
          </DialogPanel>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
