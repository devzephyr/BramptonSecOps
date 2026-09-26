"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toastManager } from "@/components/ui/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeskApiError, uploadEvidence } from "@/lib/desk-client";
import { useI18n } from "@/lib/i18n";
import { isLive, tripProgress, updatedAgo } from "@/lib/tracking";
import { useDesk } from "@/preview/store";
import type { Load } from "@/preview/data";

function stopIndex(status: string): number {
  if (status === "arrived") return 3;
  if (status === "fifteen_min") return 2;
  if (status === "rolling" || status === "delayed") return 1;
  return 0;
}

function EtaRail({ load, labels }: { load: Load; labels: string[] }) {
  const current = stopIndex(load.status);
  return (
    <ol className="flex flex-col gap-0">
      {labels.map((label, index) => {
        const done = index < current;
        const now = index === current;
        return (
          <li key={label} className="flex gap-3">
            <span className="flex flex-col items-center">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  done ? "bg-emerald-500" : now ? "animate-pulse bg-amber-500" : "bg-muted-foreground/30"
                }`}
              />
              {index < labels.length - 1 && <span className="w-px flex-1 bg-border" />}
            </span>
            <span className={`pb-3 text-xs ${now ? "font-medium" : "text-muted-foreground"}`}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function ReceiverDesk() {  const desk = useDesk();
  const { t } = useI18n();
  const [podLoad, setPodLoad] = useState("");
  const [podBusy, setPodBusy] = useState(false);
  const [podError, setPodError] = useState<string | null>(null);
  const live = desk.loads.filter(
    (load) => load.lat != null && load.lng != null && isLive(load.positionAt),
  );

  useEffect(() => {
    const timer = window.setInterval(() => void desk.refreshRemote(), 5000);
    return () => window.clearInterval(timer);
  }, [desk]);

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
          {live.length === 0 && <p className="text-sm text-muted-foreground">{t.noLive}</p>}
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
              <Progress value={tripProgress(load.lat ?? 0, load.lng ?? 0)} max={1}>
                <ProgressTrack>
                  <ProgressIndicator />
                </ProgressTrack>
              </Progress>
              <EtaRail load={load} labels={[t.loaded, t.rolling, t.away, t.arrived]} />
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
                      {load.status === "fifteen_min" ? t.away : load.status}
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
            onChange={(event) => void onPodFile(event.target.files?.[0])}
          />
          {podBusy && <p className="text-sm text-muted-foreground">{t.uploading}</p>}
        </CardPanel>
      </Card>
    </div>
  );
}
