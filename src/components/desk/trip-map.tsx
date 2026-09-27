"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";

export type MapTruck = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  live: boolean;
};

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
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

/** Greater Toronto Area, shown until there is a truck or trail to frame. */
const GTA_CENTER: [number, number] = [-79.65, 43.68];

/**
 * Live map on Mapbox: real truck positions and the trail each one actually drove. It keeps every
 * truck (and the trail) in view. Renders nothing when NEXT_PUBLIC_MAPBOX_TOKEN is unset.
 */
export function TripMap({
  trucks,
  trail,
  follow,
  className = "h-72",
}: {
  trucks: MapTruck[];
  /** Where the truck actually went, oldest first. */
  trail?: { lat: number; lng: number }[];
  follow?: string | null;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const lib = useRef<MapLib | null>(null);
  const markers = useRef(new Map<string, { marker: MarkerInstance; look: string }>());
  const [ready, setReady] = useState(false);
  const fittedIds = useRef("");
  const [failed, setFailed] = useState(!TOKEN);

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
          center: GTA_CENTER,
          zoom: 9,
          cooperativeGestures: true,
          attributionControl: false,
        });
        instance.addControl(new mapbox.NavigationControl({ showCompass: false }), "top-right");
        instance.addControl(new mapbox.AttributionControl({ compact: true }));
        instance.on("error", () => setFailed((current) => current || !instance.isStyleLoaded()));
        instance.on("load", () => {
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
  }, []);

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
    if (target) instance.easeTo({ center: [target.lng, target.lat], duration: 800 });
    else {
      // Frame every truck and the trail; refit when the set changes or something leaves the view.
      const points = [...trucks, ...(trail ?? [])];
      if (points.length === 0) return;
      const ids = `${trucks.map((truck) => truck.id).sort().join(",")}|${trail?.length ?? 0}`;
      const view = instance.getBounds();
      const outside = points.some((point) => view && !view.contains([point.lng, point.lat]));
      if (outside || ids !== fittedIds.current) {
        fittedIds.current = ids;
        const lngs = points.map((point) => point.lng);
        const lats = points.map((point) => point.lat);
        instance.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: 60, maxZoom: 13, duration: 800 },
        );
      }
    }
  }, [follow, ready, trail, trucks]);

  useEffect(() => {
    const source = map.current?.getSource("trail");
    if (!ready || !source || source.type !== "geojson") return;
    source.setData({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: (trail ?? []).map((point) => [point.lng, point.lat]) },
    });
  }, [ready, trail]);

  if (failed) return null;
  return <div ref={container} className={`w-full overflow-hidden rounded-lg border ${className}`} />;
}
