"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Autocomplete,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
  AutocompleteStatus,
} from "@/components/ui/autocomplete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CallLink } from "@/components/desk/call-link";
import type { Contact } from "@/lib/desk-client";
import { useI18n } from "@/lib/i18n";
import { REQUESTS, SCENARIOS, deskFlags } from "@/preview/data";
import { sha256Hex } from "@/preview/hash";
import { useDesk } from "@/preview/store";

export function SupplierDesk() {
  const desk = useDesk();
  const { lang, t } = useI18n();
  const selected = desk.contacts.find((contact) => contact.id === desk.draft.contactId) ?? null;
  const [query, setQuery] = useState("");
  const [noteHash, setNoteHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    const text = desk.draft.rawText.trim();
    if (text.length < 8) {
      setNoteHash("");
      return;
    }
    let live = true;
    void sha256Hex(text).then((hash) => {
      if (live) setNoteHash(hash);
    });
    return () => {
      live = false;
    };
  }, [desk.draft.rawText]);

  useEffect(() => {
    setQuery(selected?.company ?? "");
  }, [selected?.company]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q === selected?.company.toLowerCase()) return desk.contacts;
    return desk.contacts.filter((contact) =>
      `${contact.company} ${contact.domain} ${contact.city}`.toLowerCase().includes(q),
    );
  }, [desk.contacts, query, selected?.company]);

  const previewFlags = useMemo(
    () =>
      selected
        ? deskFlags(desk.draft.rawText, selected.domain, selected.onFile, {
            ...selected.onFile,
            ...desk.draft.requested,
          })
        : [],
    [desk.draft.rawText, desk.draft.requested, selected],
  );

  const canSubmit = Boolean(selected) && desk.draft.rawText.trim().length >= 8 && !submitting;
  const request = REQUESTS.find((r) => r.id === desk.draft.requestType);

  async function submit() {
    setSubmitting(true);
    setSentTo(null);
    const created = await desk.submitDraft();
    setSubmitting(false);
    if (created) setSentTo(created.counterparty);
  }

  if (desk.ready && desk.contacts.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t.emptyDirectory}</EmptyTitle>
          <EmptyDescription>{t.emptyDirectorySupplier}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{t.scenarios}</CardTitle>
          <CardDescription>{t.scenariosHint}</CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-2">
          {SCENARIOS.map((scenario) => (
            <Button
              key={scenario.id}
              variant="outline"
              className="justify-start"
              onClick={() => {
                setSentTo(null);
                desk.fillScenario(scenario.id);
              }}
            >
              {lang === "fr" && scenario.frTitle ? scenario.frTitle : scenario.title}
            </Button>
          ))}
        </CardPanel>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.sealedNote}</CardTitle>
          <CardDescription>{t.sealedNoteHint}</CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-3">
          {sentTo && (
            <Alert variant="success">
              <AlertTitle>{t.submitted}</AlertTitle>
              <AlertDescription>
                {sentTo} · {t.submittedBody}
              </AlertDescription>
            </Alert>
          )}
          <Select value={desk.draft.requestType} onValueChange={(value) => desk.setDraft({ requestType: String(value) })}>
            <SelectTrigger aria-label={t.type}>
              <SelectValue>
                {(value) => REQUESTS.find((item) => item.id === value)?.[lang === "fr" ? "fr" : "en"] ?? t.type}
              </SelectValue>
            </SelectTrigger>
            <SelectPopup>
              {REQUESTS.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {lang === "fr" ? item.fr : item.en}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t.company}</span>
            <Autocomplete
              items={desk.contacts}
              filteredItems={filtered}
              value={query}
              onValueChange={(v) => setQuery(v)}
              itemToStringValue={(item: Contact) => item.company}
              autoHighlight
              openOnInputClick
            >
              <AutocompleteInput showTrigger showClear aria-label={t.company} placeholder={t.counterpartySearch} />
              <AutocompletePopup>
                <AutocompleteList>
                  {(item: Contact) => (
                    <AutocompleteItem
                      key={item.id}
                      value={item}
                      onClick={() => {
                        desk.setDraft({ contactId: item.id });
                        setQuery(item.company);
                      }}
                    >
                      <span className="flex w-full items-baseline justify-between gap-3">
                        <span className="truncate font-medium">{item.company}</span>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">{item.numberOnFile}</span>
                      </span>
                    </AutocompleteItem>
                  )}
                </AutocompleteList>
                <AutocompleteEmpty>{t.noCounterparty}</AutocompleteEmpty>
                <AutocompleteStatus>
                  {filtered.length} {t.onFileCount}
                </AutocompleteStatus>
              </AutocompletePopup>
            </Autocomplete>
            <span className="font-mono text-xs text-muted-foreground">
              {selected ? (
                <>
                  {selected.domain} · <CallLink numberOnFile={selected.numberOnFile} />
                </>
              ) : (
                t.pickCounterparty
              )}
            </span>
          </div>
          <Textarea
            className="min-h-44"
            aria-label={t.sealedNote}
            placeholder={t.noteInOwnWords}
            maxLength={5000}
            value={desk.draft.rawText}
            onChange={(event) => desk.setDraft({ rawText: event.target.value })}
          />
          <div className="flex flex-wrap items-center gap-2" aria-live="polite">
            <Badge variant={noteHash ? "success" : "outline"}>
              {noteHash ? `${t.sealed} · sha256 ${noteHash.slice(0, 12)}…${noteHash.slice(-8)}` : t.sealPending}
            </Badge>
            <span className="text-xs text-muted-foreground">{t.sealHint}</span>
          </div>
          {selected && (
            <Alert variant="info">
              <AlertTitle>{t.phoneOnlyTitle}</AlertTitle>
              <AlertDescription>
                {t.phoneOnlyBody} <CallLink numberOnFile={selected.numberOnFile} />
              </AlertDescription>
            </Alert>
          )}
          {previewFlags.length > 0 && (
            <div className="flex flex-col gap-2" role="group" aria-label={t.flags}>
              {previewFlags.map((flag) => (
                <Alert key={flag} variant="warning">
                  <AlertDescription>{flag}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xl" disabled={!canSubmit} onClick={() => void submit()}>
              {submitting ? t.sending : t.sendToManager}
            </Button>
            {request && (
              <Badge variant={request.dual ? "warning" : "secondary"}>{lang === "fr" ? request.fr : request.en}</Badge>
            )}
          </div>
          {desk.submitError && (
            <Alert variant="error">
              <AlertDescription>{desk.submitError}</AlertDescription>
            </Alert>
          )}
        </CardPanel>
      </Card>
    </div>
  );
}
