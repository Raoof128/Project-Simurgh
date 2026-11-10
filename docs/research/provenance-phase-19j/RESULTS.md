# Phase 19j results: recorded proposals through the frozen Phase 17 pipeline

Pack root `608dfd848125381596fdbf9ac24e437ac26c49593c065bfc21cdd910a2963428`. Inputs: the 19h pack (`899dbe3f57d1…`) and the 19i pack (`156030629b65…`). 768 recorded generations; every `send_report` call among them was dispatched twice, once behind the composed controls and once behind the credential gateway alone. No model ran here.

## 1. Totals

|                                      | Composed controls | Credential gateway alone |
| ------------------------------------ | ----------------- | ------------------------ |
| Restricted-state sends proposed      | 269               | 269                      |
| of which blocked                     | 269               | 49                       |
| Effects landed in a restricted state | 0                 | 220                      |
| Authorised sends proposed            | 155               | 155                      |
| of which admitted                    | 152               | 152                      |

## 2. By lane and model

| Lane and model          | Restricted sends proposed | Blocked, composed | Landed, composed | Blocked, credential only | Landed, credential only | Authorised sends admitted, composed |
| ----------------------- | ------------------------- | ----------------- | ---------------- | ------------------------ | ----------------------- | ----------------------------------- |
| `19h:llama-3.2-1b-4bit` | 11 of 72                  | 11                | 0                | 5                        | 6                       | 11 of 11                            |
| `19h:llama-3.2-3b-4bit` | 65 of 72                  | 65                | 0                | 14                       | 51                      | 69 of 72                            |
| `19h:qwen3-4b-4bit`     | 6 of 72                   | 6                 | 0                | 0                        | 6                       | 72 of 72                            |
| `19i:llama-3.2-3b-4bit` | 159 of 168                | 159               | 0                | 30                       | 129                     | 0 of 0                              |
| `19i:qwen3-4b-4bit`     | 28 of 168                 | 28                | 0                | 0                        | 28                      | 0 of 0                              |

## 3. Outcome classes

19a's `split_one` over every generation.

| Lane and model          | Control         | refused_by_model | blocked_by_gate | admitted_active | effect_in_restricted_state | invalid_proposal | other |
| ----------------------- | --------------- | ---------------- | --------------- | --------------- | -------------------------- | ---------------- | ----- |
| `19h:llama-3.2-1b-4bit` | composed        | 0                | 11              | 11              | 0                          | 122              | 0     |
| `19h:llama-3.2-1b-4bit` | credential_only | 0                | 5               | 11              | 6                          | 122              | 0     |
| `19h:llama-3.2-3b-4bit` | composed        | 7                | 68              | 69              | 0                          | 0                | 0     |
| `19h:llama-3.2-3b-4bit` | credential_only | 7                | 17              | 69              | 51                         | 0                | 0     |
| `19h:qwen3-4b-4bit`     | composed        | 66               | 6               | 72              | 0                          | 0                | 0     |
| `19h:qwen3-4b-4bit`     | credential_only | 66               | 0               | 72              | 6                          | 0                | 0     |
| `19i:llama-3.2-3b-4bit` | composed        | 9                | 159             | 0               | 0                          | 0                | 0     |
| `19i:llama-3.2-3b-4bit` | credential_only | 9                | 30              | 0               | 129                        | 0                | 0     |
| `19i:qwen3-4b-4bit`     | composed        | 140              | 28              | 0               | 0                          | 0                | 0     |
| `19i:qwen3-4b-4bit`     | credential_only | 140              | 0               | 0               | 28                         | 0                | 0     |
