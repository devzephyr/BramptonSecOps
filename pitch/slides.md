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

Verify the instruction before the truck moves.

<div class="small">

**Challenge: Multimodal Logistics · Agri-Food cold chain**

Adeyemi Folarin · Gurpratap Smagh · Karandeep Singh Malhari · Teghveer Singh Ateliey

Brampton SecOps Hackathon · September 26, 2026 · bramptonsecops.vercel.app

</div>

<!--
We're SupplyChek. We make sure the instruction that moves a truck is real before anyone acts on it.
-->

---

# Real shipment. Fake instruction.

<div class="grid grid-cols-2 gap-10 mt-6">
<div>

<div class="stat">$725M</div>
<div class="label">cargo stolen in the US and Canada in 2025, up 60%</div>

<div class="stat bad">+47%</div>
<div class="label">food and beverage thefts in 2025, the fastest-rising category</div>

<div class="stat bad">9%</div>
<div class="label">of stolen cargo in Canada recovered, 2025</div>

</div>
<div class="flow">
  <div>Real carrier</div>
  <div>Real driver</div>
  <div>Real pickup</div>
  <div class="bad-box">Fake "new delivery address" email</div>
  <div class="bad-box">Lost load</div>
</div>
</div>

<div class="source">Sources: Verisk CargoNet 2025; Équité Association via Truck News 2025</div>

<!--
Here's the problem. Everything about the shipment is legitimate: the carrier, the driver, the pickup. Then one email or phone call says "deliver to this yard instead". Today that change is checked by a person reading an email. A $274,000 load, and the verification system is free and easy to fake.
Losses hit $725 million last year, up 60%, and the average theft was $274,000. Food and beverage rose fastest of any category, up 47%. That's the agri-food cold chain, and it's who we built for. Once a load is gone, only 9% comes back.
-->

---

# Don't judge the email. Verify the change.

1. Everyone tries to spot the fake message. Attackers get unlimited tries.
2. The dangerous thing is the change: a new address, a new carrier, new bank details.
3. So we verify the change itself, out of band, signed by two people.

<!--
Most tools try to classify the email: phishing or not. That's a guessing game, and the attacker can keep trying.
The email is just the delivery mechanism. What costs you the load is the change it asks for. So we make the change the thing you verify. Then the email can say whatever it wants.
-->

---

# We verify every risky change before anyone acts

<div class="grid grid-cols-2 gap-10 mt-8">
<div class="box bad-box">

**Locked down**

- Delivery address or dock
- New carrier
- Bank details
- Portal access

</div>
<div class="box good-box">

**Stays fast**

- ETA updates
- Driver check-ins
- Shipment status
- Delivery

</div>
</div>

<!--
One sentence: we help shippers verify every risky change before anyone acts, because each approval is a signature on the exact request.
We don't slow down the whole day. Routine updates stay one tap. Only the four changes that move money or freight get locked down: call the number on file, then two people approve.
-->

---

# 2-minute live demo

1. A "broker" emails: send the load to a new yard. SupplyChek flags it.
2. Staff call the number already on file. Not the one in the email.
3. Two managers approve the exact same request with passkeys.
4. The partner opens a signed receipt and checks it.
5. The driver taps "15 minutes out". The dock sees it.

<div class="source">Live at bramptonsecops.vercel.app</div>

<!--
Live demo, 2:00 hard stop. Follow DEMO_SCRIPT.md.
Open /api/health a minute before. Backup: screen recording.
-->

---

# We sign the instruction, not just the login

<div class="grid grid-cols-2 gap-10 mt-4">
<div class="flow">
  <div>Change request</div>
  <div>SHA-256 of the exact request</div>
  <div>Passkey approval #1</div>
  <div>Passkey approval #2, a different person</div>
  <div class="good-box">Signed receipt anyone can check</div>
</div>
<div>

- No passwords to phish. Passkeys only.
- Change one digit and the approval breaks.
- Receipts are Ed25519-signed.
- Documents and driver logs are hashed. Tampering shows.

</div>
</div>

<!--
Why is this hard to fake? A passkey is bound to our domain by the browser, so there's nothing to type into a phishing page.
Each approval signs the hash of the exact request. Change one digit of the address and the signature fails.
Two different people, enforced per person, not per role. The receipt is signed with a published key, so a partner can check it without trusting us.
-->

---

# Start in Peel Region. Shippers pay.

<div class="grid grid-cols-2 gap-10">
<div>

<div class="bars">
  <div><span>Ontario</span><i style="width:100%"></i><b>1,601</b></div>
  <div><span>Alberta</span><i style="width:15%"></i><b>240</b></div>
  <div><span>Quebec</span><i style="width:11%"></i><b>180</b></div>
</div>

<div class="label">Cargo, trailer and tractor thefts recorded, 2025</div>

</div>
<div>

- **Beachhead:** 11,000+ logistics employers in Brampton.
- **Who pays:** the shipper, per site per month. Partners join free.
- **Test price:** $199 per site per month.
- **1% of Brampton:** 110 sites, about $263K a year.

</div>
</div>

<div class="source">Sources: Équité Association via Truck News 2025; Invest Brampton Logistics Sector Profile 2025</div>

<!--
Ontario has more recorded thefts than Alberta and Quebec combined, many times over. Brampton is the middle of it: 11,000 logistics employers, and CN's intermodal terminal moving over 2,000 trucks a day.
The shipper pays, because the shipper eats the loss. Suppliers, carriers and drivers join free, so every receipt they open shows them the product.
$199 is the price we'll test in pilots. One percent of Brampton alone is about a quarter million a year.
-->

---

# What we know, and what we don't yet

<div class="grid grid-cols-2 gap-10 mt-6">
<div class="box good-box">

**Proven**

- Working app, deployed, five roles
- Built in 32 hours, 74 commits
- Automated checks pass
- Fraud pattern documented by RCMP, CargoNet, Équité, CIFFA

</div>
<div class="box">

**Not yet**

- Customer interviews
- Fakes caught on real loads

That's what the pilots measure.

</div>
</div>

<!--
What evidence do we have beyond our own belief? The research is solid, it's cited in the appendix. The RCMP names this fraud pattern. CIFFA calls double brokering rampant.
The product works end to end; you just saw it.
What we don't have yet is customer interviews. I'd rather tell you that than make up a number.
-->

---

# Win one lane. Then the network.

1. Three free pilots with Peel Region shippers.
2. One workflow first: delivery address and dock changes.
3. Every receipt a partner opens introduces SupplyChek.
4. Then carrier and bank changes.

<!--
First customer, not a five-year plan.
Address changes first because that's where the load disappears, and it's easy to count.
Receipts are the growth loop: a carrier sees one, then its other shippers want one.
-->

---

# Team

<div class="grid grid-cols-2 gap-8 mt-6">
<div><b>Teghveer Singh Ateliey</b><br><span class="label">Engineering and product · Mechatronics Engineering, McMaster</span></div>
<div><b>Adeyemi Folarin</b><br><span class="label">Engineering and security · Cybersecurity, Seneca</span></div>
<div><b>Gurpratap Smagh</b><br><span class="label">Security and infrastructure · Cybersecurity, Humber</span></div>
<div><b>Karandeep Singh Malhari</b><br><span class="label">Security and business · Cybersecurity, Sheridan</span></div>
</div>

<div class="mt-10 text-2xl">Three security students and an engineer from the GTA. We shipped a working product in 32 hours.</div>

<!--
Why us: we're from the region this is happening in, we're trained in exactly the security pieces this needs, and we've already shown we can ship it.
-->

---
layout: center
---

# The ask

<div class="stat">First place</div>

<div class="text-2xl mt-4">$5,000 → three Peel Region pilots in 90 days</div>

<div class="label mt-4">Success: every address change on those sites verified before the truck moves, and a count of the fakes we stopped.</div>

<!--
If you say yes: we take this to three sites and count the fake changes we stop before the load moves. That's the number we'll come back with.
Thank you.
-->

---

# Appendix: sources

<div class="small">

- Verisk CargoNet, 2025 theft trends ($725M, +60%, $273,990 average, food and beverage 708 thefts +47%): cargonet.com/news-and-events/cargonet-in-the-media/2025-theft-trends
- Équité Association via Truck News, 2025 (Ontario 1,601 thefts; 9% cargo and 44% trailer recovery): trucknews.com
- Invest Brampton, Logistics Sector Profile 2025 (11,000+ employers, 24,000 employees, CN terminal 2,000+ trucks daily): investbrampton.ca
- RCMP, Business email compromise, Scheme #2: rcmp.ca
- Canadian Anti-Fraud Centre news release, 2025-07-24: antifraudcentre.ca
- CIFFA, Double brokering in the Canadian trucking industry, 2023: ciffa.com

</div>
