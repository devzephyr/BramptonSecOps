# Sample cases (training only)

Use with `verify_playbooks.json` request types. Ontario / Mississauga cold-store setting.

---

## Case A — Bank payment detail change (Maple Malt vs Lake Ontario Cold Storage)

**Request type:** `bank_change`

Lake Ontario Cold Storage pays Maple Malt Ingredients for malt used in beverage runs. Finance receives Email A asking for new EFT and Interac details. The From address uses **maple-malt-ingredients.com** with hyphens; your vendor file lists **maplemaltingredients.ca** and banking you paid last month.

**Red flags:** Payment detail change, lookalike domain, urgency, instruction not to call.

**Expected playbook use:** Dual control required. Out-of-band steps: call AP at Maple Malt using the number on last month’s remittance advice, not the email. RCMP describes this pattern as Scheme #2 business email compromise (supplier payment-detail change).

**Heuristics likely:** `PAYMENT_DETAIL_CHANGE`, `LOOKALIKE_DOMAIN` or `DOMAIN_NOT_ON_FILE`, `URGENCY_OR_SECRECY`, `MAIL_AUTH_NOT_CHECKED`.

---

## Case B — Dock diversion in Brampton / GTA

**Request type:** `destination_change`

A produce load booked for Gate 4 at Lake Ontario Cold Storage gets Email B from a Gmail address. It sends the driver to a cross-dock on Steeles Ave W that is not on the appointment.

**Red flags:** Free email domain, unknown yard, secrecy (“do not call the driver”).

**Expected playbook use:** Dual control. Call receiving supervisor and the shipper on numbers in your TMS before any diversion.

**Heuristics likely:** `FREE_EMAIL_DOMAIN`, `DESTINATION_OR_DOCK_CHANGE`, `URGENCY_OR_SECRECY`, `MAIL_AUTH_NOT_CHECKED`.

---

## Case C — New carrier / double broker

**Request type:** `new_carrier`

Traffic gets Email C offering to cover a Mississauga reefer lane. The sender claims to be a sister company and asks you to skip phone verification.

**Red flags:** New carrier introduction, vague authority, pressure to book without checks.

**Expected playbook use:** Dual control. Verify with your incumbent carrier and customer contact on file; complete onboarding if truly new.

**Heuristics likely:** `NEW_CARRIER`, `URGENCY_OR_SECRECY`, `MAIL_AUTH_NOT_CHECKED`. Industry sources describe double brokering as widespread in Canadian trucking—still verify locally.

---

## Case D — Access link request

**Request type:** `credential_request`

Jordan in receiving gets Email D with a portal renewal link on **lakeontariocold-portal.net**, not your usual host.

**Red flags:** Credential ask, lookalike domain, time pressure.

**Expected playbook use:** Dual control. Call IT or the partner manager on the number already on file; do not click the link.

**Heuristics likely:** `CREDENTIAL_ASK`, `LOOKALIKE_DOMAIN`, `URGENCY_OR_SECRECY`, `MAIL_AUTH_NOT_CHECKED`.

---

## Case E — Plant remote access urgency

**Request type:** `ot_remote`

Maintenance receives Email E about a Line 3 compressor alarm and a request to install remote support software immediately.

**Red flags:** OT remote access, unverified vendor domain, bypass normal change control.

**Expected playbook use:** Call the refrigeration vendor on the asset sticker or last work order phone list. Schedule access with maintenance present.

**Heuristics likely:** `OT_REMOTE_ACCESS`, `URGENCY_OR_SECRECY`, `MAIL_AUTH_NOT_CHECKED`.

---

## Case F — Mid-haul destination change

**Request type:** `destination_change`

Dispatch receives Email F during transit on load 9088. Drop moves from Brampton DC to Mississauga cold store Door 12 the same night.

**Red flags:** Destination change mid-haul, instruction to trust a cell number in the rate con instead of calling dispatch on file.

**Expected playbook use:** Dual control for high-value frozen load. Call customer service and the driver on your carrier dispatch line before redirecting.

**Heuristics likely:** `DESTINATION_OR_DOCK_CHANGE`, `ON_FILE_MISMATCH` if TMS still shows Goreway, `MAIL_AUTH_NOT_CHECKED`.
