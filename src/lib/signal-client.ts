"use client";

import {
  FingerprintGenerator,
  KeyHelper,
  SessionBuilder,
  SessionCipher,
  SignalProtocolAddress,
  type DeviceType,
  type KeyPairType,
  type StorageType,
} from "libsignal-protocol-typescript";

const DEVICE_ID = 1;
const ONETIME_COUNT = 20;

function b64encode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let raw = "";
  for (let i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i]);
  return btoa(raw);
}

function b64decode(b64: string): ArrayBuffer {
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

function lsKey(userId: string, key: string) {
  return `signal:${userId}:${key}`;
}

function readJson(userId: string, key: string): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(lsKey(userId, key)) ?? "{}") as Record<
      string,
      string
    >;
  } catch {
    return {};
  }
}

function writeJson(userId: string, key: string, value: Record<string, string>) {
  window.localStorage.setItem(lsKey(userId, key), JSON.stringify(value));
}

class BrowserSignalStore implements StorageType {
  constructor(private userId: string) {}

  async getIdentityKeyPair(): Promise<KeyPairType | undefined> {
    const raw = window.localStorage.getItem(lsKey(this.userId, "identity"));
    if (!raw) return undefined;
    const row = JSON.parse(raw) as { pub: string; priv: string };
    return { pubKey: b64decode(row.pub), privKey: b64decode(row.priv) };
  }

  async getLocalRegistrationId(): Promise<number | undefined> {
    const raw = window.localStorage.getItem(lsKey(this.userId, "registrationId"));
    return raw ? Number(raw) : undefined;
  }

  async isTrustedIdentity(): Promise<boolean> {
    return true;
  }

  async saveIdentity(encodedAddress: string, publicKey: ArrayBuffer): Promise<boolean> {
    const known = readJson(this.userId, "identities");
    const name = encodedAddress.split(".")[0];
    const next = b64encode(publicKey);
    const changed = known[name] !== undefined && known[name] !== next;
    known[name] = next;
    writeJson(this.userId, "identities", known);
    if (changed) {
      const flags = readJson(this.userId, "changed");
      flags[name] = "1";
      writeJson(this.userId, "changed", flags);
    }
    return false;
  }

  async loadPreKey(key: string | number): Promise<KeyPairType | undefined> {
    const row = readJson(this.userId, "prekeys")[String(key)];
    if (!row) return undefined;
    const parsed = JSON.parse(row) as { pub: string; priv: string };
    return { pubKey: b64decode(parsed.pub), privKey: b64decode(parsed.priv) };
  }

  async storePreKey(keyId: number | string, keyPair: KeyPairType): Promise<void> {
    const all = readJson(this.userId, "prekeys");
    all[String(keyId)] = JSON.stringify({
      pub: b64encode(keyPair.pubKey as ArrayBuffer),
      priv: b64encode(keyPair.privKey as ArrayBuffer),
    });
    writeJson(this.userId, "prekeys", all);
  }

  async removePreKey(keyId: number | string): Promise<void> {
    const all = readJson(this.userId, "prekeys");
    delete all[String(keyId)];
    writeJson(this.userId, "prekeys", all);
  }

  async storeSession(encodedAddress: string, record: string): Promise<void> {
    const all = readJson(this.userId, "sessions");
    all[encodedAddress] = record;
    writeJson(this.userId, "sessions", all);
  }

  async loadSession(encodedAddress: string): Promise<string | undefined> {
    return readJson(this.userId, "sessions")[encodedAddress];
  }

  async loadSignedPreKey(key: number | string): Promise<KeyPairType | undefined> {
    const row = readJson(this.userId, "signed")[String(key)];
    if (!row) return undefined;
    const parsed = JSON.parse(row) as { pub: string; priv: string };
    return { pubKey: b64decode(parsed.pub), privKey: b64decode(parsed.priv) };
  }

  async storeSignedPreKey(keyId: number | string, keyPair: KeyPairType): Promise<void> {
    const all = readJson(this.userId, "signed");
    all[String(keyId)] = JSON.stringify({
      pub: b64encode(keyPair.pubKey as ArrayBuffer),
      priv: b64encode(keyPair.privKey as ArrayBuffer),
    });
    writeJson(this.userId, "signed", all);
  }

  async removeSignedPreKey(keyId: number | string): Promise<void> {
    const all = readJson(this.userId, "signed");
    delete all[String(keyId)];
    writeJson(this.userId, "signed", all);
  }
}

function storeFor(userId: string) {
  return new BrowserSignalStore(userId);
}

function addressOf(peerUserId: string) {
  return new SignalProtocolAddress(peerUserId, DEVICE_ID);
}

export function hasSignalIdentity(userId: string): boolean {
  return window.localStorage.getItem(lsKey(userId, "identity")) !== null;
}

export function resetSignalKeys(userId: string): void {
  for (const key of ["identity", "registrationId", "prekeys", "signed", "sessions", "identities", "changed"]) {
    window.localStorage.removeItem(lsKey(userId, key));
  }
  inFlight.delete(userId);
}

const inFlight = new Map<string, Promise<void>>();

export function ensureSignalKeys(userId: string): Promise<void> {
  const running = inFlight.get(userId);
  if (running) return running;
  const task = publishKeys(userId).finally(() => {
    if (inFlight.get(userId) === task) inFlight.delete(userId);
  });
  inFlight.set(userId, task);
  return task;
}

async function publishKeys(userId: string): Promise<void> {
  if (hasSignalIdentity(userId)) return;
  const identity = await KeyHelper.generateIdentityKeyPair();
  const registrationId = KeyHelper.generateRegistrationId();
  const signed = await KeyHelper.generateSignedPreKey(identity, 1);
  const store = storeFor(userId);
  await store.storeSignedPreKey(signed.keyId, signed.keyPair);

  const oneTime: { keyId: number; publicKey: string }[] = [];
  for (let i = 1; i <= ONETIME_COUNT; i++) {
    const pre = await KeyHelper.generatePreKey(i);
    await store.storePreKey(pre.keyId, pre.keyPair);
    oneTime.push({
      keyId: pre.keyId,
      publicKey: b64encode(pre.keyPair.pubKey as ArrayBuffer),
    });
  }
  window.localStorage.setItem(
    lsKey(userId, "identity"),
    JSON.stringify({
      pub: b64encode(identity.pubKey as ArrayBuffer),
      priv: b64encode(identity.privKey as ArrayBuffer),
    }),
  );
  window.localStorage.setItem(lsKey(userId, "registrationId"), String(registrationId));

  const res = await fetch("/api/signal/keys", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      registrationId,
      identityKey: b64encode(identity.pubKey as ArrayBuffer),
      signedPreKey: {
        keyId: signed.keyId,
        publicKey: b64encode(signed.keyPair.pubKey as ArrayBuffer),
        signature: b64encode(signed.signature as ArrayBuffer),
      },
      oneTimePreKeys: oneTime,
    }),
  });
  if (!res.ok) throw new Error("Could not publish encryption keys.");
}

type Bundle = {
  userId: string;
  registrationId: number;
  identityKey: string;
  signedPreKey: { keyId: number; publicKey: string; signature: string };
  oneTimePreKey: { keyId: number; publicKey: string } | null;
};

async function fetchBundle(peerUserId: string): Promise<Bundle> {
  const res = await fetch(
    `/api/signal/bundle?userId=${encodeURIComponent(peerUserId)}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("Peer has no encryption keys yet.");
  return (await res.json()) as Bundle;
}

export async function ensureSession(userId: string, peerUserId: string): Promise<void> {
  const store = storeFor(userId);
  const cipher = new SessionCipher(store, addressOf(peerUserId));
  if (await cipher.hasOpenSession()) return;
  const bundle = await fetchBundle(peerUserId);
  const device: DeviceType = {
    identityKey: b64decode(bundle.identityKey),
    registrationId: bundle.registrationId,
    signedPreKey: {
      keyId: bundle.signedPreKey.keyId,
      publicKey: b64decode(bundle.signedPreKey.publicKey),
      signature: b64decode(bundle.signedPreKey.signature),
    },
    preKey: bundle.oneTimePreKey
      ? {
          keyId: bundle.oneTimePreKey.keyId,
          publicKey: b64decode(bundle.oneTimePreKey.publicKey),
        }
      : undefined,
  };
  const builder = new SessionBuilder(store, addressOf(peerUserId));
  await builder.processPreKey(device);
}

export async function encryptForPeers(
  userId: string,
  peerUserIds: string[],
  plaintext: string,
): Promise<Record<string, { type: number; body: string }>> {
  const data = new TextEncoder().encode(plaintext).buffer;
  const out: Record<string, { type: number; body: string }> = {};
  for (const peer of peerUserIds) {
    await ensureSession(userId, peer);
    const cipher = new SessionCipher(storeFor(userId), addressOf(peer));
    const result = await cipher.encrypt(data.slice(0));
    if (!result.body) throw new Error("Encryption produced no body.");
    out[peer] = { type: result.type, body: btoa(result.body) };
  }
  return out;
}

export async function decryptFromPeer(
  userId: string,
  senderUserId: string,
  envelope: { type: number; body: string },
): Promise<string> {
  const cipher = new SessionCipher(storeFor(userId), addressOf(senderUserId));
  const raw = atob(envelope.body);
  const plain =
    envelope.type === 3
      ? await cipher.decryptPreKeyWhisperMessage(raw)
      : await cipher.decryptWhisperMessage(raw);
  return new TextDecoder().decode(plain);
}

export function peerKeyChanged(userId: string, peerUserId: string): boolean {
  return readJson(userId, "changed")[peerUserId] === "1";
}

export async function fingerprintFor(
  userId: string,
  peerUserId: string,
  peerIdentityKey: string,
): Promise<string> {
  const identity = await storeFor(userId).getIdentityKeyPair();
  if (!identity) throw new Error("No local identity.");
  const generator = new FingerprintGenerator(5200);
  return generator.createFor(
    userId,
    identity.pubKey as ArrayBuffer,
    peerUserId,
    b64decode(peerIdentityKey),
  );
}
