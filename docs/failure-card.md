# SupplyChek failure card

Quick fixes during a demo or pilot. Keep this open on a second monitor.

## Database feels asleep (Neon)

**Symptom:** Spinners, timeouts, or 503 on first load after hours idle.

**Fix:** Open **`GET /api/health`** in the browser or curl it. Wait until it returns OK, then reload the app. Schedule a daily health ping in production so demos start warm.

## Passkey sheet never appears

**Symptom:** Approve or sign-in stalls with no system prompt.

**Fix:**

- Use the site’s **real hostname** in `WEBAUTHN_ORIGIN`, served over HTTPS.
- On Windows: **Windows Hello** in **Edge** or **Chrome**.
- On Android: **Credential Manager** in **Chrome** (not an embedded WebView).
- Confirm UV-capable device PIN or biometrics is set up for the OS, not inside SupplyChek.
- Read the payload on screen before retrying—the challenge binds to that canonical text.

## Docker compose won’t start or app crashes on boot

**Symptom:** `docker compose up` fails or the API exits on receipt signing.

**Fix:**

- Check **database health** (container logs, `DATABASE_URL`, migrations applied).
- Confirm the **receipt Ed25519 key file** is mounted at **`/data`** (or `RECEIPT_PRIVATE_KEY_B64` is set) and readable by the app process.
- Compose is for local/edge demos; your **hosted URL on Neon** remains the primary environment for partners.

## Approvals work on Wi‑Fi but not on “offline” PWA

**Symptom:** Shell loads from cache; passkey approve fails.

**Expected:** The service worker caches only desk **shell** pages. **Approve always needs the network** for WebAuthn and the API. Retry on connectivity.
