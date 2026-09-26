---
theme: default
title: SupplyChek
info: Brampton SecOps Hackathon pitch, September 26, 2026
colorSchema: light
layout: cover
transition: none
exportFilename: supplychek-pitch
---

# SupplyChek

Verify the change, not the email.

Adeyemi Folarin · Gurpratap Smagh · Karandeep Singh Malhari · Teghveer Singh Ateliey

Brampton SecOps Hackathon · September 26, 2026

<!--
Hi. We built SupplyChek. The short version: in a supply chain, the expensive mistakes happen when someone acts on a message that looks real and isn't. So we built the thing that makes you check first, and makes checking cheap.
-->

---

# The problem

1. A "supplier" emails new bank details. You pay the criminal.
2. A "broker" moves the dock or swaps the carrier. The load leaves with the wrong truck.
3. Nobody can tell. The fake email looks exactly like the real one.

<!--
Here's the setup. A cold-chain company talks to dozens of partners all day, over email and phone.
One: the RCMP literally has a name for this, Scheme #2. Someone pretends to be your supplier and asks you to pay a new account.
Two: same trick, different payload. Change the dock, change the carrier, and a truckload of food drives off with the wrong people.
Three: and the only defence today is a tired person squinting at an email at 4pm. That's the whole security model.
-->

---
layout: fact
---

# CAD $67.5M

Lost to spear-phishing in Canada in 2024. Only 5–10% of fraud is ever reported.

Source: Canadian Anti-Fraud Centre, 2025

<!--
That's just the part people reported. CAFC thinks only 5 to 10 percent gets reported at all. So the true number is, roughly, a lot bigger. Nobody likes admitting they wired money to a stranger.
-->

---

# Ontario is where the trucks get stolen

<RoughBar :labels="['Ontario', 'Alberta', 'Quebec']" :values="[1601, 240, 180]" />

Thefts recorded in 2025. Tractors, trailers and cargo combined. Source: Équité Association via TruckNews.

<!--
Look at the shape of this. Ontario is about 1,600. Alberta 240, Quebec 180. Trailer theft nearly doubled last year, and these are the ones that got recorded.
We're in Brampton. This is our backyard.
-->

---

# The insight

Fraud doesn't break in. It asks politely.

- Everyone tries to detect the fake message. That's a guessing game.
- We skip the guessing. Verify the change itself.
- Then hand the partner a receipt they can check without trusting us.

<!--
Most security tools try to classify the email: is this phishing, yes or no. That's a hard problem, and the attacker gets unlimited tries.
The thing I find interesting is that you don't have to win that game. The email is just the delivery mechanism. The dangerous object is the change: new bank details, a new dock, a new carrier.
So make the change the unit of work. Pin it down exactly, verify it out of band, sign it. Then the email can say whatever it wants.
-->

---
layout: statement
---

# We help shippers verify every change before anyone acts

Bank details, docks, carriers. Each approval is a passkey signature on the exact request.

<!--
One sentence version. We help shippers verify every change before anyone acts, because each approval is a cryptographic signature over the exact bytes of the request.
-->

---

# Demo

1. A supplier submits a bank change. SupplyChek flags it.
2. Staff call the number already on file. Not the one in the email.
3. Two managers approve the same request with passkeys.
4. The partner opens a signed receipt and checks it.
5. A driver taps "15 minutes out". The dock sees it.

bramptonsecops.vercel.app

<!--
OK, let's just look at it. Follow DEMO_SCRIPT.md, about 2:45.
Jordan, our supplier, submits the Scheme #2 bank change. Watch the flags.
Amira approves with a passkey. Colin approves the identical hash. Two different humans, one exact request.
Open /v/{token}: that's the receipt a partner sees. Signature checks out.
Devon taps 15 minutes out on the phone and the receiver's screen lights up.
If the database is asleep, hit /api/health first.
-->

---

# Technology

- Passkeys only. There is no password to phish.
- An approval signs the SHA-256 hash of the exact request.
- High-risk changes need two different people.
- Receipts are Ed25519-signed. Anyone can verify them.
- Case messages use the Signal protocol, end to end.
- Documents are hashed. Driver logs are hash-chained. Tampering shows.

<!--
Why is this hard to fake? A few simple pieces that compose nicely.
A passkey is bound to our domain by the browser, so you can't type it into a phishing page. There's nothing to type.
The approval is a signature over the hash of the canonical request. Change one digit of the account number and the signature is garbage.
Two approvals from two distinct people, enforced per person, not per role.
The receipt is Ed25519-signed with a published key, so a partner can check it without trusting us at all.
And the paperwork, bills of lading, invoices, receipts, is stored with its hash. If a file changes, we refuse to serve it.
-->

---

# Market & business model

- **Who:** cold-chain shippers, warehouses and carriers in the Greater Toronto Area.
- **Start:** Peel Region cold storage. Brampton and Mississauga.
- **Who pays:** the shipper, per site, per month.
- **Partners join free.** Suppliers, drivers and receivers.

<!--
Who pays? The shipper, because the shipper eats the loss. Per site, per month; we'll set the price with pilots, not in a slide.
Partners are free. That's deliberate: every receipt a partner opens is a little demo of the product.
-->

---

# Validation

- **Research:** RCMP, CAFC, CISA, CargoNet, Équité and CIFFA all describe this fraud.
- **Built:** five role desks, live at bramptonsecops.vercel.app.
- **Tested:** automated checks, plus end-to-end tests of uploads, access rules and tamper detection.
- **Not yet:** customer interviews. That's next.

<!--
What do we actually know? The research is solid, and it's all cited in the appendix.
The prototype works end to end and it's deployed, you just saw it.
What we don't have yet is customer interviews. I'd rather tell you that than make up a number.
-->

---

# Go-to-market

1. Three free pilots with Peel Region cold-storage sites.
2. One workflow first: supplier bank changes.
3. Every receipt a partner opens introduces SupplyChek.
4. Then docks, carriers and pickups.

<!--
First customer, not a five-year plan.
Bank changes first because that's where the money leaves, and it's easy to measure.
Receipts are the growth loop. A partner sees one, then wants one.
-->

---

# Team

- Adeyemi Folarin
- Gurpratap Smagh
- Karandeep Singh Malhari
- Teghveer Singh Ateliey

Built during the hackathon: one deployed app, five role desks, 50+ commits.

<!--
Why us. Each of us: your role and one relevant skill, one sentence each.
-->

---
layout: center
---

# The ask

First place.

Then three pilot sites in Peel Region.

Goal: prototype → three real sites verifying bank changes.

<!--
If you say yes: we take this to three sites and count how many fake changes we stop before the money moves. That's the number we'll bring back.
Thanks.
-->

---

# Appendix: sources

- RCMP, Business email compromise, Scheme #2: rcmp.ca/en/federal-policing/cybercrime/cyber-features/business-email-compromise
- Canadian Anti-Fraud Centre news release, 2025-07-24: antifraudcentre.ca
- CISA advisory AA22-340A, food and agriculture payment redirection: cisa.gov
- Équité via TruckNews, trailer theft 2025: trucknews.com
- CargoNet, 2025 theft trends: cargonet.com
- CIFFA, Double brokering in the Canadian trucking industry, 2023: ciffa.com
