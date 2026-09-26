"use client";

import { ArrowRightIcon, TruckIcon, WarehouseIcon } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toastManager } from "@/components/ui/toast";
import { fetchTeam, transferCustody, type CustodyHop, type Holder, type TeamMember } from "@/lib/desk-client";
import { updatedAgo } from "@/lib/tracking";
import { useI18n } from "@/lib/i18n";

function HolderName({ holder }: { holder: Holder }) {
  const { t } = useI18n();
  if (!holder) return <span className="text-muted-foreground">{t.unassigned}</span>;
  const Icon = holder.kind === "facility" ? WarehouseIcon : TruckIcon;
  return (
    <span className="inline-flex items-center gap-1 font-medium">
      <Icon className="size-3.5 text-muted-foreground" aria-hidden />
      {holder.name}
    </span>
  );
}

/** Every hop the load has taken, oldest first. */
export function CustodyChain({ hops }: { hops: CustodyHop[] }) {
  const { t } = useI18n();
  if (hops.length === 0) return <p className="text-xs text-muted-foreground">{t.noCustody}</p>;
  return (
    <ol className="flex flex-col gap-2">
      {hops.map((hop) => (
        <li key={hop.id} className="flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-sm">
          <span className="flex flex-wrap items-center gap-1.5">
            <HolderName holder={hop.from} />
            <ArrowRightIcon className="size-3.5 text-muted-foreground" aria-hidden />
            <HolderName holder={hop.to} />
            {hop.sealIntact === true && <Badge variant="success">{t.sealOk}</Badge>}
            {hop.sealIntact === false && <Badge variant="error">{t.sealBad}</Badge>}
          </span>
          <span className="text-xs text-muted-foreground">
            {[hop.note, hop.sealNumber ? `${t.seal} ${hop.sealNumber}` : "", hop.actor, updatedAgo(hop.createdAt)]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </li>
      ))}
    </ol>
  );
}

const TO_FACILITY = "facility";

/**
 * Records a handoff. Drivers and receivers can only put the load into a facility; managers can also
 * hand it straight to a driver. The seal is typed in, not picked, so a swapped trailer gets caught.
 */
export function CustodyForm({
  loadId,
  allowDrivers,
  facilities,
  onDone,
}: {
  loadId: string;
  allowDrivers: boolean;
  facilities: string[];
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [target, setTarget] = useState(TO_FACILITY);
  const [facility, setFacility] = useState("");
  const [seal, setSeal] = useState("");
  const [broken, setBroken] = useState(false);
  const [note, setNote] = useState("");
  const [drivers, setDrivers] = useState<TeamMember[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (allowDrivers) void fetchTeam().then((team) => setDrivers(team.filter((member) => member.role === "driver")));
  }, [allowDrivers]);

  const toFacility = target === TO_FACILITY;
  const ready = toFacility ? facility.trim().length > 1 : Boolean(target);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !ready) return;
    setBusy(true);
    setError(null);
    try {
      const result = await transferCustody(loadId, {
        ...(toFacility ? { toFacility: facility.trim() } : { toUserId: target }),
        ...(seal.trim() ? { sealNumber: seal.trim() } : {}),
        ...(broken ? { sealIntact: false } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      toastManager.add(
        result.sealIntact === false
          ? { type: "warning", title: t.sealException }
          : { type: "success", title: t.handoffRecorded },
      );
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  const listId = `facilities-${loadId}`;
  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => void submit(event)}>
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {allowDrivers && (
        <Select value={target} onValueChange={(value) => setTarget(String(value))}>
          <SelectTrigger aria-label={t.handOff}>
            <SelectValue>
              {(value) =>
                value === TO_FACILITY ? t.toFacility : (drivers.find((member) => member.id === value)?.name ?? t.toDriver)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectPopup>
            <SelectItem value={TO_FACILITY}>{t.toFacility}</SelectItem>
            {drivers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {t.toDriver}: {member.name}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      )}
      {toFacility && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor={`${listId}-name`}>
            {t.facilityName}
          </label>
          <Input
            id={`${listId}-name`}
            list={listId}
            autoComplete="off"
            maxLength={120}
            placeholder={t.facilityHint}
            value={facility}
            onChange={(event) => setFacility(event.target.value)}
          />
          <datalist id={listId}>
            {facilities.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor={`${listId}-seal`}>
            {t.sealOnTrailer}
          </label>
          <Input
            id={`${listId}-seal`}
            autoComplete="off"
            maxLength={40}
            className="font-mono"
            value={seal}
            onChange={(event) => setSeal(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor={`${listId}-note`}>
            {t.handoffNote}
          </label>
          <Input
            id={`${listId}-note`}
            autoComplete="off"
            maxLength={300}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={broken} onCheckedChange={(checked) => setBroken(Boolean(checked))} />
        {t.sealBroken}
      </label>
      <div>
        <Button type="submit" disabled={busy || !ready}>
          {toFacility ? t.recordDrop : t.handOff}
        </Button>
      </div>
    </form>
  );
}
