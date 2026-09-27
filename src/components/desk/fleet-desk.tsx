"use client";

import { WarehouseIcon } from "lucide-react";
import { LoadStatus } from "@/components/desk/load-status";
import { PositionLine } from "@/components/desk/position-line";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Dialog, DialogDescription, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { toastManager } from "@/components/ui/toast";
import { DriverAvatar } from "@/components/desk/driver-avatar";
import { clockState, DutyBadge, DutyClock } from "@/components/desk/duty-clock";
import { DutyLogView } from "@/components/desk/duty-log-view";
import { LoadDialog } from "@/components/desk/load-dialog";
import { TripMap } from "@/components/desk/trip-map";
import {
  fetchDutyLog,
  fetchFleet,
  uploadDriverPhoto,
  type DutyLog,
  type Fleet,
  type FleetDriver,
  type FleetLoad,
} from "@/lib/desk-client";
import { useI18n } from "@/lib/i18n";
import {isLive} from "@/lib/tracking";
import { cn } from "@/lib/utils";
import { useDesk } from "@/preview/store";

const ACTIVE = (load: FleetLoad) => load.currentStatus !== "arrived";

function DriverLogDialog({ driver, onClose }: { driver: FleetDriver | null; onClose: () => void }) {
  const { t } = useI18n();
  const [days, setDays] = useState(1);
  const [log, setLog] = useState<DutyLog | null>(null);
  const driverId = driver?.id ?? null;

  const load = useCallback(async () => {
    if (driverId) setLog(await fetchDutyLog(driverId, days));
  }, [days, driverId]);

  useEffect(() => {
    setLog(null);
    void load();
  }, [load]);

  return (
    <Dialog open={driver !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogPopup className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t.dutyLog} · {driver?.name}
          </DialogTitle>
          <DialogDescription>{t.hosRule}</DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Button size="sm" variant={days === 1 ? "default" : "outline"} onClick={() => setDays(1)}>
              {t.today}
            </Button>
            <Button size="sm" variant={days === 7 ? "default" : "outline"} onClick={() => setDays(7)}>
              {t.lastWeek}
            </Button>
          </div>
          {log ? (
            <>
              <DutyClock hos={log.hos} />
              <DutyLogView log={log} onChanged={() => void load()} />
            </>
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}

function DriverCard({
  driver,
  onOpenLog,
  onOpenLoad,
  onFocus,
  onPhoto,
}: {
  driver: FleetDriver;
  onOpenLog: () => void;
  onOpenLoad: (id: string) => void;
  onFocus: (id: string) => void;
  onPhoto: (file: File) => void;
}) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const state = clockState(driver.hos);
  const active = driver.loads.filter(ACTIVE);

  return (
    <Card
      className={cn(
        state === "over" && "border-destructive/50",
        (state === "owed" || state === "due") && "border-warning/50",
      )}
    >
      <CardPanel className="flex flex-col gap-3 pt-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-full focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={`${driver.photoVersion ? t.changePhoto : t.addPhoto}: ${driver.name}`}
            title={driver.photoVersion ? t.changePhoto : t.addPhoto}
            onClick={() => input.current?.click()}
          >
            <DriverAvatar id={driver.id} name={driver.name} photoVersion={driver.photoVersion} className="size-14" />
          </button>
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onPhoto(file);
              event.target.value = "";
            }}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate font-heading font-semibold">{driver.name}</span>
            {driver.title && <span className="truncate text-xs text-muted-foreground">{driver.title}</span>}
          </div>
          <DutyBadge hos={driver.hos} />
        </div>

        <DutyClock hos={driver.hos} />

        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noActiveLoads}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map((load) => {
              const live = load.lat != null && load.lng != null && isLive(load.positionAt);
              return (
                <li key={load.id} className="flex flex-col gap-1 rounded-lg border px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{load.loadRef}</span>
                    <LoadStatus status={load.currentStatus} facility={load.facility} late={load.late} />
                    {live && <Badge variant="success">{t.liveLocation}</Badge>}
                    {load.coDriverUserId === driver.id && <Badge variant="secondary">{t.coDriver}</Badge>}
                    <Button size="sm" variant="outline" className="ml-auto" onClick={() => onOpenLoad(load.id)}>
                      {t.journey}
                    </Button>
                  </div>
                  <span className="truncate text-xs text-muted-foreground">
                    {load.commodity} · {load.origin} → {load.destination}
                  </span>
                  {load.lat != null && load.lng != null ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <PositionLine lat={load.lat} lng={load.lng} at={load.positionAt} />
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        onClick={() => onFocus(load.id)}
                      >
                        {t.showOnMap}
                      </button>
                    </span>
                  ) : (
                    <PositionLine lat={null} lng={null} at={null} />
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <Button size="sm" variant="ghost" className="self-start" onClick={onOpenLog}>
          {t.dutyLog}
        </Button>
      </CardPanel>
    </Card>
  );
}

/** Manager view of every driver: photo, duty clock, current loads and where they are. */
export function FleetDesk() {
  const { t } = useI18n();
  const desk = useDesk();
  const [fleet, setFleet] = useState<Fleet | null>(null);
  const [logFor, setLogFor] = useState<FleetDriver | null>(null);
  const [openLoadId, setOpenLoadId] = useState<string | null>(null);
  const [follow, setFollow] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setFleet(await fetchFleet());
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const trucks = useMemo(
    () =>
      (fleet?.drivers ?? []).flatMap((driver) =>
        driver.loads
          // A team load is listed under both drivers; draw it once, for the driver at the wheel.
          .filter((load) => load.driverUserId === driver.id && ACTIVE(load) && load.lat != null && load.lng != null)
          .map((load) => ({
            id: load.id,
            label: `${load.loadRef} · ${driver.name.split(" ")[0]}`,
            lat: load.lat!,
            lng: load.lng!,
            live: isLive(load.positionAt),
          })),
      ),
    [fleet],
  );

  async function photo(driver: FleetDriver, file: File) {
    try {
      await uploadDriverPhoto(driver.id, file);
      toastManager.add({ type: "success", title: t.photoUpdated, description: driver.name });
      await refresh();
    } catch (err) {
      toastManager.add({ type: "error", title: t.saveFailed, description: err instanceof Error ? err.message : "" });
    }
  }

  const ordered = [...(fleet?.drivers ?? [])].sort((a, b) => {
    const rank = { over: 0, owed: 1, due: 2, ok: 3 } as const;
    return rank[clockState(a.hos)] - rank[clockState(b.hos)] || a.name.localeCompare(b.name);
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.fleet}</CardTitle>
          <CardDescription>{t.fleetHint}</CardDescription>
        </CardHeader>
        <CardPanel>
          <TripMap className="h-96" trucks={trucks} follow={follow} />
        </CardPanel>
      </Card>

      {!fleet ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : fleet.drivers.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t.empty}</EmptyTitle>
            <EmptyDescription>{t.noDrivers}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {ordered.map((driver) => (
            <DriverCard
              key={driver.id}
              driver={driver}
              onOpenLog={() => setLogFor(driver)}
              onOpenLoad={setOpenLoadId}
              onFocus={setFollow}
              onPhoto={(file) => void photo(driver, file)}
            />
          ))}
        </div>
      )}

      {fleet && fleet.atFacilities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t.atFacilities}</CardTitle>
          </CardHeader>
          <CardPanel>
            <ul className="flex flex-col divide-y">
              {fleet.atFacilities.map((load) => (
                <li key={load.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                  <WarehouseIcon className="size-4 text-muted-foreground" aria-hidden />
                  <span className="font-mono font-semibold">{load.loadRef}</span>
                  <span className="text-muted-foreground">{load.facility}</span>
                  <Button size="sm" variant="outline" className="ml-auto" onClick={() => setOpenLoadId(load.id)}>
                    {t.journey}
                  </Button>
                </li>
              ))}
            </ul>
          </CardPanel>
        </Card>
      )}

      <DriverLogDialog driver={logFor} onClose={() => setLogFor(null)} />
      <LoadDialog
        load={desk.loads.find((item) => item.id === openLoadId) ?? null}
        onClose={() => {
          setOpenLoadId(null);
          void refresh();
        }}
      />
    </div>
  );
}
