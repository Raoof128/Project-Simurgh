# Stage B5 — Model Claim Audit (Pass 2, hostile claim prosecutor)

Scope: the input pack, the outline, and draft v0.1 were scanned for phrasing
that could be read as fraud detection, scam prevention, payment safety, payee
verification, financial advice, compliance, real banking protection, or
production readiness. Findings below; all rewrites were applied to the draft.

| #   | Risky phrase                             | Why risky                                               | Safe rewrite                                                                                                                        | Severity |
| --- | ---------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | "risk scoring"                           | Reads as a fraud/credit risk capability claim.          | "deterministic prototype policy outcome" on first use; "policy scoring" thereafter, defined as fictional.                           | medium   |
| 2   | "Banking Shield" (project name)          | The name alone implies real banking protection.         | Keep the name; first paragraph of §1 states it is a fictional banking-adjacent research prototype with no real banking integration. | medium   |
| 3   | "warning" / "critical" verdicts          | Could imply a calibrated alerting capability.           | Always "prototype policy outcome was: warning", with the non-claim that no fraud finding is made.                                   | low      |
| 4   | "AI privacy firewall"                    | "Firewall" suggests a hardened security product.        | Define on first use as a research design pattern: fail-closed enforcement points around a narrative layer.                          | low      |
| 5   | "integrity evidence"                     | Adjacent to fraud-detection vocabulary.                 | Qualify as "evidence about the integrity of the data-handling process, not of any transaction".                                     | medium   |
| 6   | "tamper-evident audit chain"             | Could be read as tamper-_proof_.                        | State explicitly: tamper-evident, not tamper-proof; the server holds the HMAC keys.                                                 | low      |
| 7   | "the firewall blocks unsafe claims"      | Overgeneral — it blocks a finite denylist of phrasings. | "blocks a curated denylist of affirmative-capability phrasings; denylists are incomplete by construction".                          | medium   |
| 8   | "payee-name check interaction"           | Could imply a real payee-verification capability.       | Always "fictional payee-name check scenario (mock)".                                                                                | medium   |
| 9   | "supports auditors"/"regulator-relevant" | Drifts toward a compliance claim.                       | "may be of methodological interest to auditors; no compliance property is claimed or implied".                                      | high     |
| 10  | "the system is safe / private"           | Absolute property claims unsupported by evidence.       | "all automated privacy and security gates passed at the evidence freeze" — claims about gates, not the world.                       | high     |

## Standing rules derived

1. Capability nouns (detection, prevention, verification, advice, compliance)
   may appear **only** inside negated non-claims or denylist descriptions.
2. Every section that names a banking concept restates the fictional framing
   within the same paragraph.
3. Claims are always about _mechanisms and gate results_, never about
   real-world outcomes.

## Result

After rewrites, a re-scan of draft v0.1 found no affirmative occurrence of any
forbidden-claim phrase outside negated non-claims and denylist descriptions.
This mirrors the runtime behaviour of the B4-A output claim firewall — the
paper passes the same discipline the system enforces.

**Rubric:** all 8 criteria PASS.
