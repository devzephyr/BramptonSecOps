"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { useI18n, loadStatusTitle } from "@/lib/i18n";
import { isLive, updatedAgo } from "@/lib/tracking";
import type { Load } from "@/preview/data";
import { TripMap } from "@/components/desk/trip-map";
import { DocumentUpload } from "@/components/desk/document-upload";
import { LoadEdit } from "@/components/desk/load-edit";
import { CustodyChain, CustodyForm } from "@/components/desk/custody";
import { fetchLoadJourney, fetchTeam, type LoadJourney, type TeamMember } from "@/lib/desk-client";
import { useDesk } from "@/preview/store";

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono" : "font-medium"}>{value}</span>
    </div>
  );
}

export function LoadDialog({ load, onClose }: { load: Load | null; onClose: () => void }) {
  const { t } = useI18n();
  const desk = useDesk();
  const canEdit = desk.user.role === "logistics" || desk.user.role === "admin";
  const canHandOff = canEdit || desk.user.role === "receiver" || desk.user.role === "warehouse";
  const [editing, setEditing] = useState(false);
  const [handingOff, setHandingOff] = useState(false);
  const [journey, setJourney] = useState<LoadJourney>({ events: [], custody: [], trail: [] });
  const events = journey.events;
  const [drivers, setDrivers] = useState<TeamMember[]>([]);
  const loadId = load?.id ?? null;
  const live = load != null && load.lat != null && load.lng != null && isLive(load.positionAt);

  useEffect(() => {
    setEditing(false);
    setHandingOff(false);
    setJourney({ events: [], custody: [], trail: [] });
    if (!loadId) return;
    let alive = true;
    void fetchLoadJourney(loadId).then((rows) => alive && setJourney(rows));
    if (canEdit)
      void fetchTeam()
        .then((team) => alive && setDrivers(team.filter((member) => member.role === "driver")))
        .catch(() => alive && setDrivers([]));
    return () => {
      alive = false;
    };
  }, [canEdit, loadId]);

  async function reloadHistory() {
    setEditing(false);
    setHandingOff(false);
    if (loadId) setJourney(await fetchLoadJourney(loadId));
    await desk.refreshRemote();
  }

  const driverName = load?.driverId
    ? (drivers.find((member) => member.id === load.driverId)?.name ?? "")
    : load?.facility
      ? ""
      : t.unassigned;
  const facilities = [
    ...new Set(desk.loads.flatMap((item) => [item.facility ?? "", item.origin, item.destination]).filter(Boolean)),
  ];

  return (
    <Dialog open={load !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogPopup className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t.load} {load?.loadRef ?? ""}
          </DialogTitle>
          <DialogDescription>
            {load?.commodity} · {load?.origin} → {load?.destination}
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-2">
          {load && editing && <LoadEdit load={load} onDone={() => void reloadHistory()} />}
          {load && !editing && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={load.status === "fifteen_min" ? "warning" : "outline"}>
                  {loadStatusTitle(load.status, t)}
                </Badge>
                {live && <Badge variant="success">{t.liveLocation}</Badge>}
                {canEdit && (
                  <Button size="sm" variant="outline" className="ml-auto" onClick={() => setEditing(true)}>
                    {t.editLoad}
                  </Button>
                )}
              </div>
              <Row label={t.driver} value={driverName} />
              <Row label={t.atFacility} value={load.facility ?? ""} />
              <Row label={t.goods} value={load.commodity} />
              <Row label={t.dock} value={load.dock} />
              <Row label={t.seal} value={load.seal} mono />
              <Row label={t.eta} value={load.eta} />
              <Row label={t.carrier} value={load.carrier} />
              <Row label={t.trailerPlate} value={[load.trailer, load.plate].filter(Boolean).join(" · ")} mono />
              <Row label={t.setpoint} value={load.setpoint} mono />
              {load.lat != null && load.lng != null && (
                <>
                  <Row
                    label={live ? t.liveLocation : t.lastKnown}
                    value={`${load.lat.toFixed(4)}, ${load.lng.toFixed(4)} · ${updatedAgo(load.positionAt)}`}
                    mono
                  />
                  <TripMap
                    className="h-56"
                    depotLabel={t.mapDepot}
                    yardLabel={t.mapYard}
                    trail={journey.trail}
                    trucks={[{ id: load.id, label: load.loadRef, lat: load.lat, lng: load.lng, live }]}
                  />
                  {journey.trail.length > 1 && <p className="text-xs text-muted-foreground">{t.trailHint}</p>}
                </>
              )}
              <div className="mt-2 flex flex-col gap-2 border-t pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{t.custodyChain}</span>
                  {canHandOff && !handingOff && (
                    <Button size="sm" variant="outline" className="ml-auto" onClick={() => setHandingOff(true)}>
                      {t.handOff}
                    </Button>
                  )}
                </div>
                {handingOff && (
                  <div className="rounded-lg border p-3">
                    <CustodyForm
                      loadId={load.id}
                      allowDrivers={canEdit}
                      facilities={facilities}
                      onDone={() => void reloadHistory()}
                    />
                  </div>
                )}
                <CustodyChain hops={journey.custody} />
              </div>
              <div className="mt-2">
                <DocumentUpload loadId={load.id} />
              </div>
              <div className="mt-2 flex flex-col gap-2 border-t pt-3">
                <span className="text-sm font-medium">{t.history}</span>
                {events.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t.noHistory}</p>
                ) : (
                  <ol className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
                    {events.map((event) => (
                      <li key={event.id} className="text-xs">
                        <span className="font-medium">
                          {event.eventType === "handoff"
                            ? t.eventHandoff
                            : event.eventType === "custody"
                              ? t.eventCustody
                              : event.eventType === "updated"
                              ? t.eventUpdated
                              : loadStatusTitle(event.eventType, t)}
                        </span>
                        {event.note ? ` · ${event.note}` : ""}
                        <span className="text-muted-foreground">
                          {" "}
                          · {event.actor} · {updatedAgo(event.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={onClose}>
                  {t.back}
                </Button>
              </div>
            </>
          )}
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}
