"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { confirmBreakRest, fetchFocusState } from "@/lib/desk-client";
import { focusHudPresentation, type FocusState } from "@/lib/focus-model";
import { formatDuration } from "@/lib/hos";
import { useI18n } from "@/lib/i18n";
import { useDesk } from "@/preview/store";

const POLL_MS = 2000;

function timeLeft(ms: number) {
  if (ms < 60_000) return `${Math.max(1, Math.ceil(ms / 1000))}s`;
  return formatDuration(ms);
}

/** Break alert under the navbar. It reads the server state and writes the rest. It does not sign anyone out. */
export function ComplianceBar() {
  const desk = useDesk();
  const { t } = useI18n();
  const [hit, setHit] = useState<{ loadId: string; state: FocusState; due: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const driver = desk.user.role === "driver";
  const loadKey = desk.loads
    .filter((load) => (load.driverId === desk.user.id || load.coDriverId === desk.user.id) && load.status !== "arrived")
    .map((load) => load.id)
    .join(",");

  useEffect(() => {
    if (!driver || !loadKey) {
      setHit(null);
      return;
    }
    const ids = loadKey.split(",");
    let cancel = false;
    async function poll() {
      let warning: { loadId: string; state: FocusState; due: boolean } | null = null;
      for (const loadId of ids) {
        try {
          const state = await fetchFocusState(desk.user.id, loadId);
          const due = Boolean(focusHudPresentation(state, "online").showBanner && state.requiredAction);
          if (due) {
            if (!cancel) setHit({ loadId, state, due: true });
            return;
          }
          if (!warning && state.rest.nextBreakWarningMs != null) warning = { loadId, state, due: false };
        } catch {
          // Keep the last banner if a poll fails. Signing out is not involved.
        }
      }
      if (!cancel) setHit(warning);
    }
    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, [desk.user.id, driver, loadKey]);

  if (!hit) return null;

  return (
    <div className={`border-b text-foreground ${hit.due ? "border-amber-500/60 bg-amber-500/20" : "border-amber-300/60 bg-amber-400/10"}`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-amber-800 dark:text-amber-200">
            {hit.due ? t.hudCompliance : t.hudBreakDue}
          </p>
          <p className="text-sm">
            {hit.state.load.loadRef}
            {" · "}
            {hit.due ? t.hudComplianceBody : timeLeft(hit.state.rest.nextBreakWarningMs ?? hit.state.rest.drivingRemainingMs)}
          </p>
          {error && <p className="text-sm text-red-700 dark:text-red-200">{error}</p>}
        </div>
        {hit.due && (
          <Button
            type="button"
            className="min-h-14 shrink-0"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              void confirmBreakRest(hit.loadId)
                .then(async () => {
                  await desk.refreshRemote();
                  setHit(null);
                })
                .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not record the rest."))
                .finally(() => setBusy(false));
            }}
          >
            {t.hudAuthenticateShort}
          </Button>
        )}
      </div>
    </div>
  );
}
