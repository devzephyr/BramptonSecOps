"use client";

import { CheckIcon, MapPinIcon, NavigationIcon, TruckIcon, ArrowLeftRightIcon } from "lucide-react";
import { LoadStatus } from "@/components/desk/load-status";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toastManager } from "@/components/ui/toast";
import { CustodyForm } from "@/components/desk/custody";
import { DocumentUpload } from "@/components/desk/document-upload";
import { DutyPanel } from "@/components/desk/duty-panel";
import { TripMap } from "@/components/desk/trip-map";
import { FLOW, TripSteps } from "@/components/desk/trip-steps";
import { swapDrivers } from "@/lib/desk-client";
import { useI18n, timeAgo } from "@/lib/i18n";
import {isLive} from "@/lib/tracking";
import { useLocationSharing } from "@/lib/use-location-sharing";
import type { Load } from "@/preview/data";
import { useDesk } from "@/preview/store";

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
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const labels: Record<string, string> = {
    loaded: t.loaded,
    rolling: t.rolling,
    fifteen_min: t.away,
    arrived: t.arrived,
    delayed: t.delayed,
  };

  const { refreshRemote } = desk;
  const location = useLocationSharing(refreshRemote);
  const sharingId = location.sharingLoadId;
  const stopSharing = location.stop;

  // Delivered or handed off: the phone stops reporting for that load.
  useEffect(() => {
    if (!sharingId) return;
    const load = desk.loads.find((item) => item.id === sharingId);
    const stillMine = load && (load.driverId === desk.user.id || load.coDriverId === desk.user.id);
    if (!stillMine || load.status === "arrived") stopSharing();
  }, [desk.loads, desk.user.id, sharingId, stopSharing]);

  async function send(loadId: string, status: string) {
    setPosting(`${loadId}:${status}`);
    setError(null);
    const failure = await desk.pushStatus(loadId, status);
    setPosting(null);
    if (failure) setError(failure);
    else toastManager.add({ type: "success", title: t.statusSent, description: labels[status] });
    return failure === null;
  }

  async function startSharing(load: Load) {
    // Moving with the load means driving: the server refuses that while a break is owed.
    if (load.status !== "rolling" && load.status !== "fifteen_min" && !(await send(load.id, "rolling"))) return;
    location.start(load.id);
    toastManager.add({ type: "info", title: t.toastTrip });
  }

  const locationError = location.error
    ? location.error.kind === "denied"
      ? t.locationDenied
      : location.error.kind === "unsupported"
        ? t.locationUnsupported
        : location.error.kind === "unavailable"
          ? t.locationUnavailable
          : (location.error.message ?? t.locationUnavailable)
    : null;

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
        const sharing = sharingId === load.id;
        const busy = posting !== null;
        return (
          <div key={load.id} className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <TruckIcon className="size-5 text-muted-foreground" aria-hidden />
                  <CardTitle className="font-mono text-xl">{load.loadRef}</CardTitle>
                  <LoadStatus status={load.status} facility={load.facility} late={load.late} />
                </div>
                <CardDescription className="flex flex-wrap items-center gap-1.5">
                  <MapPinIcon className="size-3.5" aria-hidden />
                  {load.origin} → {load.destination}
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
                    {sharing && <Badge variant="success">{t.sharingPosition}</Badge>}
                    {hasPosition && (
                      <span className="text-xs text-muted-foreground">
                        {live ? t.updated : t.lastKnown} {timeAgo(load.positionAt, t)}
                      </span>
                    )}
                    <span className="ml-auto">
                      {sharing ? (
                        <Button size="sm" variant="outline" onClick={() => stopSharing()}>
                          {t.stopTrip}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={posting !== null || sharingId !== null || load.status === "arrived"}
                          onClick={() => void startSharing(load)}
                        >
                          {t.startTrip}
                        </Button>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.tripHint}</p>
                  {sharing && locationError && (
                    <Alert variant="warning">
                      <AlertDescription>{locationError}</AlertDescription>
                    </Alert>
                  )}
                  <TripMap
                    className="h-56"
                    follow={sharing ? load.id : null}
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
    </div>
  );
}
