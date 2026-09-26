"use client";

import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TeamMember } from "@/lib/desk-client";

export const NO_DRIVER = "none";

/** One driver slot on a load; `exclude` hides the person already in the other slot. */
export function DriverPicker({
  label,
  emptyLabel,
  value,
  onChange,
  drivers,
  exclude,
  disabled,
}: {
  label: string;
  emptyLabel: string;
  value: string;
  onChange: (value: string) => void;
  drivers: TeamMember[];
  exclude?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <Select value={value} disabled={disabled} onValueChange={(next) => onChange(String(next))}>
        <SelectTrigger aria-label={label}>
          <SelectValue>{(id) => drivers.find((member) => member.id === id)?.name ?? emptyLabel}</SelectValue>
        </SelectTrigger>
        <SelectPopup>
          <SelectItem value={NO_DRIVER}>{emptyLabel}</SelectItem>
          {drivers
            .filter((member) => member.id !== exclude)
            .map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
        </SelectPopup>
      </Select>
    </div>
  );
}
