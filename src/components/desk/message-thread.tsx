"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { CopyButton } from "@/components/desk/copy-button";
import {
  DeskApiError,
  fetchMessages,
  postMessage,
  type CaseMessage,
} from "@/lib/desk-client";
import { useI18n } from "@/lib/i18n";
import {
  decryptFromPeer,
  encryptForPeers,
  ensureSession,
  ensureSignalKeys,
  fingerprintFor,
  localIdentityPublicKey,
  peerKeyChanged,
  resetSignalKeys,
} from "@/lib/signal-client";
import { sha256Hex } from "@/preview/hash";

type Props = {
  caseId: string;
  userId: string;
};

type Decrypted = CaseMessage & { text: string | null; unlockError?: string };

export function MessageThread({ caseId, userId }: Props) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Decrypted[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fingerprints, setFingerprints] = useState<Record<string, string>>({});
  const [ownFingerprint, setOwnFingerprint] = useState<string | null>(null);

  async function heal(userId: string, peers: { userId: string; hasKeys: boolean; identityKey: string | null }[]) {
    const self = peers.find((peer) => peer.userId === userId);
    if (self && !self.hasKeys) {
      resetSignalKeys(userId);
      await ensureSignalKeys(userId);
    } else if (self?.identityKey) {
      const local = localIdentityPublicKey(userId);
      if (!local) {
        await ensureSignalKeys(userId);
      } else if (local !== self.identityKey) {
        resetSignalKeys(userId);
        await ensureSignalKeys(userId);
      }
    }
  }

  const decryptAll = useCallback(
    async (rows: CaseMessage[]) => {
      const out: Decrypted[] = [];
      for (const row of rows) {
        const mine = (row.envelopes as Record<string, { type: number; body: string }>)?.[userId];
        if (!mine) {
          out.push({ ...row, text: null });
          continue;
        }
        try {
          await ensureSession(userId, row.sender.id);
          const text = await decryptFromPeer(userId, row.sender.id, mine);
          out.push({ ...row, text });
        } catch (err) {
          out.push({
            ...row,
            text: null,
            unlockError: err instanceof Error ? err.message.slice(0, 140) : "Unknown error",
          });
        }
      }
      setMessages(out);
    },
    [userId],
  );

  const refresh = useCallback(async () => {
    try {
      await ensureSignalKeys(userId);
      const rows = await fetchMessages(caseId);
      await decryptAll(rows);
      const fps: Record<string, string> = {};
      const peers = await fetch("/api/signal/participants?caseId=" + encodeURIComponent(caseId), {
        credentials: "include",
      })
        .then((res) => (res.ok ? res.json() : null))
        .then(
          (body) =>
            (body?.participants ?? []) as {
              userId: string;
              identityKey: string | null;
              hasKeys: boolean;
            }[],
        )
        .catch(() => []);
      const self = peers.find((peer) => peer.userId === userId);
      await heal(userId, peers);
      const local = localIdentityPublicKey(userId);
      if (local) {
        try {
          setOwnFingerprint((await fingerprintFor(userId, userId, local)).slice(0, 24));
        } catch {
          setOwnFingerprint(null);
        }
      }
      for (const peer of peers) {
        if (peer.userId === userId || !peer.identityKey) continue;
        try {
          fps[peer.userId] = await fingerprintFor(userId, peer.userId, peer.identityKey);
        } catch {
          /* fingerprint optional */
        }
      }
      setFingerprints(fps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load messages.");
    }
  }, [caseId, userId, decryptAll]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function resetDevice() {
    if (!window.confirm(t.resetKeysConfirm)) return;
    resetSignalKeys(userId);
    setMessages([]);
    await refresh();
  }

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      await ensureSignalKeys(userId);
      const peers = await fetch("/api/signal/participants?caseId=" + encodeURIComponent(caseId), {
        credentials: "include",
      }).then((res) => res.json()) as {
        participants: { userId: string; hasKeys: boolean }[];
      };
      const ready = peers.participants.filter((peer) => peer.hasKeys).map((peer) => peer.userId);
      if (!ready.includes(userId)) ready.push(userId);
      const envelopes = await encryptForPeers(userId, ready, text);
      const bodyHash = await sha256Hex(text);
      await postMessage(caseId, envelopes, bodyHash);
      setDraft("");
      toastManager.add({ type: "success", title: t.toastSent, description: `sha256 ${bodyHash.slice(0, 12)}…` });
      await refresh();
    } catch (err) {
      if (err instanceof DeskApiError) setError(err.message);
      else setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.messages}</CardTitle>
        <CardDescription>{t.messagesHint}</CardDescription>
      </CardHeader>      <CardPanel className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {ownFingerprint && (
            <span className="font-mono text-[10px] text-muted-foreground" title={ownFingerprint}>
              {t.thisDevice}: {ownFingerprint}…
            </span>
          )}
          <Button size="sm" variant="ghost" onClick={() => void resetDevice()}>
            {t.resetKeys}
          </Button>
        </div>
        {error && (
          <Alert variant="error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {messages.length === 0 && <p className="text-sm text-muted-foreground">{t.noMessages}</p>}
        <div className="flex flex-col gap-2">
          {messages.map((row) => (
            <div
              key={row.id}
              className={`flex flex-col gap-1 rounded-lg border p-2 ${row.own ? "ml-8 bg-muted" : "mr-8"}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium">{row.sender.name}</span>
                <Badge variant="outline">{row.sender.role}</Badge>
                {peerKeyChanged(userId, row.sender.id) && <Badge variant="warning">{t.keyChanged}</Badge>}
                {fingerprints[row.sender.id] && (
                  <span className="flex items-center gap-1">
                    <span
                      className="font-mono text-[10px] text-muted-foreground"
                      title={`${t.safetyNumber}: ${fingerprints[row.sender.id]}`}
                    >
                      {t.safetyNumber}: {fingerprints[row.sender.id].slice(0, 12)}…
                    </span>
                    <CopyButton text={fingerprints[row.sender.id]} label={t.safetyNumber} />
                  </span>
                )}
              </div>
              {row.text === null ? (
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-muted-foreground">{t.lockedMessage}</p>
                  {row.unlockError && (
                    <p className="font-mono text-[10px] text-muted-foreground">{row.unlockError}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{row.text}</p>
              )}
              <span className="font-mono text-[10px] text-muted-foreground" title={row.bodyHash}>
                sha256 {row.bodyHash.slice(0, 12)}…
              </span>
            </div>
          ))}
        </div>
        <Textarea
          aria-label={t.messages}
          placeholder={t.messagePlaceholder}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div>
          <Button size="sm" disabled={busy || !draft.trim()} onClick={() => void send()}>
            {busy ? t.sending : t.send}
          </Button>
        </div>
      </CardPanel>
    </Card>
  );
}
