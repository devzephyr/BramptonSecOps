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
/** More GTA corridors for the fleet simulation (Mapbox Directions, simplified). The first entry is the driver trip above. */
export const ROUTES: LatLng[][] = [
  ROUTE,
  // hamilton-qew, 48.5 km
  [
    { lat: 43.25572, lng: -79.87114 },
    { lat: 43.26294, lng: -79.89241 },
    { lat: 43.28838, lng: -79.89697 },
    { lat: 43.31062, lng: -79.86141 },
    { lat: 43.33765, lng: -79.83166 },
    { lat: 43.40621, lng: -79.82931 },
    { lat: 43.43930, lng: -79.79372 },
    { lat: 43.46983, lng: -79.78297 },
    { lat: 43.48723, lng: -79.76237 },
    { lat: 43.50263, lng: -79.75504 },
    { lat: 43.59946, lng: -79.64296 },
    { lat: 43.59418, lng: -79.64251 },
  ],
  // milton-401, 34.5 km
  [
    { lat: 43.51833, lng: -79.87745 },
    { lat: 43.53788, lng: -79.85620 },
    { lat: 43.54274, lng: -79.86057 },
    { lat: 43.60360, lng: -79.79310 },
    { lat: 43.61214, lng: -79.77996 },
    { lat: 43.61831, lng: -79.76105 },
    { lat: 43.63701, lng: -79.74181 },
    { lat: 43.66649, lng: -79.70071 },
    { lat: 43.68508, lng: -79.71046 },
    { lat: 43.72404, lng: -79.76313 },
    { lat: 43.73898, lng: -79.77647 },
    { lat: 43.73399, lng: -79.78506 },
    { lat: 43.73024, lng: -79.78657 },
  ],
  // scarborough-401, 65.8 km
  [
    { lat: 43.77637, lng: -79.23178 },
    { lat: 43.78705, lng: -79.23489 },
    { lat: 43.76874, lng: -79.31195 },
    { lat: 43.76872, lng: -79.33373 },
    { lat: 43.77187, lng: -79.33851 },
    { lat: 43.80930, lng: -79.34661 },
    { lat: 43.81780, lng: -79.35928 },
    { lat: 43.83776, lng: -79.36695 },
    { lat: 43.83880, lng: -79.41398 },
    { lat: 43.82131, lng: -79.47313 },
    { lat: 43.81487, lng: -79.47937 },
    { lat: 43.80121, lng: -79.48273 },
    { lat: 43.79371, lng: -79.49361 },
    { lat: 43.77879, lng: -79.55803 },
    { lat: 43.76174, lng: -79.60331 },
    { lat: 43.75343, lng: -79.63647 },
    { lat: 43.72791, lng: -79.67311 },
    { lat: 43.71097, lng: -79.67673 },
    { lat: 43.66942, lng: -79.70016 },
    { lat: 43.61863, lng: -79.63325 },
    { lat: 43.61162, lng: -79.63314 },
    { lat: 43.60182, lng: -79.64612 },
    { lat: 43.59781, lng: -79.64082 },
    { lat: 43.59418, lng: -79.64251 },
  ],
  // etobicoke-vaughan, 31.8 km
  [
    { lat: 43.61944, lng: -79.51972 },
    { lat: 43.61491, lng: -79.54459 },
    { lat: 43.61579, lng: -79.55063 },
    { lat: 43.67025, lng: -79.57440 },
    { lat: 43.67234, lng: -79.57796 },
    { lat: 43.67244, lng: -79.58989 },
    { lat: 43.68126, lng: -79.59366 },
    { lat: 43.68709, lng: -79.60138 },
    { lat: 43.72853, lng: -79.62564 },
    { lat: 43.74843, lng: -79.62966 },
    { lat: 43.75552, lng: -79.62571 },
    { lat: 43.76245, lng: -79.60012 },
    { lat: 43.77743, lng: -79.56129 },
    { lat: 43.78458, lng: -79.52243 },
    { lat: 43.79840, lng: -79.52531 },
    { lat: 43.79763, lng: -79.53005 },
    { lat: 43.80016, lng: -79.53006 },
  ],
];

/** Simplified 407/401 corridor from the Brampton cross-dock to North York. Not a live directions call. */
export const BRAMPTON_TO_NORTH_YORK: LatLng[] = [
  { lat: 43.73024, lng: -79.78657 },
  { lat: 43.7374, lng: -79.762 },
  { lat: 43.7482, lng: -79.69 },
  { lat: 43.7588, lng: -79.61 },
  { lat: 43.7664, lng: -79.52 },
  { lat: 43.7612, lng: -79.45 },
  { lat: 43.7614, lng: -79.411 },
];

/** Planned line for the focus map. Known city pairs use their corridor; every other load uses the depot route. */
export function plannedRoute(origin: string, destination: string): LatLng[] {
  const text = `${origin} ${destination}`.toLowerCase();
  if (text.includes("brampton") && text.includes("north york")) return BRAMPTON_TO_NORTH_YORK;
  return ROUTE;
}

export const SIM_STEPS = 40;
export const SIM_TICK_MS = 3000;

/** Point `done` (0..1) of the way along a route, measured by distance. */
export function positionOn(route: LatLng[], done: number): LatLng {
  const lengths = route.slice(1).map((point, index) => Math.hypot(point.lat - route[index].lat, point.lng - route[index].lng));
  let remaining = Math.min(Math.max(done, 0), 1) * lengths.reduce((sum, length) => sum + length, 0);
  for (let index = 0; index < lengths.length; index++) {
    if (remaining <= lengths[index] || index === lengths.length - 1) {
      const t = lengths[index] === 0 ? 0 : Math.min(remaining / lengths[index], 1);
      const from = route[index];
      const to = route[index + 1];
      return { lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t };
    }
    remaining -= lengths[index];
  }
  return route[route.length - 1];
}

export function simPosition(step: number): LatLng {
  return positionOn(ROUTE, step / SIM_STEPS);
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
