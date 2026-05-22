# Risk Scorer Configuration

## Category Weights (src/academic/riskScoring.js)

| Category      | Weight | Rationale                                                        |
| ------------- | ------ | ---------------------------------------------------------------- |
| paste_risk    | 0.25   | Highest weight — large paste is the primary AI-assistance signal |
| focus_risk    | 0.18   | Focus loss correlates with consulting external resources         |
| affinity_risk | 0.18   | Capture-excluded window is a strong integrity signal             |
| typing_risk   | 0.15   | Superhuman WPM indicates machine-generated input                 |
| idle_risk     | 0.10   | Long idle followed by large paste suggests copy-paste workflow   |
| daemon_risk   | 0.09   | Daemon proof failures indicate potential tampering               |
| helper_risk   | 0.05   | Helper disconnection may indicate evasion                        |
| session_risk  | 0.05   | Reconnect anomalies; low weight due to legitimate network issues |

**Sum:** 0.25 + 0.18 + 0.18 + 0.15 + 0.10 + 0.09 + 0.05 + 0.05 = 1.00 ✓

**Sensitivity:** Weights were not empirically calibrated — they are design choices reflecting
the author's threat model priorities. No calibration dataset or user study was conducted.

**Search range:** Not specified. No hyperparameter search was conducted.

**Source:** `src/academic/riskScoring.js:1-11`

## Risk Thresholds

| Threshold                           | Value                             | Source                 |
| ----------------------------------- | --------------------------------- | ---------------------- |
| Critical floor                      | ≥ 70                              | `riskScoring.js:96`    |
| Warning floor                       | ≥ 40                              | `riskScoring.js:96`    |
| Paste override (large + low typing) | score ≥ 75                        | `riskScoring.js:80-81` |
| Paste floor (medium)                | score ≥ 40 if paste ≥ 80          | `riskScoring.js:82-83` |
| Affinity Critical floor             | score ≥ 85 if hostileCount > 0    | `riskScoring.js:86-87` |
| Daemon warning floor                | score ≥ 40 if daemonRisk ≥ 40     | `riskScoring.js:88-89` |
| Daemon Critical floor               | score ≥ 85 if daemonForceCritical | `riskScoring.js:90`    |

## Category Score Formulas

| Category      | Formula                                              | Thresholds                                                  |
| ------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| paste_risk    | Step function on paste_payload_chars and chars_typed | ≥200+low→100; blur+≥80→100; ≥80→100; ≥50→60; >0→20          |
| focus_risk    | Blur count + time_off_window additive                | blurs≥4→+80; ≥2→+50; =1→+20; off≥30s→+40; ≥10s→+20; ≥3s→+10 |
| typing_risk   | WPM step function                                    | ≥250→90; ≥180→50                                            |
| idle_risk     | Idle gap + paste interaction                         | ≥60s+≥80paste→80; ≥8s+paste→50; ≥30s→30                     |
| affinity_risk | hostileCount > 0 → 100, else 0                       | Binary                                                      |
| helper_risk   | !connected AND sessionAge > 30s → 100, else 0        | Binary with 30s grace                                       |
| daemon_risk   | Passed from daemonProof validation                   | Computed externally                                         |
| session_risk  | reconnects ≥ 3 → 80; ≥ 2 → 40; else 0                | Step function                                               |

**Source:** `src/academic/riskScoring.js:20-75`
