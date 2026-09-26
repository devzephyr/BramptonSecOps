"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toastManager } from "@/components/ui/toast";
import {
  DeskApiError,
  documentDownloadUrl,
  fetchDocuments,
  uploadEvidence,
  type CaseDocument,
} from "@/lib/desk-client";
import { useI18n } from "@/lib/i18n";
import { CURRENCIES, DOC_TYPES, type DocTypeName } from "@/lib/policy";

const ALL = "all";

function shortHash(hash: string) {
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
}

function errorText(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

/** Quote every cell and defuse spreadsheet formulas (=, +, -, @) in user-supplied text. */
function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

async function saveDocument(doc: CaseDocument) {
  const res = await fetch(documentDownloadUrl(doc.id), { credentials: "include" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new DeskApiError(res.status, body?.error ?? "Download failed.");
  }
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = doc.label;
  link.click();
  URL.revokeObjectURL(url);
}

export function DocumentUpload({
  caseId,
  loadId,
  ledger = false,
}: {
  caseId?: string;
  loadId?: string;
  ledger?: boolean;
}) {
  const { lang, t } = useI18n();
  const [docs, setDocs] = useState<CaseDocument[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DocTypeName | typeof ALL>(ALL);
  const [docType, setDocType] = useState<DocTypeName>(ledger ? "invoice" : loadId ? "bill_of_lading" : "other");
  const [docNumber, setDocNumber] = useState("");
  const [otherType, setOtherType] = useState("");
  const needsName = docType === "other" && !otherType.trim();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>("CAD");

  const money = useCallback(
    (cents: number, code: string) =>
      new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", { style: "currency", currency: code }).format(cents / 100),
    [lang],
  );

  const refresh = useCallback(async () => {
    try {
      setDocs(await fetchDocuments({ caseId, loadId, docType: filter === ALL ? undefined : filter }));
    } catch (err) {
      setError(errorText(err, "Could not load documents."));
    }
  }, [caseId, filter, loadId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onFile(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const done = await uploadEvidence({
        file,
        label: file.name,
        caseId,
        loadId,
        docType,
        docNumber,
        otherType: docType === "other" ? otherType.trim() : undefined,
        amount,
        currency,
      });
      toastManager.add({ type: "success", title: t.toastDocSaved, description: `${file.name} · sha256 ${done.contentHash.slice(0, 12)}…` });
      setDocNumber("");
      setOtherType("");
      setAmount("");
      await refresh();
    } catch (err) {
      setError(errorText(err, "Upload failed."));
    } finally {
      setBusy(false);
    }
  }

  async function onDownload(doc: CaseDocument) {
    setError(null);
    try {
      await saveDocument(doc);
    } catch (err) {
      setError(errorText(err, "Download failed."));
    }
  }

  function typeLabel(doc: CaseDocument) {
    return doc.docType === "other" && doc.otherType ? doc.otherType : t.docTypes[doc.docType];
  }

  function linkedTo(doc: CaseDocument) {
    if (doc.loadRef) return `${t.load} ${doc.loadRef}`;
    if (doc.counterparty) return doc.counterparty;
    return t.orgRecord;
  }

  function exportCsv() {
    const header = [t.date, t.docType, t.docNumber, t.amount, t.currency, t.linkedTo, t.file, t.uploadedBy, "sha256"];
    const lines = docs.map((doc) =>
      [
        doc.createdAt.slice(0, 10),
        typeLabel(doc),
        doc.docNumber ?? "",
        doc.amountCents === null ? "" : (doc.amountCents / 100).toFixed(2),
        doc.currency ?? "",
        linkedTo(doc),
        doc.label,
        doc.uploadedBy ?? "",
        doc.contentHash,
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob([[header.map(csvCell).join(","), ...lines].join("\r\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `records-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const totals = new Map<string, number>();
  for (const doc of docs) {
    if (doc.amountCents !== null && doc.currency) {
      totals.set(doc.currency, (totals.get(doc.currency) ?? 0) + doc.amountCents);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{ledger ? t.records : t.documents}</CardTitle>
        <CardDescription>{ledger ? t.recordsHint : t.documentsHint}</CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-col gap-3">
        {error && (
          <Alert variant="error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_6rem]">
          <Select value={docType} onValueChange={(value) => setDocType(value as DocTypeName)}>
            <SelectTrigger aria-label={t.docType}>
              <SelectValue>{(value: DocTypeName) => t.docTypes[value]}</SelectValue>
            </SelectTrigger>
            <SelectPopup>
              {DOC_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t.docTypes[type]}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <Input
            aria-label={t.docNumber}
            placeholder={t.docNumberHint}
            value={docNumber}
            maxLength={80}
            onChange={(event) => setDocNumber(event.target.value)}
          />
          <Input
            aria-label={t.amount}
            placeholder={t.amount}
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <Select value={currency} onValueChange={(value) => setCurrency(String(value))}>
            <SelectTrigger aria-label={t.currency} className="min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {CURRENCIES.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
        {docType === "other" && (
          <Input
            aria-label={t.otherTypeLabel}
            placeholder={t.otherTypeHint}
            value={otherType}
            maxLength={60}
            onChange={(event) => setOtherType(event.target.value)}
          />
        )}
        <Input
          type="file"
          aria-label={t.documents}
          disabled={busy || needsName}
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        {busy && <p className="text-sm text-muted-foreground">{t.uploading}</p>}

        {ledger && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <Select value={filter} onValueChange={(value) => setFilter(value as DocTypeName | typeof ALL)}>
              <SelectTrigger aria-label={t.docType} className="w-auto min-w-44">
                <SelectValue>{(value: DocTypeName | typeof ALL) => (value === ALL ? t.allTypes : t.docTypes[value])}</SelectValue>
              </SelectTrigger>
              <SelectPopup>
                <SelectItem value={ALL}>{t.allTypes}</SelectItem>
                {DOC_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t.docTypes[type]}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
            {totals.size > 0 && (
              <span className="text-sm text-muted-foreground">
                {t.totals}: {[...totals].map(([code, cents]) => money(cents, code)).join(" · ")}
              </span>
            )}
            <Button size="sm" variant="outline" className="ml-auto" disabled={docs.length === 0} onClick={exportCsv}>
              {t.exportCsv}
            </Button>
          </div>
        )}

        {docs.length === 0 && ledger && <p className="text-sm text-muted-foreground">{t.noDocuments}</p>}
        {docs.length > 0 && (
          <ul className="flex flex-col divide-y">
            {docs.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <Badge variant="outline">{typeLabel(doc)}</Badge>
                {doc.docNumber && <span className="font-mono">{doc.docNumber}</span>}
                {doc.amountCents !== null && doc.currency && (
                  <span className="font-medium">{money(doc.amountCents, doc.currency)}</span>
                )}
                {ledger && <span className="text-muted-foreground">{linkedTo(doc)}</span>}
                <span className="min-w-0 truncate">{doc.label}</span>
                <span className="text-xs text-muted-foreground">
                  {doc.createdAt.slice(0, 10)} · {(doc.byteSize / 1024).toFixed(1)} KB
                  {doc.uploadedBy ? ` · ${doc.uploadedBy}` : ""}
                </span>
                <span className="font-mono text-xs text-muted-foreground" title={doc.contentHash}>
                  {shortHash(doc.contentHash)}
                </span>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => void onDownload(doc)}>
                  {t.download}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardPanel>
    </Card>
  );
}
