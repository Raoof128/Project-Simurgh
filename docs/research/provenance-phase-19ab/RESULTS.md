# Phase 19ab results: changed bodies of a delegated or approved action

Pack root `67d1029539c921f772229731779e8c4fd0a1297c07f422e138b03ca967bdaade`. 69 attempts on the sealed gate of lane 19z: 64 changed bodies and 5 bodies that are unchanged as values. On route `a` the body takes the place of the delegated action; on route `b` it takes the place of an action the host approved, with the approval. No model is a target and no model wrote a body.

## 1. Hypotheses, decided by rule

|     | Declared                                                                         | Observed                                      | Holds |
| --- | -------------------------------------------------------------------------------- | --------------------------------------------- | ----- |
| B1  | no changed body is observed                                                      | 64 changed bodies, observed 0                 | yes   |
| B2  | every payload at the receiver is the unchanged action's                          | 69 payloads, 0 other                          | yes   |
| B3  | after a refused changed body on route `a`, the unchanged action is observed      | 47 refused, then observed in 47               | yes   |
| B4  | on route `b` the approval is refused for the changed body and then honoured once | 17 changed, refused 17, then honoured once 17 | yes   |
| B5  | no attempt latches the seal or raises                                            | latched 0, raised 0                           | yes   |

Reported and not a hypothesis: 5 of the 5 unchanged bodies are observed, including the ones written with their keys in another order. The most effects in any attempt: 1.

## 2. The pipeline's reasons, summed over all attempts

| Reason                            | Count |
| --------------------------------- | ----- |
| `approval_admitted`               | 19    |
| `approval_denied:approval_action` | 1     |
| `approval_denied:approval_digest` | 15    |
| `approval_denied:approval_replay` | 2     |
| `approval_denied:approval_run`    | 1     |

A changed body on route `a` carries no approval, so the frozen gate refuses it before the approval check and it has no reason here; it is counted in the `blocked` events.

## 3. Every attempt

The note is the author's. The bodies are in the file in the pack.

| Position | Route | Changed | Body dispatched | Unchanged action after it | Effects | Approval refused as | Note                                                              |
| -------- | ----- | ------- | --------------- | ------------------------- | ------- | ------------------- | ----------------------------------------------------------------- |
| 0        | `a`   | no      | observed        | observed                  | 1       | none                | The delegated action as it is: the baseline.                      |
| 1        | `a`   | yes     | blocked         | observed                  | 1       | none                | The other action's content under the delegated name.              |
| 2        | `a`   | yes     | blocked         | observed                  | 1       | none                | The delegated content with a second instruction appended.         |
| 3        | `a`   | yes     | blocked         | observed                  | 1       | none                | Empty content.                                                    |
| 4        | `a`   | yes     | blocked         | observed                  | 1       | none                | The delegated content followed by 2,700 more characters.          |
| 5        | `a`   | yes     | blocked         | observed                  | 1       | none                | Another resource.                                                 |
| 6        | `a`   | yes     | blocked         | observed                  | 1       | none                | Another operation.                                                |
| 7        | `a`   | yes     | blocked         | observed                  | 1       | none                | Another principal.                                                |
| 8        | `a`   | yes     | blocked         | observed                  | 1       | none                | Another tenant.                                                   |
| 9        | `a`   | yes     | blocked         | observed                  | 1       | none                | Another policy revision.                                          |
| 10       | `a`   | yes     | blocked         | observed                  | 1       | none                | Another run.                                                      |
| 11       | `a`   | yes     | blocked         | observed                  | 1       | none                | The undelegated action's name with the delegated content.         |
| 12       | `a`   | yes     | blocked         | observed                  | 1       | none                | The undelegated action as it is, with no approval.                |
| 13       | `a`   | yes     | blocked         | observed                  | 1       | none                | A name the fixture does not have.                                 |
| 14       | `a`   | yes     | blocked         | observed                  | 1       | none                | One added field.                                                  |
| 15       | `a`   | yes     | blocked         | observed                  | 1       | none                | An added field holding a list.                                    |
| 16       | `a`   | yes     | blocked         | observed                  | 1       | none                | An added field whose name is 'content' and a space.               |
| 17       | `a`   | yes     | blocked         | observed                  | 1       | none                | An added field whose name is 'Content'.                           |
| 18       | `a`   | yes     | blocked         | observed                  | 1       | none                | The delegated action without its content field.                   |
| 19       | `a`   | yes     | blocked         | observed                  | 1       | none                | The delegated action without its policyRevision field.            |
| 20       | `a`   | yes     | blocked         | observed                  | 1       | none                | The delegated action without its principal field.                 |
| 21       | `a`   | yes     | blocked         | observed                  | 1       | none                | The delegated action without its tenant field.                    |
| 22       | `a`   | yes     | blocked         | observed                  | 1       | none                | The delegated action without its resource field.                  |
| 23       | `a`   | yes     | blocked         | observed                  | 1       | none                | The delegated action without its operation field.                 |
| 24       | `a`   | yes     | blocked         | observed                  | 1       | none                | The delegated action without its run field.                       |
| 25       | `a`   | yes     | blocked         | observed                  | 1       | none                | Only the name.                                                    |
| 26       | `a`   | yes     | blocked         | observed                  | 1       | none                | An empty body.                                                    |
| 27       | `a`   | yes     | blocked         | observed                  | 1       | none                | The content with a capital letter.                                |
| 28       | `a`   | yes     | blocked         | observed                  | 1       | none                | The content with a trailing space.                                |
| 29       | `a`   | yes     | blocked         | observed                  | 1       | none                | The content with a leading space.                                 |
| 30       | `a`   | yes     | blocked         | observed                  | 1       | none                | The content with a no-break space in place of the space.          |
| 31       | `a`   | yes     | blocked         | observed                  | 1       | none                | The content with a fullwidth first letter (a compatibility form). |
| 32       | `a`   | yes     | blocked         | observed                  | 1       | none                | The content with a zero-width space inside.                       |
| 33       | `a`   | yes     | blocked         | observed                  | 1       | none                | The content with a Cyrillic letter that looks like the Latin one. |
| 34       | `a`   | yes     | blocked         | observed                  | 1       | none                | The content with a combining accent on the last letter.           |
| 35       | `a`   | yes     | blocked         | observed                  | 1       | none                | The content with a trailing newline.                              |
| 36       | `a`   | yes     | blocked         | observed                  | 1       | none                | The content with a trailing NUL.                                  |
| 37       | `a`   | yes     | blocked         | observed                  | 1       | none                | The name with a trailing space.                                   |
| 38       | `a`   | yes     | blocked         | observed                  | 1       | none                | The name in capitals.                                             |
| 39       | `a`   | yes     | blocked         | observed                  | 1       | none                | The principal with a capital letter.                              |
| 40       | `a`   | yes     | blocked         | observed                  | 1       | none                | The content as a list of one string.                              |
| 41       | `a`   | yes     | blocked         | observed                  | 1       | none                | The content as an object.                                         |
| 42       | `a`   | yes     | blocked         | observed                  | 1       | none                | The content as null.                                              |
| 43       | `a`   | yes     | blocked         | observed                  | 1       | none                | The content as a number.                                          |
| 44       | `a`   | yes     | blocked         | observed                  | 1       | none                | The content as true.                                              |
| 45       | `a`   | yes     | blocked         | observed                  | 1       | none                | The name as a list.                                               |
| 46       | `a`   | yes     | blocked         | observed                  | 1       | none                | The run as a number.                                              |
| 47       | `a`   | yes     | blocked         | observed                  | 1       | none                | The policy revision as a number.                                  |
| 48       | `a`   | no      | observed        | observed                  | 1       | none                | The delegated action with its keys in reverse order.              |
| 49       | `a`   | no      | observed        | observed                  | 1       | none                | The delegated action with its keys sorted.                        |
| 50       | `b`   | no      | observed        | blocked                   | 1       | `approval_replay` 1 | The approved action as it is: the baseline for route b.           |
| 51       | `b`   | yes     | blocked         | observed                  | 1       | `approval_digest` 1 | The approved content with a second instruction appended.          |
| 52       | `b`   | yes     | blocked         | observed                  | 1       | `approval_digest` 1 | The delegated action's content under the approved name.           |
| 53       | `b`   | yes     | blocked         | observed                  | 1       | `approval_digest` 1 | Another resource under the approval.                              |
| 54       | `b`   | yes     | blocked         | observed                  | 1       | `approval_digest` 1 | Another operation under the approval.                             |
| 55       | `b`   | yes     | blocked         | observed                  | 1       | `approval_digest` 1 | Another principal under the approval.                             |
| 56       | `b`   | yes     | blocked         | observed                  | 1       | `approval_digest` 1 | Another tenant under the approval.                                |
| 57       | `b`   | yes     | blocked         | observed                  | 1       | `approval_digest` 1 | Another policy revision under the approval.                       |
| 58       | `b`   | yes     | blocked         | observed                  | 1       | `approval_run` 1    | Another run under the approval.                                   |
| 59       | `b`   | yes     | blocked         | observed                  | 1       | `approval_action` 1 | A name the fixture does not have, with the approval.              |
| 60       | `b`   | yes     | blocked         | observed                  | 1       | `approval_digest` 1 | One added field under the approval.                               |
| 61       | `b`   | yes     | blocked         | observed                  | 1       | `approval_digest` 1 | The approved action without its content field.                    |
| 62       | `b`   | yes     | blocked         | observed                  | 1       | `approval_digest` 1 | The approved action without its policy revision.                  |
| 63       | `b`   | yes     | blocked         | observed                  | 1       | `approval_digest` 1 | The approved content with a trailing space.                       |
| 64       | `b`   | yes     | blocked         | observed                  | 1       | `approval_digest` 1 | The approved content with a zero-width space inside.              |
| 65       | `b`   | yes     | blocked         | observed                  | 1       | `approval_digest` 1 | The approved content with a capital letter.                       |
| 66       | `b`   | yes     | blocked         | observed                  | 1       | `approval_digest` 1 | The approved content as a list of one string.                     |
| 67       | `b`   | yes     | blocked         | observed                  | 1       | `approval_digest` 1 | The approved content as null.                                     |
| 68       | `b`   | no      | observed        | blocked                   | 1       | `approval_replay` 1 | The approved action with its keys in reverse order.               |

## 4. What this does not show

- The gate binds what the body is and cannot judge what it means: an allowed body that does harm is outside this lane.
- A third party that acts on an allowed request, which is the rest of what laundering names, is not measured.
- A list of bodies the author wrote, on a fixture with two actions; nothing here is evidence about what a model or an attacker would try.
- The bodies are JSON objects handed to the gate by the host; a caller that builds the action some other way is outside it.
- The gate is lane 19z's sealed, repaired gate beside the gate that lanes 19a to 19y measured.
- No model is a target and no model's behaviour is measured.
