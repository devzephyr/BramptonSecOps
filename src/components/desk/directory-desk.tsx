"use client";

import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toastManager } from "@/components/ui/toast";
import { CallLink } from "@/components/desk/call-link";
import { addContact, type NewContact } from "@/lib/desk-client";
import { useI18n } from "@/lib/i18n";
import { useDesk } from "@/preview/store";

const BLANK: Required<NewContact> = {
  company: "",
  city: "",
  domain: "",
  numberOnFile: "",
  name: "",
  institution: "",
  transit: "",
  account: "",
  dock: "",
  carrier: "",
};

export function DirectoryDesk() {
  const desk = useDesk();
  const { t } = useI18n();
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function field(key: keyof typeof BLANK, label: string, extra?: { inputMode?: "numeric" | "tel"; required?: boolean }) {
    const id = `dir-${key}`;
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor={id}>
          {label}
        </label>
        <Input
          id={id}
          autoComplete="off"
          required={extra?.required}
          inputMode={extra?.inputMode}
          value={form[key]}
          onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
        />
      </div>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await addContact(form);
      setForm(BLANK);
      await desk.refreshDirectory();
      toastManager.add({ type: "success", title: t.contactAdded, description: created.company });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.directory}</CardTitle>
          <CardDescription>{t.directoryHint}</CardDescription>
        </CardHeader>
        <CardPanel>
          {desk.contacts.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t.emptyDirectory}</EmptyTitle>
                <EmptyDescription>{t.emptyDirectoryManager}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table variant="card">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.company}</TableHead>
                    <TableHead>{t.city}</TableHead>
                    <TableHead>{t.domain}</TableHead>
                    <TableHead>{t.numberOnFile}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {desk.contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>{contact.company}</TableCell>
                      <TableCell>{contact.city}</TableCell>
                      <TableCell>{contact.domain}</TableCell>
                      <TableCell>
                        <CallLink numberOnFile={contact.numberOnFile} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardPanel>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.addContact}</CardTitle>
          <CardDescription>{t.addContactHint}</CardDescription>
        </CardHeader>
        <CardPanel>
          <form className="flex flex-col gap-3" onSubmit={(event) => void submit(event)}>
            {error && (
              <Alert variant="error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {field("company", t.company, { required: true })}
              {field("name", t.contactName)}
              {field("domain", t.domain, { required: true })}
              {field("numberOnFile", t.numberOnFile, { required: true, inputMode: "tel" })}
              {field("city", t.city)}
              {field("dock", t.dock)}
              {field("carrier", t.carrier)}
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">{t.bankOnFileOptional}</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {field("institution", t.institution, { inputMode: "numeric" })}
                {field("transit", t.transit, { inputMode: "numeric" })}
                {field("account", t.account, { inputMode: "numeric" })}
              </div>
            </fieldset>
            <div>
              <Button type="submit" size="sm" disabled={busy}>
                {t.addContact}
              </Button>
            </div>
          </form>
        </CardPanel>
      </Card>
    </div>
  );
}
