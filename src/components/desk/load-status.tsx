"use client";

import { Badge } from "@/components/ui/badge";
import { loadStatusTitle, useI18n } from "@/lib/i18n";

/** The load's status everywhere: "At <warehouse>" when a facility holds it, plus "Late" when the ETA has passed. */
export function LoadStatus({
  status,
  facility,
  late,
}: {
  status: string;
  facility?: string | null;
  late?: boolean;
}) {
  const { t } = useI18n();
  const atFacility = status === "at_facility" || Boolean(facility);
  const variant =
    status === "arrived" ? "success" : status === "delayed" || status === "fifteen_min" ? "warning" : "outline";
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge variant={atFacility ? "secondary" : variant}>
        {atFacility && facility ? `${t.atFacility} ${facility}` : loadStatusTitle(atFacility ? "at_facility" : status, t)}
      </Badge>
      {late && !atFacility && <Badge variant="error">{t.late}</Badge>}
    </span>
  );
}
