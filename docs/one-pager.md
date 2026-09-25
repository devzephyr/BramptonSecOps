# SupplyChek one-pager (sourced figures)

SupplyChek is operational verification for Canadian cold-chain SMEs: sealed note, call the number on file, two passkey approvals on one payload hash, driver ETA warnings, partner receipt link.

---

## Payment redirection (inbox)

- **CAFC (2025):** Spear-phishing reported losses about **CAD $67.5 M** in 2024; total reported fraud about **CAD $647 M**; only about **5–10%** of fraud is reported.  
  https://antifraudcentre.ca/news-nouvelles/2025/2025-07-24-eng.htm

- **RCMP Scheme #2:** Criminals impersonate suppliers to redirect invoice payments to new bank accounts (business email compromise).  
  https://www.rcmp.ca/en/federal-policing/cybercrime/cyber-features/business-email-compromise

- **CISA AA22-340A:** Food and agriculture sector **payment-redirection** pattern (advisory example, not a Canada-wide agri loss total).  
  https://www.cisa.gov/news-events/cybersecurity-advisories/aa22-340a

## Cargo theft and under-reporting

- **Équité / Truck News (2025):** Ontario about **1,601** cargo thefts vs about **240** Alberta and about **180** Quebec; **trailer thefts nearly doubled**; losses often under-reported.  
  https://www.trucknews.com/security/canadas-trailer-theft-nearly-doubles-as-cargo-losses-go-underreported-in-2025/1003209612/

- **CargoNet (2025 trends):** Nearly **$725 M** in stolen cargo (US/Canada context per report); **food and beverage** category up about **47%**.  
  https://www.cargonet.com/news-and-events/cargonet-in-the-media/2025-theft-trends/

## Carrier fraud

- **CIFFA (2023):** Double brokering described as **“now rampant”** in the Canadian trucking industry.  
  https://www.ciffa.com/wp-content/uploads/2023/04/230403-Double-Brokering-in-the-Canadian-Trucking-Industry_Final.pdf

---

## How SupplyChek maps

| Risk | Desk behavior |
| --- | --- |
| Scheme #2 bank change | Sealed note → flags → call on file → two manager passkeys on one hash |
| Diverted dock / load | Destination playbook + same dual-control pattern where policy requires |
| Double brokering | New-carrier heuristics + policy for introductions |
| In-transit surprise | Driver ETA tap → manager and receiver in-app warning |

Attestation on every screen: **SupplyChek attestation — not a government certification.**
