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
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CallLink } from "@/components/desk/call-link";
import { useI18n } from "@/lib/i18n";
import { PARTNERS, REQUESTS, SCENARIOS, deskFlags, type Partner } from "@/preview/data";
import { sha256Hex } from "@/preview/hash";
import { useDesk } from "@/preview/store";

export function SupplierDesk() {
  const desk = useDesk();
  const { lang, t } = useI18n();
  const selected = PARTNERS.find((p) => p.id === desk.draft.partnerId) ?? PARTNERS[0];
  const [query, setQuery] = useState(selected.company);
  const [loading, setLoading] = useState(false);
  const [filtered, setFiltered] = useState<Partner[]>(PARTNERS);
  const [noteHash, setNoteHash] = useState("");

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
    setQuery(selected.company);
  }, [selected.company, desk.draft.partnerId]);

  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => {
      const q = query.trim().toLowerCase();
      setFiltered(
        !q
          ? PARTNERS
          : PARTNERS.filter((p) =>
              `${p.company} ${p.domain} ${p.city}`.toLowerCase().includes(q),
            ),
      );
      setLoading(false);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [query]);

  const previewFlags = useMemo(
    () =>
      deskFlags(
        desk.draft.rawText,
        selected.domain,
        selected.onFile,
        { ...selected.onFile, ...desk.draft.requested },
      ),
    [desk.draft.rawText, desk.draft.requested, selected],
  );

  const canSubmit = desk.draft.rawText.trim().length >= 8;
  const request = REQUESTS.find((r) => r.id === desk.draft.requestType);

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
              onClick={() => desk.fillScenario(scenario.id)}
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
          <Select value={desk.draft.requestType} onValueChange={(value) => desk.setDraft({ requestType: String(value) })}>
            <SelectTrigger>
              <SelectValue>
                {(value) => REQUESTS.find((request) => request.id === value)?.[lang === "fr" ? "fr" : "en"] ?? t.type}
              </SelectValue>
            </SelectTrigger>
            <SelectPopup>
              {REQUESTS.map((request) => (
                <SelectItem key={request.id} value={request.id}>
                  {lang === "fr" ? request.fr : request.en}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t.company}</span>
            <Autocomplete
              items={PARTNERS}
              filteredItems={filtered}
              value={query}
              onValueChange={(v) => setQuery(v)}
              itemToStringValue={(item: Partner) => item.company}
              autoHighlight
              openOnInputClick
            >
              <AutocompleteInput
                showTrigger
                showClear
                aria-label={t.company}
                placeholder="Search counterparty by name, domain, city…"
              />
              <AutocompletePopup>
                <AutocompleteList>
                  {(item: Partner) => (
                    <AutocompleteItem
                      key={item.id}
                      value={item}
                      onClick={() => {
                        desk.setDraft({ partnerId: item.id });
                        setQuery(item.company);
                      }}
                    >
                      <span className="flex w-full items-baseline justify-between gap-3">
                        <span className="truncate font-medium">{item.company}</span>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {item.numberOnFile}
                        </span>
                      </span>
                    </AutocompleteItem>
                  )}
                </AutocompleteList>
                <AutocompleteEmpty>No counterparty matches “{query}”.</AutocompleteEmpty>
                <AutocompleteStatus>
                  {loading ? "Loading counterparties…" : `${filtered.length} on file`}
                </AutocompleteStatus>
              </AutocompletePopup>
            </Autocomplete>
            <span className="font-mono text-xs text-muted-foreground">
              {selected.domain} · <CallLink numberOnFile={selected.numberOnFile} />
            </span>
          </div>
          <Textarea
            className="min-h-44"
            aria-label={t.sealedNote}
            placeholder={`Describe the change for ${selected.company} in your own words. Do not paste email or links.`}
            value={desk.draft.rawText}
            onChange={(event) => desk.setDraft({ rawText: event.target.value })}
          />
          <div className="flex flex-wrap items-center gap-2" aria-live="polite">
            <Badge variant={noteHash ? "success" : "outline"}>
              {noteHash ? `sealed · sha256 ${noteHash.slice(0, 12)}…${noteHash.slice(-8)}` : "seal pending"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              The hash locks at send. Managers verify it before a passkey unlocks the note.
            </span>
          </div>
          <Alert variant="info">
            <AlertTitle>SECURE_THREAD_ONLY</AlertTitle>
            <AlertDescription>
              This thread never touches email. Confirm by calling the number on file:{" "}
              <CallLink numberOnFile={selected.numberOnFile} />.
            </AlertDescription>
          </Alert>
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
            <Button size="xl" disabled={!canSubmit} onClick={() => void desk.submitDraft()}>
              {t.sendToManager}
            </Button>
            <Badge variant="outline">draft</Badge>
            {request && <Badge variant={request.dual ? "warning" : "secondary"}>{request.id}</Badge>}
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
