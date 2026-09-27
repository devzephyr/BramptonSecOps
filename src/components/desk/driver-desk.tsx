"use client";

import { CheckIcon, MapPinIcon, NavigationIcon, TruckIcon, ArrowLeftRightIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toastManager } from "@/components/ui/toast";
import { CustodyForm } from "@/components/desk/custody";
import { DocumentUpload } from "@/components/desk/document-upload";
import { DutyPanel } from "@/components/desk/duty-panel";
import { FocusHud } from "@/components/desk/focus-hud";
import { TripMap } from "@/components/desk/trip-map";
import { FLOW, TripSteps } from "@/components/desk/trip-steps";
import { postPosition, restartBreakDemo, swapDrivers } from "@/lib/desk-client";
import { loadStatusTitle, useI18n } from "@/lib/i18n";
import { isLive, SIM_STEPS, SIM_TICK_MS, simPosition, updatedAgo } from "@/lib/tracking";
import type { Load } from "@/preview/data";
import { useDesk } from "@/preview/store";

const FIFTEEN_MIN_STEP = SIM_STEPS - 8;
const SHOW_ALL = "all";

function nextStatus(status: string): string | null {
  if (status === "delayed") return "rolling";
  const index = FLOW.indexOf(status as (typeof FLOW)[number]);
  if (index === FLOW.length - 1) return null;
  return FLOW[index + 1] ?? FLOW[0];
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-sm" : "text-sm font-medium"}>{value}</dd>
    </div>
  );
}

export function DriverDesk() {
  const desk = useDesk();
  const { t } = useI18n();
  const mine = desk.loads
    .filter((load) => load.driverId === desk.user.id || load.coDriverId === desk.user.id)
    .sort((a, b) => Number(a.status === "arrived") - Number(b.status === "arrived"));
  const [sim, setSim] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [hudLoadId, setHudLoadId] = useState<string | null>(null);
  const [breakTick, setBreakTick] = useState(0);
  const breakSkip = useRef<number | null>(null);
  useEffect(() => () => {
    if (breakSkip.current) window.clearTimeout(breakSkip.current);
  }, []);
  const timer = useRef<number | null>(null);
  const running = useRef<string | null>(null);
  const labels: Record<string, string> = {
    loaded: t.loaded,
    rolling: t.rolling,
    fifteen_min: t.away,
    arrived: t.arrived,
    delayed: t.delayed,
  };

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    },
    [],
  );

  async function send(loadId: string, status: string, simulated = false) {
    setPosting(`${loadId}:${status}`);
    setError(null);
    const failure = await desk.pushStatus(loadId, status, simulated);
    setPosting(null);
    if (failure) setError(failure);
    else if (!simulated) toastManager.add({ type: "success", title: t.statusSent, description: labels[status] });
    return failure === null;
  }

  async function swap(loadId: string) {
    setPosting(`${loadId}:swap`);
    setError(null);
    try {
      await swapDrivers(loadId);
      toastManager.add({ type: "success", title: t.driversSwapped });
      await desk.refreshRemote();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not swap drivers.");
    } finally {
      setPosting(null);
    }
  }

  function stopSim(silent = false) {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    if (running.current !== null && !silent) toastManager.add({ type: "info", title: t.toastTripStopped });
    running.current = null;
    setSim(null);
  }

  function startSim(load: Load) {
    stopSim(true);
    setError(null);
    let step = 0;
    let inFlight = false;
    const tick = async () => {
      // A slow tick must not overlap the next one: both would read the same
      // step and post the same status twice.
      if (inFlight) return;
      inFlight = true;
      try {
        await advance();
      } finally {
        inFlight = false;
      }
    };
    const advance = async () => {
      const point = simPosition(step);
      try {
        // Refused (e.g. a break is owed): the truck does not move, so stop before sending any position.
        if (step === 0 && load.status !== "rolling" && load.status !== "fifteen_min" && !(await send(load.id, "rolling", true))) {
          stopSim(true);
          return;
        }
        await postPosition(load.id, point.lat, point.lng, true);
        if (step === FIFTEEN_MIN_STEP) await send(load.id, "fifteen_min", true);
        if (step === SIM_STEPS) await send(load.id, "arrived", true);
        await desk.refreshRemote();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not share position.");
        stopSim(true);
        return;
      }
      step += 1;
      if (step > SIM_STEPS) stopSim(true);
    };
    running.current = load.id;
    setSim(load.id);
    toastManager.add({ type: "info", title: t.toastTrip });
    void tick();
    timer.current = window.setInterval(() => void tick(), SIM_TICK_MS);
  }

  const activeLoad = mine.find((load) => load.status !== "arrived");
  const fallback = activeLoad?.id ?? mine[0]?.id ?? SHOW_ALL;
  const selection =
    picked === SHOW_ALL || (picked !== null && mine.some((load) => load.id === picked)) ? picked : fallback;
  const visible = selection === SHOW_ALL ? mine : mine.filter((load) => load.id === selection);
  const facilities = [
    ...new Set(desk.loads.flatMap((load) => [load.facility ?? "", load.origin, load.destination]).filter(Boolean)),
  ];

  if (mine.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <DutyPanel driverId={desk.user.id} />
        <Card>
          <CardHeader>
            <CardTitle>{t.noLoads}</CardTitle>
            <CardDescription>{t.noLoadsHint}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <DutyPanel driverId={desk.user.id} activeLoadId={activeLoad?.id} />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-lg font-semibold">{t.yourLoads}</h1>
        {mine.length > 1 && (
          <Select value={selection} onValueChange={(value) => setPicked(String(value))}>
            <SelectTrigger aria-label={t.pickLoad}>
              <SelectValue>
                {(value) => {
                  if (value === SHOW_ALL) return `${t.showAllLoads} (${mine.length})`;
                  const load = mine.find((item) => item.id === value);
                  return load ? `${load.loadRef} · ${load.origin} → ${load.destination}` : t.pickLoad;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectPopup>
              <SelectItem value={SHOW_ALL}>
                {t.showAllLoads} ({mine.length})
              </SelectItem>
              {mine.map((load) => (
                <SelectItem key={load.id} value={load.id}>
                  {load.loadRef} · {load.origin} → {load.destination}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        )}
      </div>
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {visible.map((load) => {
        const next = nextStatus(load.status);
        const hasPosition = load.lat != null && load.lng != null;
        const live = hasPosition && isLive(load.positionAt);
        const simulating = sim === load.id;
        const busy = posting !== null || simulating;
        return (
          <div key={load.id} className="flex flex-col gap-4">
            <Card>
              {load.status !== "arrived" && (
                <div className="px-6 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={busy}
                    onClick={() => {
                      setPosting(`${load.id}:break`);
                      setError(null);
                      if (breakSkip.current) window.clearTimeout(breakSkip.current);
                      void restartBreakDemo(load.id, 10 * 60 * 1000)
                        .then(async () => {
                          await desk.refreshRemote();
                          setBreakTick((tick) => tick + 1);
                        })
                        .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not restart the break sim."))
                        .finally(() => setPosting(null));
                      breakSkip.current = window.setTimeout(() => {
                        void restartBreakDemo(load.id, 10 * 1000).then(() => desk.refreshRemote());
                      }, 30_000);
                    }}
                  >
                    {t.restartBreakSim}
                  </Button>
                </div>
              )}
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <TruckIcon className="size-5 text-muted-foreground" aria-hidden />
                  <CardTitle className="font-mono text-xl">{load.loadRef}</CardTitle>
                  <Badge
                    variant={
                      load.status === "arrived" ? "success" : load.status === "delayed" ? "warning" : "secondary"
                    }
                  >
                    {loadStatusTitle(load.status, t)}
                  </Badge>
                </div>
                <CardDescription className="flex flex-col items-stretch gap-2">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <MapPinIcon className="size-3.5 shrink-0" aria-hidden />
                    <span>{load.origin}</span>
                    <span aria-hidden>→</span>
                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium text-foreground">
                      {load.destination}
                    </span>
                  </span>
                  {load.status !== "arrived" && (
                    <Button type="button" size="lg" className="min-h-14 w-full" onClick={() => setHudLoadId(load.id)}>
                      {t.focusMode}
                    </Button>
                  )}
                </CardDescription>
              </CardHeader>
              <CardPanel className="flex flex-col gap-4">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Detail label={t.dock} value={load.dock} />
                  <Detail label={t.eta} value={load.eta} />
                  <Detail label={t.goods} value={load.commodity} />
                  <Detail label={t.seal} value={load.seal} mono />
                  <Detail label={t.trailerPlate} value={[load.trailer, load.plate].filter(Boolean).join(" · ")} mono />
                  <Detail label={t.setpoint} value={load.setpoint} mono />
                </dl>

                <TripSteps status={load.status} labels={labels} />

                {load.coDriverId && load.status !== "arrived" && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
                    <span className="text-sm font-medium">
                      {load.driverId === desk.user.id ? t.youAreDriving : t.coDriverDriving}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto"
                      disabled={busy}
                      onClick={() => void swap(load.id)}
                    >
                      <ArrowLeftRightIcon aria-hidden />
                      {t.swapDrivers}
                    </Button>
                  </div>
                )}

                {next ? (
                  <Button
                    size="xl"
                    className="min-h-16 w-full text-base"
                    disabled={busy}
                    onClick={() => void send(load.id, next)}
                  >
                    <NavigationIcon aria-hidden />
                    {t.nextStep}: {labels[next]}
                  </Button>
                ) : (
                  <Alert variant="success">
                    <CheckIcon aria-hidden />
                    <AlertTitle>{t.delivered}</AlertTitle>
                    <AlertDescription>{t.deliveredBody}</AlertDescription>
                  </Alert>
                )}

                <details className="group rounded-lg border px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium">{t.correctStatus}</summary>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {FLOW.filter((status) => status !== load.status && status !== next).map((status) => (
                      <Button
                        key={status}
                        variant="outline"
                        className="min-h-12"
                        disabled={busy}
                        onClick={() => void send(load.id, status)}
                      >
                        {labels[status]}
                      </Button>
                    ))}
                    {load.status !== "delayed" && load.status !== "arrived" && (
                      <Button
                        variant="destructive-outline"
                        className="min-h-12"
                        disabled={busy}
                        onClick={() => void send(load.id, "delayed")}
                      >
                        {t.reportDelay}
                      </Button>
                    )}
                  </div>
                </details>

                <details className="group rounded-lg border px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium">{t.dropAtFacility}</summary>
                  <div className="mt-3">
                    <CustodyForm
                      loadId={load.id}
                      allowDrivers={false}
                      facilities={facilities}
                      onDone={() => void desk.refreshRemote()}
                    />
                  </div>
                </details>

                <div className="flex flex-col gap-2 border-t pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{t.liveLocation}</span>
                    <Badge variant="outline">{t.simulated}</Badge>
                    {hasPosition && (
                      <span className="text-xs text-muted-foreground">
                        {live ? t.sharingPosition : t.lastKnown} · {updatedAgo(load.positionAt)}
                      </span>
                    )}
                    <span className="ml-auto">
                      {simulating ? (
                        <Button size="sm" variant="outline" onClick={() => stopSim()}>
                          {t.stopTrip}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={posting !== null || sim !== null || load.status === "arrived"}
                          onClick={() => startSim(load)}
                        >
                          {t.startTrip}
                        </Button>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.tripHint}</p>
                  <TripMap
                    className="h-56"
                    depotLabel={t.mapDepot}
                    yardLabel={load.destination || t.mapYard}
                    follow={simulating ? load.id : null}
                    trucks={
                      hasPosition
                        ? [{ id: load.id, label: load.loadRef, lat: load.lat!, lng: load.lng!, live }]
                        : []
                    }
                  />
                </div>
              </CardPanel>
            </Card>
            <DocumentUpload loadId={load.id} />
          </div>
        );
      })}
      {hudLoadId && (
        <FocusHud key={`${hudLoadId}-${breakTick}`} driverId={desk.user.id} loadId={hudLoadId} onExit={() => setHudLoadId(null)} />
      )}
    </div>
  );
}
