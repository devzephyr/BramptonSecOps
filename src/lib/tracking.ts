export type LatLng = { lat: number; lng: number };

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
