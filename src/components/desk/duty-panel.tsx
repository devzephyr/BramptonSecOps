"use client";

import { BedIcon, ClipboardListIcon, CoffeeIcon, TruckIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { toastManager } from "@/components/ui/toast";
import { DriverAvatar } from "@/components/desk/driver-avatar";
import { clockState, DutyBadge, DutyClock } from "@/components/desk/duty-clock";
import { DutyLogView } from "@/components/desk/duty-log-view";
import { fetchDutyLog, setDutyStatus, uploadDriverPhoto, type DutyLog } from "@/lib/desk-client";
import { DUTY_STATUSES, formatDuration, type DutyStatusName } from "@/lib/hos";
import { dutyStatusTitle, useI18n } from "@/lib/i18n";

const ICONS: Record<DutyStatusName, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  off_duty: CoffeeIcon,
  sleeper_berth: BedIcon,
  on_duty: ClipboardListIcon,
  driving: TruckIcon,
};

/** The driver's own duty status: one tap to change, the 8-hour clock, and the log itself. */
export function DutyPanel({ driverId, activeLoadId }: { driverId: string; activeLoadId?: string }) {
  const { t } = useI18n();
  const [log, setLog] = useState<DutyLog | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLog(await fetchDutyLog(driverId, 1));
  }, [driverId]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function change(status: DutyStatusName) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await setDutyStatus(driverId, status, activeLoadId);
      toastManager.add({ type: "success", title: t.dutyChanged, description: dutyStatusTitle(status, t) });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      await refresh();
      setBusy(false);
    }
  }

  async function changePhoto(file: File | undefined) {
    if (!file) return;
    try {
      await uploadDriverPhoto(driverId, file);
      toastManager.add({ type: "success", title: t.photoUpdated });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveFailed);
    }
  }

  if (!log) return null;
  const { hos } = log;
  const state = clockState(hos);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-full focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={log.driver.photoVersion ? t.changePhoto : t.addPhoto}
            title={log.driver.photoVersion ? t.changePhoto : t.addPhoto}
            onClick={() => photoInput.current?.click()}
          >
            <DriverAvatar id={log.driver.id} name={log.driver.name} photoVersion={log.driver.photoVersion} />
          </button>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(event) => {
              void changePhoto(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="flex flex-wrap items-center gap-2">
              {t.dutyStatus} <DutyBadge hos={hos} />
            </CardTitle>
            <CardDescription>{t.hosRule}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardPanel className="flex flex-col gap-4">
        {error && (
          <Alert variant="error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {(state === "owed" || state === "over") && (
          <Alert variant={state === "over" ? "error" : "warning"}>
            <AlertTitle>{t.breakOwed}</AlertTitle>
            <AlertDescription>
              {t.breakOwedBody}
              {state === "owed" && ` ${t.breakLeft}: ${formatDuration(Math.ceil(hos.breakLeftMs / 60000) * 60000)}.`}
            </AlertDescription>
          </Alert>
        )}
        {state === "due" && (
          <Alert variant="warning">
            <AlertTitle>{t.breakDue}</AlertTitle>
            <AlertDescription>
              {t.leftBeforeBreak}: {formatDuration(hos.remainingMs)}
            </AlertDescription>
          </Alert>
        )}
        <DutyClock hos={hos} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label={t.dutyStatus}>
          {DUTY_STATUSES.map((status) => {
            const Icon = ICONS[status];
            const current = hos.status === status;
            const blocked = status === "driving" && hos.breakOwed && !current;
            return (
              <Button
                key={status}
                variant={current ? "default" : "outline"}
                className="h-auto min-h-14 flex-col gap-1 py-2 whitespace-normal text-center text-xs sm:text-sm"
                aria-pressed={current}
                disabled={busy || current || blocked}
                onClick={() => void change(status)}
              >
                <Icon className="size-5" aria-hidden />
                {dutyStatusTitle(status, t)}
              </Button>
            );
          })}
        </div>
        <div className="border-t pt-3">
          <Button size="sm" variant="ghost" onClick={() => setShowLog((open) => !open)} aria-expanded={showLog}>
            {t.dutyLog} · {t.today}
          </Button>
          {showLog && (
            <div className="mt-2">
              <DutyLogView log={log} onChanged={() => void refresh()} />
            </div>
          )}
        </div>
      </CardPanel>
    </Card>
  );
}
