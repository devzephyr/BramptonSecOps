"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ROUTE, type LatLng } from "@/lib/tracking";

export type MapTruck = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  live: boolean;
};

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
export const mapboxConfigured = TOKEN.length > 0;
const STYLE_URL = "mapbox://styles/mapbox/streets-v12";

type MapLib = (typeof import("mapbox-gl"))["default"];
type MapInstance = InstanceType<MapLib["Map"]>;
type MarkerInstance = InstanceType<MapLib["Marker"]>;

function truckElement(label: string, live: boolean) {
  const el = document.createElement("div");
  el.className = "flex flex-col items-center";
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", label);
  const dot = document.createElement("span");
  dot.className = `block h-4 w-4 rounded-full border-2 border-white shadow ${live ? "bg-emerald-500" : "bg-zinc-400"}`;
  const tag = document.createElement("span");
  tag.className = "mt-1 rounded bg-white/90 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-900 shadow";
  tag.textContent = label;
  el.append(dot, tag);
  return el;
}

function pinElement(label: string) {
  const el = document.createElement("div");
  el.className = "rounded bg-zinc-900/85 px-1.5 py-0.5 text-[10px] font-medium text-white shadow";
  el.textContent = label;
  return el;
}

/** Live trip map on Mapbox. Without a token, renders `fallback` when one is passed, otherwise nothing. */
export function TripMap({
  trucks,
  trail,
  follow,
  focusDestination = false,
  fitTrucks = false,
  className = "h-72",
  depotLabel,
  yardLabel,
  route,
  routeColor = "#2563eb",
  routeDashed = true,
  fallback = null,
}: {
  trucks: MapTruck[];
  /** Where the truck actually went, oldest first. Drawn solid over the dashed planned route. */
  trail?: { lat: number; lng: number }[];
  follow?: string | null;
  /** Zoom the camera onto the destination pin and hold it there. */
  focusDestination?: boolean;
  /** Keep every truck in view: refit when trucks appear, disappear, or drive out of the frame. */
  fitTrucks?: boolean;
  className?: string;
  depotLabel: string;
  yardLabel: string;
  /** Planned line. Defaults to the depot-to-yard route. */
  route?: LatLng[];
  routeColor?: string;
  routeDashed?: boolean;
  /** Shown in place of the map when Mapbox is unavailable. */
  fallback?: ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const lib = useRef<MapLib | null>(null);
  const markers = useRef(new Map<string, { marker: MarkerInstance; look: string }>());
  const [ready, setReady] = useState(false);
  const fittedIds = useRef("");
  const yardPin = useRef<HTMLDivElement | null>(null);
  const wasFocused = useRef(false);
  const [failed, setFailed] = useState(!TOKEN);
  const line = route && route.length > 1 ? route : ROUTE;
  const routeKey = line.map((point) => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`).join(";");

  useEffect(() => {
    if (!TOKEN) return;
    let cancelled = false;
    const owned = markers.current;
    void import("mapbox-gl")
      .then(({ default: mapbox }) => {
        if (cancelled || !container.current) return;
        lib.current = mapbox;
        const instance = new mapbox.Map({
          accessToken: TOKEN,
          container: container.current,
          style: STYLE_URL,
          bounds: [
            [Math.min(...line.map((p) => p.lng)), Math.min(...line.map((p) => p.lat))],
            [Math.max(...line.map((p) => p.lng)), Math.max(...line.map((p) => p.lat))],
          ],
          fitBoundsOptions: { padding: 40 },
          cooperativeGestures: true,
          attributionControl: false,
        });
        instance.addControl(new mapbox.NavigationControl({ showCompass: false }), "top-right");
        instance.addControl(new mapbox.AttributionControl({ compact: true }));
        instance.on("error", () => setFailed((current) => current || !instance.isStyleLoaded()));
        instance.on("load", () => {
          instance.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: line.map((p) => [p.lng, p.lat]) },
            },
          });
          instance.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": routeColor,
              "line-width": 4,
              "line-opacity": routeDashed ? 0.55 : 0.95,
              "line-dasharray": routeDashed ? [2, 1.5] : [1, 0],
            },
          });
          instance.addSource("trail", {
            type: "geojson",
            data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
          });
          instance.addLayer({
            id: "trail",
            type: "line",
            source: "trail",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#0d9488", "line-width": 4, "line-opacity": 0.9 },
          });
          new mapbox.Marker({ element: pinElement(depotLabel), anchor: "bottom" })
            .setLngLat([line[0].lng, line[0].lat])
            .addTo(instance);
          const yard = pinElement(yardLabel);
          yardPin.current = yard;
          new mapbox.Marker({ element: yard, anchor: "bottom" })
            .setLngLat([line[line.length - 1].lng, line[line.length - 1].lat])
            .addTo(instance);
          setReady(true);
        });
        map.current = instance;
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      owned.forEach(({ marker }) => marker.remove());
      owned.clear();
      map.current?.remove();
      map.current = null;
    };
  }, [depotLabel, line, routeColor, routeDashed, routeKey, yardLabel]);

  useEffect(() => {
    const instance = map.current;
    const mapbox = lib.current;
    if (!ready || !instance || !mapbox) return;
    const seen = new Set<string>();
    for (const truck of trucks) {
      seen.add(truck.id);
      const look = `${truck.label}|${truck.live}`;
      const existing = markers.current.get(truck.id);
      if (existing && existing.look === look) {
        existing.marker.setLngLat([truck.lng, truck.lat]);
        continue;
      }
      existing?.marker.remove();
      const marker = new mapbox.Marker({ element: truckElement(truck.label, truck.live) })
        .setLngLat([truck.lng, truck.lat])
        .addTo(instance);
      markers.current.set(truck.id, { marker, look });
    }
    for (const [id, entry] of markers.current) {
      if (!seen.has(id)) {
        entry.marker.remove();
        markers.current.delete(id);
      }
    }
    const target = trucks.find((truck) => truck.id === follow);
    if (!focusDestination && target) instance.easeTo({ center: [target.lng, target.lat], duration: 800 });
    else if (!focusDestination && fitTrucks && trucks.length > 0) {
      const ids = trucks.map((truck) => truck.id).sort().join(",");
      const view = instance.getBounds();
      const outside = trucks.some((truck) => view && !view.contains([truck.lng, truck.lat]));
      if (outside || ids !== fittedIds.current) {
        fittedIds.current = ids;
        const lngs = [...trucks.map((truck) => truck.lng), line[0].lng, line[line.length - 1].lng];
        const lats = [...trucks.map((truck) => truck.lat), line[0].lat, line[line.length - 1].lat];
        instance.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: 60, maxZoom: 12, duration: 800 },
        );
      }
    }
  }, [fitTrucks, focusDestination, follow, line, ready, trucks]);

  useEffect(() => {
    const instance = map.current;
    const pin = yardPin.current;
    if (pin) {
      pin.className = focusDestination
        ? "rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground shadow ring-2 ring-white"
        : "rounded bg-zinc-900/85 px-1.5 py-0.5 text-[10px] font-medium text-white shadow";
    }
    if (!ready || !instance) return;
    const destination = line[line.length - 1];
    if (focusDestination) {
      wasFocused.current = true;
      instance.easeTo({ center: [destination.lng, destination.lat], zoom: 14, duration: 700 });
      return;
    }
    if (!wasFocused.current) return;
    wasFocused.current = false;
    instance.fitBounds(
      [
        [Math.min(...line.map((point) => point.lng)), Math.min(...line.map((point) => point.lat))],
        [Math.max(...line.map((point) => point.lng)), Math.max(...line.map((point) => point.lat))],
      ],
      { padding: 40, duration: 700 },
    );
  }, [focusDestination, line, ready]);

  useEffect(() => {
    const source = map.current?.getSource("trail");
    if (!ready || !source || source.type !== "geojson") return;
    source.setData({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: (trail ?? []).map((point) => [point.lng, point.lat]) },
    });
  }, [ready, trail]);

  if (failed) {
    if (!fallback) return null;
    return <div className={`w-full overflow-hidden rounded-lg border ${className}`}>{fallback}</div>;
  }
  return <div ref={container} className={`w-full overflow-hidden rounded-lg border ${className}`} />;
}
