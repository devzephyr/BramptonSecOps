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

class MemStore implements StorageType {
  identity?: KeyPairType;
  registrationId?: number;
  prekeys = new Map<string, KeyPairType>();
  signed = new Map<string, KeyPairType>();
  sessions = new Map<string, string>();
  identities = new Map<string, ArrayBuffer>();

  async getIdentityKeyPair() {
    return this.identity;
  }
  async getLocalRegistrationId() {
    return this.registrationId;
  }
  async isTrustedIdentity() {
    return true;
  }
  async saveIdentity(addr: string, pub: ArrayBuffer) {
    this.identities.set(addr, pub);
    return false;
  }
  async loadPreKey(k: string | number) {
    return this.prekeys.get(String(k));
  }
  async storePreKey(k: number | string, kp: KeyPairType) {
    this.prekeys.set(String(k), kp);
  }
  async removePreKey(k: number | string) {
    this.prekeys.delete(String(k));
  }
  async storeSession(addr: string, rec: string) {
    this.sessions.set(addr, rec);
  }
  async loadSession(addr: string) {
    return this.sessions.get(addr);
  }
  async loadSignedPreKey(k: number | string) {
    return this.signed.get(String(k));
  }
  async storeSignedPreKey(k: number | string, kp: KeyPairType) {
    this.signed.set(String(k), kp);
  }
  async removeSignedPreKey(k: number | string) {
    this.signed.delete(String(k));
  }
}

const enc = new TextEncoder();
const dec = new TextDecoder();
const toB64 = (buf: ArrayBuffer) => Buffer.from(buf).toString("base64");
const fromB64 = (s: string) => Uint8Array.from(Buffer.from(s, "base64")).buffer as ArrayBuffer;

async function main() {
  const bobStore = new MemStore();
  const bobIdentity = await KeyHelper.generateIdentityKeyPair();
  bobStore.identity = bobIdentity;
  bobStore.registrationId = KeyHelper.generateRegistrationId();
  const bobSigned = await KeyHelper.generateSignedPreKey(bobIdentity, 1);
  await bobStore.storeSignedPreKey(bobSigned.keyId, bobSigned.keyPair);
  const bobPre = await KeyHelper.generatePreKey(7);
  await bobStore.storePreKey(bobPre.keyId, bobPre.keyPair);
  const bundle = {
    identityKey: toB64(bobIdentity.pubKey as ArrayBuffer),
    registrationId: bobStore.registrationId,
    signedPreKey: {
      keyId: bobSigned.keyId,
      publicKey: toB64(bobSigned.keyPair.pubKey as ArrayBuffer),
      signature: toB64(bobSigned.signature as ArrayBuffer),
    },
    oneTimePreKey: {
      keyId: bobPre.keyId,
      publicKey: toB64(bobPre.keyPair.pubKey as ArrayBuffer),
    },
  };

  const aliceStore = new MemStore();
  aliceStore.identity = await KeyHelper.generateIdentityKeyPair();
  aliceStore.registrationId = KeyHelper.generateRegistrationId();
  const bobAddr = new SignalProtocolAddress("bob", 1);
  const device: DeviceType = {
    identityKey: fromB64(bundle.identityKey),
    registrationId: bundle.registrationId,
    signedPreKey: {
      keyId: bundle.signedPreKey.keyId,
      publicKey: fromB64(bundle.signedPreKey.publicKey),
      signature: fromB64(bundle.signedPreKey.signature),
    },
    preKey: {
      keyId: bundle.oneTimePreKey.keyId,
      publicKey: fromB64(bundle.oneTimePreKey.publicKey),
    },
  };
  await new SessionBuilder(aliceStore, bobAddr).processPreKey(device);

  const aliceCipher = new SessionCipher(aliceStore, bobAddr);
  const first = await aliceCipher.encrypt(enc.encode("sealed note: change the bank account").buffer);
  console.log("alice->bob type:", first.type);
  const bobCipher = new SessionCipher(bobStore, new SignalProtocolAddress("alice", 1));
  const opened = await bobCipher.decryptPreKeyWhisperMessage(first.body!);
  console.log("alice->bob reads:", dec.decode(opened));

  const reply = await bobCipher.encrypt(enc.encode("confirmed, calling the number on file").buffer);
  console.log("bob->alice type:", reply.type);
  const back = await aliceCipher.decryptWhisperMessage(reply.body!);
  console.log("bob->alice reads:", dec.decode(back));

  const fp = new FingerprintGenerator(5200);
  const ab = await fp.createFor("alice", aliceStore.identity!.pubKey as ArrayBuffer, "bob", fromB64(bundle.identityKey));
  const ba = await fp.createFor("bob", fromB64(bundle.identityKey), "alice", aliceStore.identity!.pubKey as ArrayBuffer);
  console.log("fingerprint match:", ab === ba, ab.slice(0, 24));

  if (
    dec.decode(opened) !== "sealed note: change the bank account" ||
    dec.decode(back) !== "confirmed, calling the number on file" ||
    ab !== ba
  ) {
    throw new Error("round trip mismatch");
  }
  console.log("signal round trip: OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
