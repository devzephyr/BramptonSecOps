"use client";

import { Badge } from "@/components/ui/badge";
import { Meter, MeterIndicator, MeterTrack } from "@/components/ui/meter";
import { DRIVING_LIMIT_MS, formatDuration, WARN_BEFORE_MS, type HosSummary } from "@/lib/hos";
import { dutyStatusTitle, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type ClockState = "ok" | "due" | "owed" | "over";

export function clockState(hos: HosSummary): ClockState {
  if (hos.overLimitMs > 0) return "over";
  if (hos.breakOwed) return "owed";
  if (hos.remainingMs <= WARN_BEFORE_MS && hos.drivingMs > 0) return "due";
  return "ok";
}

export function DutyBadge({ hos }: { hos: HosSummary }) {
  const { t } = useI18n();
  const state = clockState(hos);
  const variant = state === "over" ? "error" : state === "owed" || state === "due" ? "warning" : hos.status === "driving" ? "info" : "outline";
  return <Badge variant={variant}>{dutyStatusTitle(hos.status, t)}</Badge>;
}

/** Driving time since the last qualifying break, against the 8-hour limit. */
export function DutyClock({ hos, className }: { hos: HosSummary; className?: string }) {
  const { t } = useI18n();
  const state = clockState(hos);
  const used = Math.min(hos.drivingMs, DRIVING_LIMIT_MS);
  let detail: string;
  if (state === "over") detail = `${t.overLimit} ${formatDuration(hos.overLimitMs)}`;
  else if (state === "owed") detail = `${t.breakLeft}: ${formatDuration(Math.ceil(hos.breakLeftMs / 60000) * 60000)}`;
  else detail = `${t.leftBeforeBreak}: ${formatDuration(hos.remainingMs)}`;

  return (
    <Meter value={used} min={0} max={DRIVING_LIMIT_MS} aria-label={t.drivingClock} className={cn("gap-1.5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
        <span className="text-muted-foreground">
          {t.drivingClock}:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {formatDuration(hos.drivingMs)} / {formatDuration(DRIVING_LIMIT_MS)}
          </span>
        </span>
        <span
          className={cn(
            "tabular-nums",
            state === "over" && "font-semibold text-destructive-foreground",
            (state === "owed" || state === "due") && "font-medium text-warning-foreground",
          )}
        >
          {detail}
        </span>
      </div>
      <MeterTrack className="rounded-full">
        <MeterIndicator
          className={cn(
            "rounded-full",
            state === "over" && "bg-destructive",
            (state === "owed" || state === "due") && "bg-warning",
          )}
        />
      </MeterTrack>
    </Meter>
  );
}
