"use client";

import { MapPinIcon } from "lucide-react";
import { timeAgo, useI18n } from "@/lib/i18n";

/** "Updated 2 min ago · Open in Maps", instead of raw coordinates. */
export function PositionLine({
  lat,
  lng,
  at,
  className = "",
}: {
  lat: number | null | undefined;
  lng: number | null | undefined;
  at: string | null | undefined;
  className?: string;
}) {
  const { t } = useI18n();
  if (lat == null || lng == null) {
    return <span className={`text-xs text-muted-foreground ${className}`}>{t.noPosition}</span>;
  }
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 text-xs text-muted-foreground ${className}`}>
      <MapPinIcon className="size-3" aria-hidden />
      {t.updated} {timeAgo(at, t)}
      <span aria-hidden>·</span>
      <a
        className="underline underline-offset-2 hover:text-foreground"
        href={`https://www.google.com/maps?q=${lat},${lng}`}
        target="_blank"
        rel="noreferrer"
      >
        {t.openInMaps}
      </a>
    </span>
  );
}
