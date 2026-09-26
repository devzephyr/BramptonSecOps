"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toastManager } from "@/components/ui/toast";
import { fetchTeam, updateLoad, type LoadPatch, type TeamMember } from "@/lib/desk-client";
import { useI18n } from "@/lib/i18n";
import type { Load } from "@/preview/data";
import { useDesk } from "@/preview/store";

const NO_DRIVER = "none";

function toLocalInput(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function initialFields(load: Load) {
  return {
    carrierName: load.carrier,
    plate: load.plate,
    trailer: load.trailer,
    commodity: load.commodity,
    origin: load.origin,
    destination: load.destination,
    scheduledDock: load.scheduledDock,
    sealNumber: load.seal,
    reeferSetpoint: load.setpoint,
    eta: toLocalInput(load.etaIso),
  };
}

type Fields = ReturnType<typeof initialFields>;

export function LoadEdit({ load, onDone }: { load: Load; onDone: () => void }) {
  const desk = useDesk();
  const { t } = useI18n();
  const [initial] = useState(() => initialFields(load));
  const [form, setForm] = useState<Fields>(initial);
  const [driver, setDriver] = useState(load.driverId || NO_DRIVER);
  const [handoffNote, setHandoffNote] = useState("");
  const [drivers, setDrivers] = useState<TeamMember[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const moving = load.status !== "scheduled";

  useEffect(() => {
    void fetchTeam().then((team) => setDrivers(team.filter((member) => member.role === "driver")));
  }, []);

  function field(key: keyof Fields, label: string, opts?: { type?: string; locked?: boolean }) {
    const id = `edit-${key}`;
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor={id}>
          {label}
        </label>
        <Input
          id={id}
          type={opts?.type}
          autoComplete="off"
          disabled={opts?.locked}
          value={form[key]}
          onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
        />
      </div>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const patch: LoadPatch = {};
    for (const key of Object.keys(form) as (keyof Fields)[]) {
      if (form[key] === initial[key]) continue;
      if (key === "eta") patch.eta = form.eta ? new Date(form.eta).toISOString() : "";
      else patch[key] = form[key];
    }
    const nextDriver = driver === NO_DRIVER ? null : driver;
    if (nextDriver !== (load.driverId || null)) patch.driverUserId = nextDriver;
    if (Object.keys(patch).length === 0) {
      onDone();
      return;
    }
    if (handoffNote.trim()) patch.handoffNote = handoffNote.trim();
    setBusy(true);
    setError(null);
    try {
      await updateLoad(load.id, patch);
      toastManager.add({ type: "success", title: t.loadUpdated, description: load.loadRef });
      await desk.refreshRemote();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => void submit(event)}>
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t.driver}</span>
          <Select value={driver} onValueChange={(value) => setDriver(String(value))}>
            <SelectTrigger aria-label={t.driver}>
              <SelectValue>
                {(value) => drivers.find((member) => member.id === value)?.name ?? t.unassigned}
              </SelectValue>
            </SelectTrigger>
            <SelectPopup>
              <SelectItem value={NO_DRIVER}>{t.unassigned}</SelectItem>
              {drivers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="edit-handoff">
            {t.handoffNote}
          </label>
          <Input
            id="edit-handoff"
            autoComplete="off"
            maxLength={200}
            placeholder={t.handoffNoteHint}
            value={handoffNote}
            onChange={(event) => setHandoffNote(event.target.value)}
          />
        </div>
        {field("carrierName", t.carrier)}
        {field("eta", t.eta, { type: "datetime-local" })}
        {field("plate", t.plate)}
        {field("trailer", t.trailer)}
        {field("commodity", t.goods)}
        {field("reeferSetpoint", t.setpoint)}
        {field("origin", t.origin)}
        {field("destination", t.destination, { locked: moving })}
        {field("scheduledDock", t.dock, { locked: moving })}
        {field("sealNumber", t.seal, { locked: moving })}
      </div>
      {moving && <p className="text-xs text-muted-foreground">{t.lockedMoving}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {t.saveChanges}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
