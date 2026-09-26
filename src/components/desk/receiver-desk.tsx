"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toastManager } from "@/components/ui/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeskApiError, uploadEvidence } from "@/lib/desk-client";
import { useI18n, loadStatusTitle } from "@/lib/i18n";
import { isLive, updatedAgo } from "@/lib/tracking";
import { useDesk } from "@/preview/store";
import { TripMap } from "@/components/desk/trip-map";
import { TripSteps } from "@/components/desk/trip-steps";

export function ReceiverDesk() {
  const desk = useDesk();
  const { refreshRemote } = desk;
  const { t } = useI18n();
  const [podLoad, setPodLoad] = useState("");
  const [podBusy, setPodBusy] = useState(false);
  const [podError, setPodError] = useState<string | null>(null);
  const live = desk.loads.filter(
    (load) => load.lat != null && load.lng != null && isLive(load.positionAt),
  );
  const stepLabels = { loaded: t.loaded, rolling: t.rolling, fifteen_min: t.away, arrived: t.arrived, delayed: t.delayed };
  const stale = desk.loads.filter(
    (load) => load.lat != null && load.lng != null && !isLive(load.positionAt),
  );

  useEffect(() => {
    const timer = window.setInterval(() => void refreshRemote(), 5000);
    return () => window.clearInterval(timer);
  }, [refreshRemote]);

  async function onPodFile(file: File | undefined) {
    if (!file || !podLoad || podBusy) return;
    setPodBusy(true);
    setPodError(null);
    try {
      const done = await uploadEvidence({ file, label: file.name, loadId: podLoad });
      toastManager.add({ type: "success", title: t.podSaved, description: `sha256 ${done.contentHash.slice(0, 12)}…` });
    } catch (err) {
      if (err instanceof DeskApiError) setPodError(err.message);
      else setPodError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setPodBusy(false);
    }
  }

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
          <CardTitle>{t.incoming}</CardTitle>
          <CardDescription>{t.incomingHint}</CardDescription>
        </CardHeader>
        <CardPanel>
          <div className="overflow-x-auto">
          <Table variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>{t.load}</TableHead>
                <TableHead>{t.eta}</TableHead>
                <TableHead>{t.dock}</TableHead>
                <TableHead>{t.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {desk.loads.map((load) => (
                <TableRow key={load.id}>
                  <TableCell>{load.loadRef}</TableCell>
                  <TableCell>{load.eta}</TableCell>
                  <TableCell>{load.dock}</TableCell>
                  <TableCell>
                    <Badge variant={load.status === "fifteen_min" ? "warning" : "secondary"}>
                      {loadStatusTitle(load.status, t)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardPanel>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.pod}</CardTitle>
          <CardDescription>{t.podHint}</CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{t.notApproval}</p>
          {podError && (
            <Alert variant="error">
              <AlertDescription>{podError}</AlertDescription>
            </Alert>
          )}
          <Select value={podLoad} onValueChange={(value) => setPodLoad(String(value))}>
            <SelectTrigger>
              <SelectValue>{(value) => desk.loads.find((load) => load.id === value)?.loadRef ?? t.pickLoad}</SelectValue>
            </SelectTrigger>
            <SelectPopup>
              {desk.loads.map((load) => (
                <SelectItem key={load.id} value={load.id}>
                  {load.loadRef}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <Input
            type="file"
            accept="image/*"
            aria-label={t.pod}
            disabled={podBusy || !podLoad}
            onChange={(event) => {
              void onPodFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {podBusy && <p className="text-sm text-muted-foreground">{t.uploading}</p>}
        </CardPanel>
      </Card>
    </div>
  );
}
