# Banking Shield Stage B4-B Claim Audit

## Purpose

Keeps the B4-B UI wording aligned with B4-A evidence. B4-B is a presentation
layer only; it must not imply real banking intelligence or a production banking
control.

## Claim Table

| Claim                                             | Evidence                                         | Allowed Status  |
| ------------------------------------------------- | ------------------------------------------------ | --------------- |
| UI surfaces the B4-A AI privacy explanation       | report page panel + full E2E page contract check | Evidence-backed |
| Receipt flags are visible to testers              | report page receipt grid + full E2E assertions   | Evidence-backed |
| Sensitive payload sent to AI remains false        | B4-A receipt + full E2E assertion                | Evidence-backed |
| Network egress used remains false                 | B4-A receipt + full E2E assertion                | Evidence-backed |
| Official result remains unchanged                 | B4-A firewall + full E2E assertion               | Evidence-backed |
| Default-off path remains non-generated/locked     | B4-A router/smoke behavior + B4-B UI copy        | Evidence-backed |
| B4-B changes presentation only, not backend logic | code diff review                                 | Evidence-backed |

## Disallowed Claims

Fraud detection, scam prevention, real banking protection, payment safety, real
payee verification, financial advice, CDR compliance, Confirmation of Payee
compliance, APRA compliance, AML/CTF compliance, reimbursement assessment,
malware detection, production readiness.

## Review Rule

Before any paper, README, PR, or closeout cites B4-B, keep wording focused on
presentation of the B4-A metadata-only explanation and receipt. If wording
implies a real banking capability, rewrite it as a bounded UI presentation
claim.
