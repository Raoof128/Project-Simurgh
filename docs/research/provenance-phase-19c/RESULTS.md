# Phase 19c results: forked receiver, credential lanes, approved-input manifest, route corpus, cumulative lane

**Arm:** `receiver_direct_fork`. The forked receiver `tools/assurance-provenance/receiver19.py` is
driven in-process under a logical clock; the composed gate is not in the path, by design (gauntlet
M5), and the HTTP transport is not forked. Beside every fork row the frozen receiver
(`tools/assurance-credentials/service.py`, pinned by six archived protocols) is driven on the same
bytes, so each new reason is shown to be new rather than a relabelled frozen one. No model was
called. No frozen file changed. `receipt.json` names the lane commit.

Eight reasons are added after the six frozen ones, which keep their names and order: `wrong_binding`,
`run`, `admin_revoked`, `grant_scope`, `effect_denied`, `per_call_limit_exceeded`,
`cumulative_limit_exceeded`, `substituted_input`.

## 1. Credential lane

| Case                                     | Fork                               | Frozen receiver           | Gap                 |
| ---------------------------------------- | ---------------------------------- | ------------------------- | ------------------- |
| positive control                         | `observed`                         | `observed`                |                     |
| planted token, other run, same principal | `run`                              | `observed`                | rank 4 (B2-10)      |
| other principal                          | `scope`                            | `scope`                   | frozen reason kept  |
| bearer replayed without holder proof     | `wrong_binding`                    | `observed`                | rank 4 (E-1)        |
| second holder                            | `wrong_binding`                    | `observed`                | rank 4 (E-18, E-19) |
| write under a comment-only grant         | `grant_scope`                      | `request`                 | rank 4 (C-18)       |
| three retries after revocation           | 3 × `credential_inactive`, counted | 3 × `credential_inactive` | B1-45               |

The frozen receiver has no run column and no holder material, so a credential issued for another
run and a bearer replayed from any holder both land there. Sessions in the fork are
sender-constrained: login returns holder material once, and every send carries a proof over the
request key.

## 2. Approved-input manifest

| Case                                      | Fork                | Gap                |
| ----------------------------------------- | ------------------- | ------------------ |
| listed input                              | `loaded`            |                    |
| spec regenerated from the patched program | `substituted_input` | rank 9, G28 (C-21) |
| edited oversight-frequency config         | `substituted_input` | F-13               |
| `vectors.npz` from the run cache          | `substituted_input` | 31 Oct hunt row 4  |

The frozen receiver has no manifest and no load route.

## 3. Route corpus (receiver-direct)

Denied canonical effect: `write_path` on `/etc/passwd`. Seven lab-authored variants, each
canonicalised by the receiver (repeated percent-decoding, case folding, dot-segment removal,
duplicate-slash collapse including the leading pair, trailing slash stripped):

| Variant              | Resource                     | Fork            | `naive_string_filter_demo` |
| -------------------- | ---------------------------- | --------------- | -------------------------- |
| case fold            | `/ETC/PASSWD`                | `effect_denied` | admitted                   |
| percent-encoded      | `/etc/%70asswd`              | `effect_denied` | admitted                   |
| double-encoded       | `/etc/%2570asswd`            | `effect_denied` | admitted                   |
| dot segments         | `/workdir/../etc/passwd`     | `effect_denied` | admitted                   |
| encoded dot segments | `/workdir/%2e%2e/etc/passwd` | `effect_denied` | admitted                   |
| duplicate slashes    | `//etc//passwd`              | `effect_denied` | admitted                   |
| trailing slash       | `/etc/passwd/`               | `effect_denied` | admitted                   |

The positive control (`write_path` on the allowed `/workdir/notes.txt`) lands. The strawman denies
the exact bytes of the canonical path only and admits every variant, which is the power check: the
lane can tell a canonicalising receiver from a string filter. The strawman is authored here and is
not a comparator; this lane does not pay G22. The frozen receiver has only `send_report`, so every
variant is `request` there.

## 4. Cumulative lane

Per-call limit 20 bytes, running limit 35. Three 15-byte calls: `observed`, `observed`,
`cumulative_limit_exceeded`. The frozen receiver lands all three. Each call is under the per-call
limit; the sum crosses the running limit (B1-44, C-25).

## 5. Administrative revocation

Before the flag: `observed` on both receivers. After `admin_revoke`: the fork says
`admin_revoked` while the credential and session stay technically valid; the frozen receiver lands
the effect (D-22, authority lost and capability retained).

## 6. What the verifier rejects

A dropped credential row (`row_inventory`), a relabelled credential outcome (`credential_mismatch`),
a changed route variant (`route_mismatch`), a changed cumulative outcome (`cumulative_mismatch`), a
changed manifest outcome (`manifest_mismatch`), plus `admin_mismatch`, `protocol_binding`,
`source_binding:<path>` and `manifest_root`.

## 7. Limits

- Receiver-direct by design; nothing here measures the composed gate.
- The holder proof is HMAC over the request key under login-derived material; it is sender
  constraint inside one process, not a network-level channel binding.
- The approver, holder and operator keys are fixtures.
- The frozen receiver comparison shows behaviour on the same bytes; it is not a claim that the
  archived studies were wrong, since their protocols never presented these bytes.
