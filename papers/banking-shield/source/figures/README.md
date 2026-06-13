# Paper figures — specifications (Pass 7)

Each figure must support a specific claim. Final artwork is produced in Stage
B5-D; these are the binding specifications.

| ID  | Figure              | Content                                                                                                                         | Supports claim                           |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| F1  | Architecture        | Consent/scenario/report pages → token layer → forbidden-field firewall → policy scoring → session store + HMAC chain → exports. | Metadata-only by construction (C1).      |
| F2  | Session lifecycle   | consent → scenario submit → report/audit/verify → withdrawal (with the 403 paths marked).                                       | Verifiable participation lifecycle (C4). |
| F3  | AI privacy firewall | Input firewall → deterministic provider → output claim firewall → receipt; no-egress gate drawn as a boundary around all four.  | Structural guarantee (C2).               |
| F4  | Evidence pipeline   | Unit/smoke/security/privacy gates → fixtures → frozen evidence pack → paper.                                                    | Reproducibility (E1).                    |

Rule: F3 is the page-one figure candidate — it captures the core idea.
