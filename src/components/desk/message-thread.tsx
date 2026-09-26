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
  envelopeId,
  fingerprintFor,
  getDeviceId,
  localIdentityPublicKey,
  peerKeyChanged,
  resetSignalKeys,
  type PeerDevice,
} from "@/lib/signal-client";
import { sha256Hex } from "@/preview/hash";

type Props = {
  caseId: string;
  userId: string;
};

type Decrypted = CaseMessage & { text: string | null; unlockError?: string };

type Participant = {
  userId: string;
  name: string;
  role: string;
  devices: { deviceId: number; hasKeys: boolean; identityKey: string }[];
};

async function fetchPeers(caseId: string): Promise<Participant[]> {
  const peers = await fetch("/api/signal/participants?caseId=" + encodeURIComponent(caseId), {
    credentials: "include",
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((body) => (body?.participants ?? []) as Participant[])
    .catch(() => []);
  return peers;
}

export function MessageThread({ caseId, userId }: Props) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Decrypted[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fingerprints, setFingerprints] = useState<Record<string, string>>({});
  const [ownFingerprint, setOwnFingerprint] = useState<string | null>(null);

  async function heal(peers: Participant[]) {
    const self = peers.find((peer) => peer.userId === userId);
    const mine = self?.devices.find((row) => row.deviceId === getDeviceId());
    if (!mine) {
      resetSignalKeys(userId);
      await ensureSignalKeys(userId);
      return;
    }
    const local = localIdentityPublicKey(userId);
    if (!local) {
      await ensureSignalKeys(userId);
    } else if (local !== mine.identityKey) {
      resetSignalKeys(userId);
      await ensureSignalKeys(userId);
    }
  }

  const decryptAll = useCallback(
    async (rows: CaseMessage[], peers: Participant[]) => {
      const deviceId = getDeviceId();
      const out: Decrypted[] = [];
      for (const row of rows) {
        const mine = (row.envelopes as Record<string, { type: number; body: string }>)?.[
          envelopeId(userId, deviceId)
        ];
        if (!mine) {
          out.push({ ...row, text: null });
          continue;
        }
        const senderDevices =
          peers.find((peer) => peer.userId === row.sender.id)?.devices.map((row) => row.deviceId) ??
          [];
        let text: string | null = null;
        let unlockError: string | undefined;
        for (const senderDevice of senderDevices) {
          try {
            await ensureSession(userId, row.sender.id, senderDevice);
            text = await decryptFromPeer(userId, row.sender.id, senderDevice, mine);
            break;
          } catch (err) {
            unlockError = err instanceof Error ? err.message.slice(0, 140) : "Unknown error";
          }
        }
        out.push({ ...row, text, unlockError: text === null ? (unlockError ?? "No sender device worked") : undefined });
      }
      setMessages(out);
    },
    [userId],
  );

  const refresh = useCallback(async () => {
    try {
      await ensureSignalKeys(userId);
      const [rows, peers] = await Promise.all([fetchMessages(caseId), fetchPeers(caseId)]);
      await heal(peers);
      await decryptAll(rows, peers);
      const fps: Record<string, string> = {};
      const local = localIdentityPublicKey(userId);
      if (local) {
        try {
          setOwnFingerprint((await fingerprintFor(userId, userId, local)).slice(0, 24));
        } catch {
          setOwnFingerprint(null);
        }
      }
      for (const peer of peers) {
        if (peer.userId === userId) continue;
        for (const device of peer.devices) {
          try {
            fps[`${peer.userId}.${device.deviceId}`] = await fingerprintFor(
              userId,
              `${peer.userId}.${device.deviceId}`,
              device.identityKey,
            );
          } catch {
            /* fingerprint optional */
          }
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
      const peers = await fetchPeers(caseId);
      await heal(peers);
      const targets = peers.flatMap((peer) =>
        peer.devices.map((device) => ({ userId: peer.userId, deviceId: device.deviceId })),
      );
      const mine = { userId, deviceId: getDeviceId() };
      if (!targets.some((row) => row.userId === mine.userId && row.deviceId === mine.deviceId)) {
        targets.push(mine);
      }
      if (targets.length === 0) {
        setError(t.noDevices);
        return;
      }
      const envelopes = await encryptForPeers(userId, targets, text);
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
                {Object.entries(fingerprints)
                  .filter(([key]) => key.startsWith(`${row.sender.id}.`))
                  .map(([key, value]) => (
                    <span key={key} className="flex items-center gap-1">
                      <span
                        className="font-mono text-[10px] text-muted-foreground"
                        title={`${t.safetyNumber}: ${value}`}
                      >
                        {t.safetyNumber}: {value.slice(0, 12)}…
                      </span>
                      <CopyButton text={value} label={t.safetyNumber} />
                    </span>
                  ))}
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
