# Experiment Matrix — MQ Persian Society Voting Pilot

**Version:** 2026-05-v1

## Functional tests

| ID  | Scenario                      | Expected result   | Evidence          |
| --- | ----------------------------- | ----------------- | ----------------- |
| F1  | Participant joins mock ballot | Session created   | Consent record    |
| F2  | Consent accepted              | Telemetry starts  | Consent timestamp |
| F3  | Consent declined              | No data collected | No server record  |
| F4  | Ballot page opened            | SDK active        | Session active    |
| F5  | Session submitted             | Report generated  | JSON report       |
| F6  | Audit chain exported          | Valid chain       | Verify output     |

## Security tests

| ID  | Scenario                                        | Expected result        | Severity |
| --- | ----------------------------------------------- | ---------------------- | -------- |
| S1  | Replay session token across sessions            | Reject (409)           | High     |
| S2  | Submit with forbidden ballot field              | 400 + field names only | High     |
| S3  | Request report for withdrawn session            | 403                    | High     |
| S4  | Request without pilot token                     | 401                    | High     |
| S5  | Double withdrawal                               | 409                    | Medium   |
| S6  | Token session ID does not match path session ID | 403                    | High     |

## Privacy tests

| ID  | Test                               | Pass condition |
| --- | ---------------------------------- | -------------- |
| P1  | No vote content in Simurgh logs    | Zero matches   |
| P2  | No candidate names in Simurgh logs | Zero matches   |
| P3  | No raw names/emails                | Zero matches   |
| P4  | No screen/webcam/audio fields      | Zero matches   |
| P5  | No raw process/window fields       | Zero matches   |
| P6  | Privacy audit script passes        | PASS           |
| P7  | Data export is de-identified       | PASS           |

## Usability targets (Phase C only)

| ID  | Metric                | Target       |
| --- | --------------------- | ------------ |
| U1  | Completion rate       | ≥ 80%        |
| U2  | Median setup time     | ≤ 5 minutes  |
| U3  | Consent understood    | ≥ 80% agree  |
| U4  | Privacy concern score | Low/moderate |
| U5  | Would use again       | ≥ 60% agree  |
