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
import { roleTitle, useI18n } from "@/lib/i18n";
import {
  cachedPlaintext,
  cachePlaintext,
  decryptFromPeer,
  encryptForPeers,
  ensureSignalKeys,
  envelopeId,
  fingerprintFor,
  getDeviceId,
  hasSession,
  localIdentityPublicKey,
  peerKeyChanged,
  resetSignalKeys,
} from "@/lib/signal-client";
import { updatedAgo } from "@/lib/tracking";
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
  const [people, setPeople] = useState<Participant[]>([]);

  const heal = useCallback(async (peers: Participant[]) => {
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
  }, [userId]);

  const decryptAll = useCallback(
    async (rows: CaseMessage[], peers: Participant[]) => {
      const deviceId = getDeviceId();
      const out: Decrypted[] = [];
      for (const row of rows) {
        const cached = cachedPlaintext(userId, row.id);
        if (cached !== null) {
          out.push({ ...row, text: cached });
          continue;
        }
        const mine = (row.envelopes as Record<string, { type: number; body: string; from?: number }>)?.[
          envelopeId(userId, deviceId)
        ];
        if (!mine) {
          out.push({ ...row, text: null });
          continue;
        }
        // Newer messages say which device sent them; older ones fall back to trying each device.
        const senderDevices =
          mine.from !== undefined
            ? [mine.from]
            : (peers.find((peer) => peer.userId === row.sender.id)?.devices.map((device) => device.deviceId) ?? []);
        let text: string | null = null;
        let unlockError: string | undefined;
        for (const senderDevice of senderDevices) {
          try {
            // A first message (type 3) carries what's needed to start the session, so it must not
            // fetch the sender's keys: that spends one of their one-time keys on every read. Later
            // messages only decrypt on a device we already have a session with.
            if (mine.type !== 3 && !(await hasSession(userId, row.sender.id, senderDevice))) continue;
            text = await decryptFromPeer(userId, row.sender.id, senderDevice, mine);
            cachePlaintext(userId, row.id, text);
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
      setPeople(peers);
      const fps: Record<string, string> = {};
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
            continue;
          }
        }
      }
      setFingerprints(fps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load messages.");
    }
  }, [caseId, userId, decryptAll, heal]);

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
      const sent = await postMessage(caseId, envelopes, bodyHash);
      cachePlaintext(userId, sent.id, text);
      setDraft("");
      toastManager.add({ type: "success", title: t.toastSent });
      await refresh();
    } catch (err) {
      if (err instanceof DeskApiError) setError(err.message);
      else setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setBusy(false);
    }
  }

  const waiting = people.filter((peer) => peer.userId !== userId && peer.devices.length === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.messages}</CardTitle>
        <CardDescription>{t.messagesHint}</CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-col gap-3">

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
                <Badge variant="outline">{roleTitle(row.sender.role, t)}</Badge>
                {peerKeyChanged(userId, row.sender.id) && <Badge variant="warning">{t.keyChanged}</Badge>}
              </div>
              {row.text === null ? (
                <p className="text-sm text-muted-foreground">{t.lockedMessage}</p>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{row.text}</p>
              )}
              <span className="text-[11px] text-muted-foreground">{updatedAgo(row.createdAt)}</span>
            </div>
          ))}
        </div>
        <Textarea
          aria-label={t.messages}
          placeholder={t.messagePlaceholder}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        {waiting.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {t.notDelivered}: {waiting.map((peer) => peer.name).join(", ")}
          </p>
        )}
        <div>
          <Button size="sm" disabled={busy || !draft.trim()} onClick={() => void send()}>
            {busy ? t.sending : t.send}
          </Button>
        </div>
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">{t.verifyPeople}</summary>
          <p className="mt-2">{t.verifyPeopleHint}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {people
              .filter((peer) => peer.userId !== userId)
              .flatMap((peer) =>
                peer.devices.map((device) => {
                  const number = fingerprints[`${peer.userId}.${device.deviceId}`];
                  if (!number) return null;
                  return (
                    <li key={`${peer.userId}.${device.deviceId}`} className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{peer.name}</span>
                      <span className="font-mono tracking-wide">{number.match(/.{1,5}/g)?.join(" ")}</span>
                      <CopyButton text={number} label={t.safetyNumber} />
                    </li>
                  );
                }),
              )}
          </ul>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => void resetDevice()}>
            {t.resetKeys}
          </Button>
        </details>
      </CardPanel>
    </Card>
  );
}
