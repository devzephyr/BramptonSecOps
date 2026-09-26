# SupplyChek demo script (~2:45)

Use **Edge** or **Chrome** on desktop, or **Chrome** on Android for the driver beat. Passkeys via **Windows Hello** or **Android Credential Manager**. Run `GET /api/health` once if Neon was idle.

---

**0:00 — Supplier (Jordan Pell)**  
Sign out if needed. Sign in as username **jordan** in **Lake Ontario Cold Storage** with his own passkey — no account list, no email. Open the supplier desk, write the **RCMP Scheme #2** bank-detail change as a sealed note, submit. Point at flags and playbook: call the number already on file. Jordan notes the call done.

**0:45 — Manager 1 (Amira Shah)**  
Sign out. Amira signs in as username **amira**. Open the same case, read the payload on screen, complete the out-of-band checklist, passkey-approve the **same payload hash**.

**1:05 — Manager 2 (Colin Berger)**  
Sign out. Colin signs in as username **colin**. Second approval on the **identical hash**. Case shows dual control complete.

**1:20 — Partner receipt**  
Open `/v/{token}` in a fresh window. Show: payload hash, both signers, timestamps, **Matches uploaded content: Yes**, verified Ed25519 signature on the receipt.

**1:45 — Driver (Devon Blake, phone)**  
Devon signs in on the phone as username **devon**. Tap **15 minutes away**. Confirm the tap saved.

**2:05 — Manager + receiver**  
On desktop, logistics notification and receiver/warehouse screens show the in-app warning for Devon’s ETA.

**2:20 — Close**  
One line: **Four role screens, passkeys only, no chat channel.**

**2:30 — Buffer**  
Optional: show landing at `/` and PWA “Add to Home Screen” on Android (shell only; approvals still need live network).

---

**Cast:** Jordan Pell (supplier), Amira Shah + Colin Berger (logistics), Devon Blake (driver), partner viewer (no account).
