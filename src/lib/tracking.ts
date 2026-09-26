export const DEPOT = { lat: 43.59, lng: -79.64 };
export const YARD = { lat: 43.73, lng: -79.76 };
export const SIM_STEPS = 40;
export const SIM_TICK_MS = 3000;

export function simPosition(step: number): { lat: number; lng: number } {
  const done = Math.min(Math.max(step / SIM_STEPS, 0), 1);
  return {
    lat: DEPOT.lat + (YARD.lat - DEPOT.lat) * done,
    lng: DEPOT.lng + (YARD.lng - DEPOT.lng) * done,
  };
}

export function tripProgress(lat: number, lng: number): number {
  const dx = YARD.lng - DEPOT.lng;
  const dy = YARD.lat - DEPOT.lat;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return 0;
  const done = ((lng - DEPOT.lng) * dx + (lat - DEPOT.lat) * dy) / len2;
  return Math.min(Math.max(done, 0), 1);
}

export function updatedAgo(positionAt: string | null | undefined, now = Date.now()): string {
  if (!positionAt) return "—";
  const seconds = Math.max(0, Math.round((now - new Date(positionAt).getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

export function isLive(positionAt: string | null | undefined, now = Date.now()): boolean {
  if (!positionAt) return false;
  return now - new Date(positionAt).getTime() < 5 * 60 * 1000;
}
