export type LatLng = { lat: number; lng: number };

/** Simulated trip: Mississauga depot to the Brampton yard via Hwy 403 and 410 (Mapbox Directions, simplified to ~20 m). */
export const ROUTE: LatLng[] = [
  { lat: 43.59418, lng: -79.64251 },
  { lat: 43.59418, lng: -79.64325 },
  { lat: 43.59477, lng: -79.64399 },
  { lat: 43.59775, lng: -79.64032 },
  { lat: 43.59980, lng: -79.64312 },
  { lat: 43.60088, lng: -79.64358 },
  { lat: 43.60415, lng: -79.64059 },
  { lat: 43.61128, lng: -79.63307 },
  { lat: 43.61360, lng: -79.63180 },
  { lat: 43.61529, lng: -79.63161 },
  { lat: 43.61715, lng: -79.63207 },
  { lat: 43.61901, lng: -79.63318 },
  { lat: 43.62067, lng: -79.63476 },
  { lat: 43.63106, lng: -79.64821 },
  { lat: 43.63579, lng: -79.65348 },
  { lat: 43.63917, lng: -79.65995 },
  { lat: 43.64139, lng: -79.66316 },
  { lat: 43.66961, lng: -79.70073 },
  { lat: 43.67217, lng: -79.70293 },
  { lat: 43.68142, lng: -79.70733 },
  { lat: 43.68508, lng: -79.71046 },
  { lat: 43.72404, lng: -79.76313 },
  { lat: 43.72584, lng: -79.76522 },
  { lat: 43.73205, lng: -79.77040 },
  { lat: 43.73645, lng: -79.77543 },
  { lat: 43.73744, lng: -79.77597 },
  { lat: 43.73844, lng: -79.77600 },
  { lat: 43.73898, lng: -79.77647 },
  { lat: 43.73930, lng: -79.77693 },
  { lat: 43.73535, lng: -79.78223 },
  { lat: 43.73399, lng: -79.78506 },
  { lat: 43.73362, lng: -79.78543 },
  { lat: 43.73322, lng: -79.78472 },
  { lat: 43.73206, lng: -79.78591 },
  { lat: 43.73153, lng: -79.78526 },
  { lat: 43.73024, lng: -79.78657 },
];
export const SIM_STEPS = 40;
export const SIM_TICK_MS = 3000;

function segmentLengths(): number[] {
  return ROUTE.slice(1).map((point, index) =>
    Math.hypot(point.lat - ROUTE[index].lat, point.lng - ROUTE[index].lng),
  );
}

export function simPosition(step: number): LatLng {
  const done = Math.min(Math.max(step / SIM_STEPS, 0), 1);
  const lengths = segmentLengths();
  let remaining = done * lengths.reduce((sum, length) => sum + length, 0);
  for (let index = 0; index < lengths.length; index++) {
    if (remaining <= lengths[index] || index === lengths.length - 1) {
      const t =
        lengths[index] === 0 ? 0 : Math.min(remaining / lengths[index], 1);
      const from = ROUTE[index];
      const to = ROUTE[index + 1];
      return {
        lat: from.lat + (to.lat - from.lat) * t,
        lng: from.lng + (to.lng - from.lng) * t,
      };
    }
    remaining -= lengths[index];
  }
  return ROUTE[ROUTE.length - 1];
}

export function updatedAgo(
  positionAt: string | null | undefined,
  now = Date.now(),
): string {
  if (!positionAt) return "—";
  const seconds = Math.max(
    0,
    Math.round((now - new Date(positionAt).getTime()) / 1000),
  );
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

export function isLive(
  positionAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!positionAt) return false;
  return now - new Date(positionAt).getTime() < 5 * 60 * 1000;
}
