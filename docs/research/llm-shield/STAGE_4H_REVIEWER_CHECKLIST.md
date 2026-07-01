# Stage 4H Reviewer Checklist

Run the one-command reproduction:

```bash
scripts/reproduce-llm-shield-stage4h.sh
```

Expected result: clean typed exit `0` and `Stage 4H.5 final reproduce: PASS`.

## T1-T6 Checks

| Check                          | Expected result                                | Evidence                              |
| ------------------------------ | ---------------------------------------------- | ------------------------------------- |
| T1 clean reproduce             | typed `0`, raw `0`                             | `reproduce-summary.json`              |
| T2 premise digest flip         | typed `1` via raw `22`                         | reviewer smoke in `reproduce.test.js` |
| T3 signature corruption        | typed `1` via raw `25`                         | reviewer smoke in `reproduce.test.js` |
| T4 egress double               | typed `2` via raw `28`                         | `offline-report.json`                 |
| T5 proof deletion              | typed `1` via raw `26` or `24`, never raw `25` | `closeout.test.js`                    |
| T6 Q7 privacy budget violation | typed `1` via raw `27`                         | reviewer smoke in `reproduce.test.js` |

## Q Gates

Q0, Q1, Q2, Q3, Q4, Q5, Q6, and Q7 are all represented in `q-gate-results.json`.

## Non-Claims

The reviewer should treat Stage 4H as not kernel sandboxing, not model safety, not execution truth, not implicit-flow security, and not multi-field collusion closure.
