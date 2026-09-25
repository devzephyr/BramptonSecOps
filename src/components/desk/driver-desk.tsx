"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { postPosition } from "@/lib/desk-client";
import { useI18n } from "@/lib/i18n";
import { SIM_STEPS, SIM_TICK_MS, simPosition } from "@/lib/tracking";
import { toastManager } from "@/components/ui/toast";
import { useDesk } from "@/preview/store";

export function DriverDesk() {
  const desk = useDesk();
  const { t } = useI18n();
  const mine = desk.loads.filter((load) => load.driverId === desk.user.id);
  const [sim, setSim] = useState<string | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    },
    [],
  );

  function stopSim(silent = false) {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    const wasLive = sim !== null;
    setSim(null);
    if (wasLive && !silent) toastManager.add({ type: "info", title: t.toastTripStopped });
  }

  function startSim(loadId: string) {
    stopSim();
    setSimError(null);
    let step = 0;
    const tick = async () => {
      const point = simPosition(step);
      try {
        await postPosition(loadId, point.lat, point.lng);
        await desk.refreshRemote();
      } catch (err) {
        setSimError(err instanceof Error ? err.message : "Could not share position.");
        stopSim(true);
        return;
      }
      step += 1;
      if (step > SIM_STEPS) stopSim();
    };
    setSim(loadId);
    toastManager.add({ type: "info", title: t.toastTrip });
    void tick();
    timer.current = window.setInterval(() => void tick(), SIM_TICK_MS);
  }

  const taps = [
    ["loaded", t.loaded],
    ["rolling", t.rolling],
    ["fifteen_min", t.away],
    ["arrived", t.arrived],
    ["delayed", t.delayed],
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      {mine.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t.noLoads}</CardTitle>
            <CardDescription>{t.noLoadsHint}</CardDescription>
          </CardHeader>
        </Card>
      )}
      {simError && (
        <Alert variant="error">
          <AlertDescription>{simError}</AlertDescription>
        </Alert>
      )}
      {mine.map((load) => (
        <Card key={load.id}>
          <CardHeader>
            <CardTitle>{load.loadRef}</CardTitle>
            <CardDescription>
              {load.commodity} · {load.dock} · {load.plate}
            </CardDescription>
          </CardHeader>
          <CardPanel className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {taps.map(([status, label]) => (
              <Button
                key={status}
                size="xl"
                className="min-h-16 text-base"
                variant={status === "fifteen_min" ? "default" : "outline"}
                onClick={() => void desk.pushStatus(load.id, status)}
              >
                {label}
              </Button>
            ))}
          </CardPanel>
          <CardPanel className="flex flex-wrap items-center gap-2 border-t pt-3">
            <Badge variant="outline">{t.simulated}</Badge>
            {sim === load.id ? (
              <Button size="sm" variant="outline" onClick={() => stopSim()}>
                {t.stopTrip}
              </Button>
            ) : (
              <Button size="sm" onClick={() => startSim(load.id)}>
                {t.startTrip}
              </Button>
            )}
          </CardPanel>
        </Card>
      ))}
    </div>
  );
}
