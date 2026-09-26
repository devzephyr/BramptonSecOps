"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { useI18n, loadStatusTitle } from "@/lib/i18n";
import { isLive, updatedAgo } from "@/lib/tracking";
import type { Load } from "@/preview/data";
import { TripMap } from "@/components/desk/trip-map";

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
  const live = load != null && load.lat != null && load.lng != null && isLive(load.positionAt);

  return (
    <Dialog open={load !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogPopup className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t.load} {load?.loadRef ?? ""}
          </DialogTitle>
          <DialogDescription>
            {load?.commodity} · {load?.origin} → {load?.destination}
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-2">
          {load && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={load.status === "fifteen_min" ? "warning" : "outline"}>
                  {loadStatusTitle(load.status, t)}
                </Badge>
                {live && <Badge variant="success">{t.liveLocation}</Badge>}
              </div>
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
                    className="h-48"
                    depotLabel={t.mapDepot}
                    yardLabel={t.mapYard}
                    trucks={[{ id: load.id, label: load.loadRef, lat: load.lat, lng: load.lng, live }]}
                  />
                </>
              )}
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
