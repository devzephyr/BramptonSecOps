"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";
import {
  DeskApiError,
  fetchDocuments,
  uploadEvidence,
  type CaseDocument,
} from "@/lib/desk-client";
import { useI18n } from "@/lib/i18n";

function shortHash(hash: string) {
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
}

export function DocumentUpload({ caseId, loadId }: { caseId?: string; loadId?: string }) {
  const { t } = useI18n();
  const [docs, setDocs] = useState<CaseDocument[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!caseId) return;
    setDocs(await fetchDocuments(caseId));
  }, [caseId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onFile(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const done = await uploadEvidence({ file, label: file.name, caseId, loadId });
      toastManager.add({ type: "success", title: t.toastDocSaved, description: `${file.name} · sha256 ${done.contentHash.slice(0, 12)}…` });
      await refresh();
    } catch (err) {
      if (err instanceof DeskApiError) setError(err.message);
      else setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.documents}</CardTitle>
        <CardDescription>{t.documentsHint}</CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-col gap-3">
        {error && (
          <Alert variant="error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Input
          type="file"
          aria-label={t.documents}
          disabled={busy}
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
        {busy && <p className="text-sm text-muted-foreground">{t.uploading}</p>}
        {docs.length > 0 && (
          <ul className="flex flex-col gap-2">
            {docs.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{doc.label}</span>
                <span className="text-xs text-muted-foreground">
                  {(doc.byteSize / 1024).toFixed(1)} KB
                </span>
                <span className="font-mono text-xs text-muted-foreground" title={doc.contentHash}>
                  {shortHash(doc.contentHash)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardPanel>
    </Card>
  );
}
