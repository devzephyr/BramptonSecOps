"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { mapboxConfigured, TripMap } from "@/components/desk/trip-map";
import { fetchFocusState, performFocusAction } from "@/lib/desk-client";
import {
  acceptServerFocus,
  focusActionError,
  focusCabLine,
  focusHudPresentation,
  formatHudEta,
  formatReeferTemp,
  type FocusAction,
  type FocusState,
} from "@/lib/focus-model";
import { formatDuration, type DutyStatusName } from "@/lib/hos";
import { useI18n } from "@/lib/i18n";
import { plannedRoute, updatedAgo } from "@/lib/tracking";

const POLL_MS = 5000;
const STATUSES: DutyStatusName[] = ["off_duty", "sleeper_berth", "on_duty", "driving"];
const CITIES = ["North York", "Brampton", "Mississauga", "Hamilton", "Vaughan", "Milton", "Etobicoke"];

function shortPlace(value: string) {
  return CITIES.find((city) => value.toLowerCase().includes(city.toLowerCase())) ?? value;
}

export function FocusHud({
  driverId,
  loadId,
  onExit,
}: {
  driverId: string;
  loadId: string;
  onExit: () => void;
}) {
  const { t } = useI18n();
  const [state, setState] = useState<FocusState | null>(null);
  const [link, setLink] = useState<"online" | "offline">("online");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = acceptServerFocus(await fetchFocusState(driverId, loadId));
      setState(next);
      setLink("online");
    } catch (err) {
      setLink("offline");
      setError(focusActionError(err).message);
    }
  }, [driverId, loadId]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function act(action: FocusAction, extra?: { targetStatus?: DutyStatusName; reason?: string; facility?: string }) {
    if (!state || busy) return;
    const view = focusHudPresentation(state, link);
    if (!view.actions.includes(action)) return;
    setBusy(true);
    setError(null);
    try {
      const next = acceptServerFocus(
        await performFocusAction(driverId, {
          loadId,
          action,
          targetStatus: extra?.targetStatus,
          reason: extra?.reason,
          facility: extra?.facility ?? state.load.destination,
        }),
      );
      setState(next);
      setLink("online");
    } catch (err) {
      const mapped = focusActionError(err);
      setError(mapped.message);
      if (mapped.kind !== "cancelled" && mapped.kind !== "unavailable") await refresh();
    } finally {
      setBusy(false);
    }
  }

  const view = state ? focusHudPresentation(state, link) : null;
  const speed = state?.speedMps == null ? null : Math.round(state.speedMps * 3.6);
  const route = state ? plannedRoute(state.load.origin, state.load.destination) : [];
  const origin = state ? shortPlace(state.load.origin) : "";
  const destination = state ? shortPlace(state.load.destination) : "";
  const cab = state ? focusCabLine(state) : t.focusMode;
  const rolling = state?.cabState === "moving";
  const reefer = state ? formatReeferTemp(state.load.setpoint) : "—";
  const otherActions = state && view ? view.actions.filter((action) => action !== state.requiredAction && action !== "correct_duty_status") : [];

  return (
    <div className="fixed inset-0 z-40 flex h-dvh flex-col overflow-hidden bg-zinc-950 pt-44 text-zinc-50">
      <header className="shrink-0 space-y-1 px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" className="min-h-14 shrink-0 border-zinc-700 bg-zinc-900 text-zinc-50" onClick={onExit}>
            {t.exitHud}
          </Button>
          <p className="min-w-0 flex-1 truncate font-mono text-sm text-zinc-300">{state?.load.loadRef ?? "—"}</p>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <span className={rolling ? "text-emerald-400" : "text-amber-300"} aria-hidden>●</span>
            {cab}
          </p>
        </div>
        {state && (
          <p className="truncate text-base">
            {origin} → {destination}
          </p>
        )}
        <p className="text-sm text-zinc-400">
          {view?.markStale ? t.hudStale : t.sharingPosition}
          {state?.telemetryAt ? ` · ${updatedAgo(state.telemetryAt)}` : ""}
          {speed != null ? ` · ${speed} km/h` : ""}
        </p>
      </header>

      {state && (
        <section className={`grid grid-cols-2 grid-rows-2 gap-3 px-4 pb-4 ${mapboxConfigured ? "shrink-0" : "min-h-0 flex-1"}`}>
          <Metric hero label={t.hudDrivingBank} value={formatDuration(view?.drivingRemainingMs ?? 0)} />
          <Metric label={t.destination} value={state.load.dock ? `${destination} · ${state.load.dock}` : destination} />
          <Metric hero label={t.hudReefer} value={reefer} detail={reefer === "—" ? undefined : t.hudNominal} />
          <Metric hero label={t.eta} value={formatHudEta(state.load.eta)} />
        </section>
      )}

      {error && <p className="mx-4 mb-2 shrink-0 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-100">{error}</p>}

      {(otherActions.length > 0 || (state && view?.actions.includes("correct_duty_status"))) && (
        <div className="mx-4 mb-2 flex shrink-0 gap-2 overflow-x-auto">
          {otherActions.map((action) => (
            <Button key={action} type="button" variant="outline" className="min-h-14 shrink-0 border-zinc-700 bg-zinc-900 text-zinc-50" disabled={busy} onClick={() => void act(action)}>
              {action === "confirm_rest_start" ? t.hudConfirmRest : action === "confirm_rest_end" ? t.hudEndRest : action === "resume_driving" ? t.hudResume : t.hudDrop}
            </Button>
          ))}
          {state &&
            view?.actions.includes("correct_duty_status") &&
            STATUSES.filter((status) => status !== state.hos.status).map((status) => (
              <Button
                key={status}
                type="button"
                variant="outline"
                className="min-h-14 shrink-0 border-zinc-700 bg-zinc-900 text-zinc-50"
                disabled={busy}
                onClick={() => void act("correct_duty_status", { targetStatus: status, reason: "Driver correction from Focus" })}
              >
                {t.hudCorrect} · {status.replace(/_/g, " ")}
              </Button>
            ))}
        </div>
      )}

      {mapboxConfigured && state && (
        <div className="relative h-[42vh] shrink-0 px-4 pb-4">
          <TripMap
            className="h-full w-full border-zinc-700"
            depotLabel={origin}
            yardLabel={destination}
            route={route}
            routeColor="#22d3ee"
            routeDashed={false}
            trail={state.trail}
            follow={state.position ? state.load.id : null}
            trucks={
              state.position
                ? [{ id: state.load.id, label: state.load.loadRef, lat: state.position.lat, lng: state.position.lng, live: state.telemetryFresh && link === "online" }]
                : []
            }
          />
          <div className="pointer-events-none absolute inset-x-7 bottom-7 z-10 rounded-lg bg-zinc-950/85 px-3 py-2 text-sm shadow">
            <p className="font-semibold">{speed != null ? `${speed} km/h` : t.hudNoFix}</p>
            <p className="text-zinc-300">
              {state.position ? `${state.position.lat.toFixed(4)}, ${state.position.lng.toFixed(4)}` : t.hudNoFix}
              {destination ? ` · ${destination}` : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, detail, hero = false }: { label: string; value: string; detail?: string; hero?: boolean }) {
  return (
    <div className="flex h-full flex-col justify-center rounded-2xl bg-zinc-900 px-4 py-5">
      <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">{label}</p>
      <p className={hero ? "mt-2 font-semibold text-5xl leading-none tracking-tight sm:text-6xl" : "mt-2 text-3xl leading-tight font-semibold"}>
        {value}
      </p>
      {detail && <p className="mt-2 text-xl text-zinc-300">/ {detail}</p>}
    </div>
  );
}
