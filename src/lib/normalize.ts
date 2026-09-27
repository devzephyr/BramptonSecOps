/**
 * Clean-up rules for free-text load fields. The API applies them when a load is saved, and the
 * desks apply them when displaying, so rows saved before these rules existed read the same way.
 */

/** "  frozen   poultry " -> "Frozen poultry" */
export function cleanCommodity(value: string): string {
  const text = value.trim().replace(/\s+/g, " ");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/** "-20 C", "-20c", "-20°C", "-20 °C" -> "-20 °C"; "ambient" -> "Ambient"; empty stays empty. */
export function formatSetpoint(value: string | null | undefined): string {
  const text = (value ?? "").trim().replace(/\s+/g, " ");
  if (!text) return "";
  const match = text.match(/^([-+−]?\d+(?:[.,]\d+)?)\s*°?\s*([cf])$/i);
  if (match) return `${match[1].replace("−", "-").replace(",", ".")} °${match[2].toUpperCase()}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** ETA passed and the load hasn't arrived or been handed to a warehouse. */
export function isLate(eta: Date | string | null | undefined, status: string, now = Date.now()): boolean {
  if (!eta || status === "arrived" || status === "at_facility") return false;
  const when = new Date(eta).getTime();
  return Number.isFinite(when) && when < now;
}
