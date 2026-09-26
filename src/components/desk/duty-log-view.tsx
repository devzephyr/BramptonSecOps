"use client";

import { ShieldAlertIcon, ShieldCheckIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";
import { addDutyNote, type DutyLog } from "@/lib/desk-client";
import { dutyStatusTitle, useI18n } from "@/lib/i18n";

function clock(iso: string) {
  return new Date(iso).toLocaleString("en-CA", {
    timeZone: "America/Toronto",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Read-only log with chain verification. Anyone allowed to read it can add a note, never edit. */
export function DutyLogView({ log, onChanged }: { log: DutyLog; onChanged: () => void }) {
  const { t } = useI18n();
  const [note, setNote] = useState("");
  const [refId, setRefId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bySeq = new Map(log.entries.map((entry) => [entry.id, entry.seq]));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || note.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      await addDutyNote(log.driver.id, note.trim(), refId ?? undefined);
      setNote("");
      setRefId(null);
      toastManager.add({ type: "success", title: t.noteAdded });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  const source = (value: string) =>
    value === "gps" ? t.sourceGps : value === "status" ? t.sourceStatus : value === "manager" ? t.sourceManager : value === "sim" ? t.sourceSim : "";

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{t.dutyLogHint}</p>
      {log.chain.intact ? (
        <p className="flex items-center gap-1.5 text-xs text-success-foreground">
          <ShieldCheckIcon className="size-3.5" aria-hidden />
          {t.chainIntact} ({log.chain.count})
        </p>
      ) : (
        <Alert variant="error">
          <ShieldAlertIcon aria-hidden />
          <AlertDescription>
            {t.chainBroken} #{log.chain.brokenAt}
          </AlertDescription>
        </Alert>
      )}
      {log.entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noDutyEntries}</p>
      ) : (
        <ol className="flex max-h-72 flex-col divide-y overflow-y-auto rounded-lg border">
          {log.entries.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-3 py-2 text-sm">
              <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">#{entry.seq}</span>
              <span className="shrink-0 font-mono text-xs tabular-nums">{clock(entry.at)}</span>
              {entry.kind === "status" ? (
                <span className="font-medium">{dutyStatusTitle(entry.status, t)}</span>
              ) : (
                <span className="min-w-0 flex-1 wrap-anywhere">
                  {entry.refId && (
                    <span className="text-muted-foreground">
                      {t.correcting} #{bySeq.get(entry.refId) ?? "?"}:{" "}
                    </span>
                  )}
                  {entry.note}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {[source(entry.source), entry.kind === "note" || entry.source === "manager" ? entry.actor : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <button
                type="button"
                className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => setRefId(entry.id)}
              >
                {t.addNote}
              </button>
            </li>
          ))}
        </ol>
      )}
      <form className="flex flex-col gap-2" onSubmit={(event) => void submit(event)}>
        {error && (
          <Alert variant="error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {refId && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            {t.correcting} #{bySeq.get(refId)}
            <button type="button" className="underline" onClick={() => setRefId(null)}>
              {t.cancel}
            </button>
          </p>
        )}
        <div className="flex gap-2">
          <Input
            aria-label={t.addNote}
            placeholder={t.notePlaceholder}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <Button type="submit" variant="outline" disabled={busy || note.trim().length < 3}>
            {t.addNote}
          </Button>
        </div>
      </form>
    </div>
  );
}
