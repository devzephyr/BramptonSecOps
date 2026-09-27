"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { postPosition } from "@/lib/desk-client";

/** A phone reports a fix every second or so; the server only needs one every few seconds. */
const SEND_EVERY_MS = 5000;

export type SharingError = "unsupported" | "denied" | "unavailable" | "rejected";

/**
 * Shares the device's real GPS position for one load, from the browser's geolocation API.
 * Only one load is shared at a time; stopping, unmounting, or a server refusal ends the watch.
 */
export function useLocationSharing(onSent?: () => void) {
  const [loadId, setLoadId] = useState<string | null>(null);
  const [error, setError] = useState<{ kind: SharingError; message?: string } | null>(null);
  const watch = useRef<number | null>(null);
  const lastSent = useRef(0);
  const sending = useRef(false);

  const stop = useCallback(() => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    setLoadId(null);
  }, []);

  const start = useCallback(
    (id: string) => {
      stop();
      setError(null);
      if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        setError({ kind: "unsupported" });
        return;
      }
      lastSent.current = 0;
      setLoadId(id);
      watch.current = navigator.geolocation.watchPosition(
        (fix) => {
          const now = Date.now();
          if (sending.current || now - lastSent.current < SEND_EVERY_MS) return;
          sending.current = true;
          lastSent.current = now;
          void postPosition(id, fix.coords.latitude, fix.coords.longitude)
            .then(() => onSent?.())
            .catch((err: unknown) => {
              setError({ kind: "rejected", message: err instanceof Error ? err.message : undefined });
              stop();
            })
            .finally(() => {
              sending.current = false;
            });
        },
        (failure) => {
          setError({ kind: failure.code === failure.PERMISSION_DENIED ? "denied" : "unavailable" });
          if (failure.code === failure.PERMISSION_DENIED) stop();
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
      );
    },
    [onSent, stop],
  );

  useEffect(
    () => () => {
      if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    },
    [],
  );

  return { sharingLoadId: loadId, error, start, stop };
}
