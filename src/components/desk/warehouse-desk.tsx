"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TripMap } from "@/components/desk/trip-map";
import { TripSteps } from "@/components/desk/trip-steps";
import { fetchInventory, type InventoryLot } from "@/lib/desk-client";
import { useI18n, loadStatusTitle } from "@/lib/i18n";
import { isLive, updatedAgo } from "@/lib/tracking";
import type { Load } from "@/preview/data";
import { useDesk } from "@/preview/store";

function loadDirection(load: Load, orgName: string): "dropoff" | "pickup" {
  const dest = load.destination.toLowerCase();
  const origin = load.origin.toLowerCase();
  const tokens = orgName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 3);
  const atDest = tokens.some((token) => dest.includes(token));
  const atOrigin = tokens.some((token) => origin.includes(token));
  if (atOrigin && !atDest) return "pickup";
  return "dropoff";
}

export function WarehouseDesk() {
  const desk = useDesk();
  const { refreshRemote } = desk;
  const { t } = useI18n();
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const orgName = desk.user.orgName ?? "";

  const live = desk.loads.filter(
    (load) => load.lat != null && load.lng != null && isLive(load.positionAt),
  );
  const stale = desk.loads.filter(
    (load) => load.lat != null && load.lng != null && !isLive(load.positionAt),
  );
  const stepLabels = {
    loaded: t.loaded,
    rolling: t.rolling,
    fifteen_min: t.away,
    arrived: t.arrived,
    delayed: t.delayed,
  };

  useEffect(() => {
    const timer = window.setInterval(() => void refreshRemote(), 5000);
    return () => window.clearInterval(timer);
  }, [refreshRemote]);

  useEffect(() => {
    let liveFetch = true;
    void fetchInventory()
      .then((rows) => {
        if (liveFetch) setLots(rows);
      })
      .catch(() => {
        if (liveFetch) setLots([]);
      });
    return () => {
      liveFetch = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.liveLocation}</CardTitle>
          <CardDescription>{t.liveLocationHint}</CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-3">
          <TripMap
            depotLabel={t.mapDepot}
            yardLabel={t.mapYard}
            trucks={[...live, ...stale].map((load) => ({
              id: load.id,
              label: load.loadRef,
              lat: load.lat!,
              lng: load.lng!,
              live: isLive(load.positionAt),
            }))}
          />
          {live.length === 0 && stale.length === 0 && (
            <p className="text-sm text-muted-foreground">{t.noLive}</p>
          )}
          {live.map((load) => (
            <div key={load.id} className="flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <span className="text-sm font-medium">{load.loadRef}</span>
                <Badge variant="outline">{t.simulated}</Badge>
                <Badge variant="secondary">
                  {loadDirection(load, orgName) === "pickup" ? t.pickup : t.dropoff}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {load.lat?.toFixed(4)}, {load.lng?.toFixed(4)} · {updatedAgo(load.positionAt)}
                </span>
              </div>
              <TripSteps status={load.status} labels={stepLabels} />
            </div>
          ))}
          {stale.map((load) => (
            <div key={load.id} className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
                <span className="text-sm font-medium">{load.loadRef}</span>
                <Badge variant="secondary">{t.lastKnown}</Badge>
                <Badge variant="outline">
                  {loadDirection(load, orgName) === "pickup" ? t.pickup : t.dropoff}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {load.lat?.toFixed(4)}, {load.lng?.toFixed(4)} · {updatedAgo(load.positionAt)}
                </span>
              </div>
              <TripSteps status={load.status} labels={stepLabels} />
            </div>
          ))}
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.yardTraffic}</CardTitle>
          <CardDescription>{t.yardTrafficHint}</CardDescription>
        </CardHeader>
        <CardPanel>
          <div className="overflow-x-auto">
            <Table variant="card">
              <TableHeader>
                <TableRow>
                  <TableHead>{t.load}</TableHead>
                  <TableHead>{t.type}</TableHead>
                  <TableHead>{t.carrier}</TableHead>
                  <TableHead>{t.dock}</TableHead>
                  <TableHead>{t.eta}</TableHead>
                  <TableHead>{t.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {desk.loads.map((load) => {
                  const direction = loadDirection(load, orgName);
                  return (
                    <TableRow key={load.id}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span>{load.loadRef}</span>
                          <span className="text-xs text-muted-foreground">{load.commodity}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={direction === "pickup" ? "outline" : "secondary"}>
                          {direction === "pickup" ? t.pickup : t.dropoff}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span>{load.carrier}</span>
                          <span className="text-xs text-muted-foreground">
                            {load.plate} · {load.trailer}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{load.dock}</TableCell>
                      <TableCell>{load.eta}</TableCell>
                      <TableCell>
                        <Badge variant={load.status === "fifteen_min" ? "warning" : "secondary"}>
                          {loadStatusTitle(load.status, t)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.inventory}</CardTitle>
          <CardDescription>{t.inventoryHint}</CardDescription>
        </CardHeader>
        <CardPanel>
          {lots.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.emptyInventory}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table variant="card">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.sku}</TableHead>
                    <TableHead>{t.goods}</TableHead>
                    <TableHead>{t.quantity}</TableHead>
                    <TableHead>{t.location}</TableHead>
                    <TableHead>{t.status}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lots.map((lot) => (
                    <TableRow key={lot.id}>
                      <TableCell>{lot.sku}</TableCell>
                      <TableCell>{lot.commodity}</TableCell>
                      <TableCell>
                        {lot.quantity} {lot.unit}
                      </TableCell>
                      <TableCell>{lot.location}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{lot.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardPanel>
      </Card>
    </div>
  );
}
