"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toastManager } from "@/components/ui/toast";
import { createLoad, fetchDirectory, fetchTeam, type Contact, type NewLoad, type TeamMember } from "@/lib/desk-client";
import { useI18n } from "@/lib/i18n";
import { useDesk } from "@/preview/store";

type Fields = Required<Omit<NewLoad, "driverUserId">>;

const BLANK: Fields = {
  loadRef: "",
  commodity: "",
  origin: "",
  destination: "",
  carrierName: "",
  plate: "",
  trailer: "",
  scheduledDock: "",
  sealNumber: "",
  reeferSetpoint: "",
  eta: "",
};

const NO_DRIVER = "none";

export function LoadForm({ onCreated }: { onCreated?: () => void }) {
  const desk = useDesk();
  const { t } = useI18n();
  const [form, setForm] = useState(BLANK);
  const [driver, setDriver] = useState(NO_DRIVER);
  const [drivers, setDrivers] = useState<TeamMember[]>([]);
  const [directory, setDirectory] = useState<Contact[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchTeam()
      .then((team) => setDrivers(team.filter((member) => member.role === "driver")))
      .catch(() => setDrivers([]));
    void fetchDirectory()
      .then(setDirectory)
      .catch(() => setDirectory([]));
  }, []);

  const suggestions = useMemo(() => {
    const pick = (values: (string | null | undefined)[]) => [
      ...new Set(values.map((value) => (value ?? "").trim()).filter(Boolean)),
    ];
    const loads = desk.loads;
    return {
      commodity: pick(loads.map((load) => load.commodity)),
      origin: pick([
        ...loads.map((load) => load.origin),
        ...directory.map((contact) => contact.city),
        ...directory.map((contact) => contact.company),
      ]),
      destination: pick([
        ...loads.map((load) => load.destination),
        ...directory.map((contact) => contact.city),
        ...directory.map((contact) => contact.company),
      ]),
      carrierName: pick([
        ...loads.map((load) => load.carrier),
        ...directory.map((contact) => contact.onFile.carrier),
      ]),
      scheduledDock: pick([
        ...loads.map((load) => load.dock),
        ...directory.map((contact) => contact.onFile.dock),
      ]),
      setpoint: pick(loads.map((load) => load.setpoint)),
    } as Record<string, string[]>;
  }, [desk.loads, directory]);

  function field(key: keyof Fields, label: string, extra?: { required?: boolean; type?: string }) {
    const id = `load-${key}`;
    const options = suggestions[key] ?? [];
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor={id}>
          {label}
        </label>
        <Input
          id={id}
          type={extra?.type}
          autoComplete="off"
          required={extra?.required}
          value={form[key]}
          list={options.length > 0 ? `${id}-suggestions` : undefined}
          onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
        />
        {options.length > 0 && (
          <datalist id={`${id}-suggestions`}>
            {options.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        )}
      </div>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await createLoad({
        ...form,
        eta: form.eta ? new Date(form.eta).toISOString() : undefined,
        driverUserId: driver === NO_DRIVER ? undefined : driver,
      });
      toastManager.add({ type: "success", title: t.loadCreated, description: form.loadRef });
      setForm(BLANK);
      setDriver(NO_DRIVER);
      await desk.refreshRemote();
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.newLoad}</CardTitle>
        <CardDescription>{t.newLoadHint}</CardDescription>
      </CardHeader>
      <CardPanel>
        <form className="flex flex-col gap-3" onSubmit={(event) => void submit(event)}>
          {error && (
            <Alert variant="error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {field("loadRef", t.loadRef, { required: true })}
            {field("commodity", t.goods, { required: true })}
            {field("origin", t.origin, { required: true })}
            {field("destination", t.destination, { required: true })}
            {field("carrierName", t.carrier, { required: true })}
            {field("scheduledDock", t.dock)}
            {field("plate", t.plate, { required: true })}
            {field("trailer", t.trailer, { required: true })}
            {field("sealNumber", t.seal)}
            {field("reeferSetpoint", t.setpoint)}
            {field("eta", t.eta, { type: "datetime-local" })}
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
              {drivers.length === 0 && <span className="text-xs text-muted-foreground">{t.noDrivers}</span>}
            </div>
          </div>
          <div>
            <Button type="submit" disabled={busy}>
              {t.createLoad}
            </Button>
          </div>
        </form>
      </CardPanel>
    </Card>
  );
}
