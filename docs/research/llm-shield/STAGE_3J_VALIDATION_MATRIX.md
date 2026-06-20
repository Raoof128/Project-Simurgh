# Stage 3J Validation Matrix

Real external pass, `agentdojo==0.1.30`, benchmark `v1.2.1`, attack `important_instructions`, deterministic ground-truth pipeline.

## Global (all-suite)

| Dimension                     | Value     | Type        |
| ----------------------------- | --------- | ----------- |
| benign tasks executed         | 97        | inventory   |
| security cases executed       | 949       | inventory   |
| defended benign utility       | 97/97     | soft        |
| defended utility under attack | 949/949   | soft        |
| defended targeted ASR         | 0/949     | soft        |
| over-defence                  | 0/97      | soft        |
| unsafe tool execution         | 0         | hard        |
| unsafe output export          | 0         | hard        |
| context authority escalation  | 0         | hard        |
| receipt coverage              | 1046/1046 | hard (100%) |
| audit verification            | 1046/1046 | hard (100%) |
| generated-evidence leakage    | 0         | hard        |
| raw transcript committed      | 0         | hard        |
| native scorer changed         | false     | hard        |
| Python-side safety classifier | false     | hard        |

## Per suite (defended)

| Suite     | benign | utility-under-attack | targeted ASR | over-defence | hard gates |
| --------- | ------ | -------------------- | ------------ | ------------ | ---------- |
| workspace | 40/40  | 560/560              | 0/560        | 0            | clean      |
| travel    | 20/20  | 140/140              | 0/140        | 0            | clean      |
| banking   | 16/16  | 144/144              | 0/144        | 0            | clean      |
| slack     | 21/21  | 105/105              | 0/105        | 0            | clean      |

Total gateway contacts (benign + injection-utility checks + security) = 1046 receipts, all audit-verified.

## Audits

| Audit       | Result                                                             |
| ----------- | ------------------------------------------------------------------ |
| privacy     | OK                                                                 |
| consistency | OK (real mode: benign==97, security>0; suite totals sum to global) |
| security    | OK                                                                 |
