# SupplyChek

## What it is

SupplyChek helps Canadian cold-chain teams check risky requests before banking, docks, or loads change. Staff write a sealed note, follow the playbook (call the number already on file), and two different managers confirm the same payload with a passkey. Case threads are end-to-end encrypted with the Signal protocol. Drivers share live trip positions receivers watch like a ride-share map. Partners open a public receipt link to see the payload hash, signers, timestamps, and an Ed25519 signature from the server—without a side channel for approvals.

Four role screens (supplier desk, manager, driver, receiver). Passkeys only for sign-in and approvals. Two demo orgs with separated data.

## Teammate quickstart

```bash
npm install
# copy your .env.local with the vars below (DATABASE_URL, SESSION_SECRET, ...)
npx prisma db push
npx prisma db seed
npm run dev:next
```

Open [http://localhost:3000/sign-in](http://localhost:3000/sign-in). No account list exists on purpose: sign in with your own username + organization + passkey.

### Demo accounts

Org **Lake Ontario Cold Storage** (slug `lake-ontario-cold-storage`):

| Username | Role | Screen |
| --- | --- | --- |
| `jordan` | supplier | Supplier desk |
| `amira` | manager | Manager board |
| `colin` | manager | Manager board (second approver) |
| `priya` | admin | Manager board |
| `devon` | driver | Driver taps + trip sim |
| `samir` | driver | Driver taps + trip sim |
| `elena` | receiver | Incoming + live map + POD |

Org **Brampton Cross-Dock Freight** (slug `brampton-cross-dock`): `noah` (manager), `maya` (supplier), `omar` (driver). Sees none of org 1's data.

Each account needs one passkey enrollment first. `npx prisma db seed` prints an enrollment code for every seeded account that has no passkey yet (24-hour expiry, one use each). Enter username + organization + that code, click **Create a passkey**, approve the browser prompt, then **Sign in with passkey**. (`DEMO_ENROLL=true` must be set.) Codes expired? Re-run the seed; it issues fresh ones and leaves enrolled accounts alone.

Nobody can enroll on someone else's account. First-time setup needs an **enrollment code**: the org admin opens Team → Issue code next to the new member and reads it to them once (it never shows again). The member enters it in the Enrollment code field when creating their passkey. Codes expire after 24 hours and burn on use. Lost device? An admin revokes the old passkey from the same Team panel, issues a fresh code, and the member re-enrolls. If the org's only admin is the one locked out, anyone with database access can run `npx tsx --env-file=.env.local scripts/issue-code.ts <org-slug> <username> --revoke-passkeys`, which clears that account's passkeys and prints a fresh code.

### Five-minute tour

1. As `jordan`: supplier desk → write a sealed note → submit.
2. As `amira`: manager board now lists it → open → checklist → approve with passkey.
3. As `colin`: second approval on the identical hash → partner receipt appears.
4. Same case: Messages tab sends Signal-encrypted notes (both must open the case once first); Documents tab uploads hash-recorded files.
5. As `devon`: **Simulate live trip**. As `elena`: watch the live card and ETA timeline move.

## Local Next.js

```bash
npm install
npm run dev:next
```

Open [http://localhost:3000](http://localhost:3000). API routes and WebAuthn run on this server.

## Vite preview desk

The Vite preview is a faster UI shell for demos and component work:

```bash
npm run dev:next    # terminal 1 — port 3000
npm run dev         # terminal 2 — port 5173, proxies /api to 3000
```

Use Chrome or Edge on desktop (Windows Hello) or Chrome on Android (Credential Manager) against the **real hostname** you set in `WEBAUTHN_ORIGIN`, not bare localhost, when testing passkeys in production-like conditions.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres (pooled URL for the app) |
| `SESSION_SECRET` | Signs session cookies |
| `WEBAUTHN_ORIGIN` | Full site origin (e.g. `https://app.example.com`) |
| `WEBAUTHN_RP_ID` | Relying party ID (hostname); defaults from origin |
| `RECEIPT_PRIVATE_KEY_B64` | Ed25519 private key (server only; never in the browser) |
| `JEV_ENABLED` | Set `true` to classify sealed-note text; never auto-approves |
| `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` | Cloudflare R2 or MinIO for evidence uploads |
| `DEMO_ENROLL` | Set `true` only in demo to allow passkey registration routes |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox public token (`pk.…`) for the live trip map. Inlined at build time, so set it before `npm run build` (Vercel env or Docker build context). Without it the map hides and the rest of the tracking UI still works |

Generate a receipt key once and keep it on the server (compose mounts it under `/data` in self-hosted stacks).

## Neon and keepalive

Production uses [Neon](https://neon.tech) Postgres. Free compute can scale to zero; the first request after idle may be slow.

- Hit **`GET /api/health`** on a schedule (daily is enough for demos) so the branch wakes before a live walkthrough.
- If a page hangs after idle, wait for health to return `200`, then retry.

## Object storage (R2 or MinIO)

Evidence attachments go to S3-compatible storage. Point `S3_ENDPOINT` at Cloudflare R2 or a MinIO container from docker compose. The app never exposes bucket credentials to the browser.

## Passkeys (SimpleWebAuthn)

This repo’s working path is [**SimpleWebAuthn**](https://simplewebauthn.dev/) on the Next.js server—no Clerk dependency in compose.

- **Clerk (passkeys-only)** is the optional hosted IdP if you want managed identity later; it is not required to run this codebase.
- **User verification (UV)** is required on authentication and approval ceremonies.
- The **WebAuthn challenge** is `SHA-256(canonical payload ‖ U+2016 nonce)` (see `src/lib/canonical.ts`).
- The **canonical payload** is shown to the user before the passkey prompt; what they approve is what gets hashed and signed.
- **Receipts** use an **Ed25519** key held server-side only (`RECEIPT_PRIVATE_KEY_B64`).

Works with **Windows Hello**, **Android Credential Manager**, **Microsoft Edge**, and **Google Chrome**.

## JEV classification

With `JEV_ENABLED=true`, sealed notes get labels (payment redirection, urgency, carrier introduction, etc.). JEV **classifies only** and **never** writes an approval.

## Docker compose (optional)

`docker compose` (maintained separately) can run MinIO, a local Postgres, and a receipt key volume. It **does not** replace your primary hosted URL on Neon/Vercel; use it for offline demos or integration tests. Compose stacks still need `WEBAUTHN_ORIGIN` pointing at a reachable HTTPS hostname for passkeys.

## Hosted tier

We do **not** claim that any free hosted database or compute tier keeps data in Canada or satisfies residency rules. Treat residency as your own compliance decision.

## Ban-list copy check

Before shipping copy or docs, run the ban-list script so marketing language stays consistent:

```bash
node scripts/ban-list.mjs
```

It fails if forbidden substrings (chat-app names, legacy auth wording, overclaims) appear in tracked markdown and UI strings.

## Related docs

- [Demo script](./DEMO_SCRIPT.md) — under three minutes
- [Failure card](./docs/failure-card.md) — quick fixes
- [One-pager](./docs/one-pager.md) — sourced threat context for Canada

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev:next` | Next.js dev server (API + app routes) |
| `npm run dev` | Vite preview; proxy `/api` → port 3000 |
| `npm run build` | Production Next.js build |
| `npm run start` | Production Next.js server |
| `npm run lint` | ESLint (0 errors required) |
| `npx prisma db push` | Sync schema to the database (dev pattern; migration history has drift) |
| `npx prisma db seed` | Seed two orgs, users, contacts, cases, loads |
| `npx tsx scripts/signal-roundtrip.ts` | Signal crypto proof: Alice↔Bob encrypt, reply, matching safety numbers |
| `npx tsx scripts/logic-check.ts` | Asserts evidence-key shape, enrollment-code normalization, payload patch sanitizing, simulated route |
| `node scripts/ban-list.mjs` | Copy gate: fails on chat-app names, legacy auth wording, overclaims |

## Architecture notes for contributors

- **Tenancy.** Every table carries `orgId`. Sessions carry `orgId` and `requireUser()` enforces it. Never add a query without an org filter. Directory/autocomplete must come from the API, never the hardcoded preview list, or orgs leak into each other.
- **Access model.** Cases, their threads, documents, and the directory are readable by supplier, manager, and admin roles only. Only an admin can create, re-code, or reset the passkeys of managers and admins, so no manager can mint a second approver identity. The person who opened a case cannot approve it. A session is bound to the passkey that signed in; revoking that passkey ends the session on the next request.
- **Concurrency.** Approve, edit, and revoke on a case take a `SELECT … FOR UPDATE` row lock and re-check state inside the transaction, so an approval can never land on a payload that changed mid-ceremony. Enrollment codes, approval ceremonies, WebAuthn challenges, one-time prekeys, and driver load claims are consumed with single conditional writes, never read-then-write.
- **Identity.** Sign-in resolves `username + organization` server-side. No endpoint lists users. The old `userId`-in-body shape is gone.
- **Messaging crypto.** `libsignal-protocol-typescript` (GPL-3.0, hackathon-only license posture). Server stores public keys and ciphertext envelopes; private keys stay in browser localStorage. Pairwise Double Ratchet fan-out per case thread, no Sender Keys.
- **Cases.** The preview store is a view over `/api/verify-cases`, not a local mock. Submit/checklist/approve all round-trip the server.
- **Tracking.** Positions on `Load` (`lat`/`lng`/`positionAt`). The driver sim follows a fixed depot→yard road route (Hwy 403/410, from Mapbox Directions, stored in `src/lib/tracking.ts`), posts Rolling, 15 minutes away, and Arrived on the way, and is labeled simulated everywhere. Maps render with Mapbox GL (`src/components/desk/trip-map.tsx`).
- **Copy gate.** `scripts/ban-list.mjs` runs on the repo (minus `.agents/`). Keep UI copy free of chat-app names, legacy auth wording, and overclaims.
