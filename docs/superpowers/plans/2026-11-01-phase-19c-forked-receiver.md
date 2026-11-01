# Phase 19c implementation plan — forked receiver, credential lanes, approved-input manifest, route corpus, cumulative lane

**Date:** 1 November 2026 · **Design:** [Phase 19 v2.1](../specs/2026-11-01-phase-19-authority-provenance-design.md) §4.3, §4.5, §4.8, §4.10, §6 row 19c ·
**Baseline:** branch `phase-19/authority-provenance` @ `b7c7dd9d`.

Test-first. No frozen file is edited. The receiver is a fork of `tools/assurance-credentials/service.py`
(pinned by six protocols) inside the Phase 19 namespace; the archived Phases 8–17 never exercise
any reason it adds. Every lane is **receiver-direct**: the forked `Store` is driven in-process under
a fixed logical clock. The HTTP transport is not forked; this is stated in the results.

## Files

```
tools/assurance-provenance/
  receiver19.py          # Store19: the fork
  lanes19c.py            # credential, manifest, route, cumulative, admin_revoked lanes
  evidence19c.py         # protocol, run, verify, mutations
  tests/test_receiver19.py, tests/test_lanes19c.py, tests/test_evidence19c.py
docs/research/provenance-phase-19c/{protocol.json, report.json, evidence.zip, ROOT.sha256, receipt.json, RESULTS.md, README.md}
```

## Store19 (what the fork adds, each a named reason)

| Addition                                                                                                                                                                                                                                | Reason                         | Gap                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------- |
| `run` column on credentials; a credential presented for the same principal, tenant and resource but another run                                                                                                                         | `run`                          | rank 4 (planted token, same principal, other run)               |
| holder-bound sessions: login returns a holder secret; every send carries `proof = HMAC(holder, key)`; a bearer replayed without the holder proof, or from another holder                                                                | `wrong_binding`                | rank 4 (cross-binding replay, holder change, concurrent holder) |
| approved-input manifest: `load(secret, name, digest)` records a `loaded` effect only when the digest is listed                                                                                                                          | `substituted_input`            | rank 9, G28                                                     |
| two effect classes (`send_report`, `write_path`) with a receiver-side canonicaliser (case fold, percent-decode, dot-segment removal, duplicate-slash collapse, trailing-slash strip); per-credential allowlist of canonical effect keys | `effect_denied`                | rank 10 (route corpus)                                          |
| per-call and running limits on content bytes per credential                                                                                                                                                                             | `cumulative_limit_exceeded`    | rank 13                                                         |
| administrative revocation flag distinct from technical revocation                                                                                                                                                                       | `admin_revoked`                | rank 15 (authority lost, capability retained)                   |
| per-credential grant narrower than the credential scope                                                                                                                                                                                 | `grant_scope`                  | rank 4 (credential wider than authority)                        |
| revoked-credential retries counted in events                                                                                                                                                                                            | existing `credential_inactive` | rank 4 (B1-45)                                                  |

Frozen reasons (`request`, `session`, `session_inactive`, `scope`, `credential_inactive`,
`idempotency_conflict`) are kept in the same order; new checks run after `scope` and before the
effect insert.

## Lanes

1. **Credential lane**: planted token (other run, same principal) → `run`; other principal → `scope`
   (the frozen reason, reported as such); bearer replay without proof → `wrong_binding`; two holders
   → second `wrong_binding`; revoked then N retries → N × `credential_inactive`, counted; write under
   a comment-only grant → `grant_scope`; positive controls land.
2. **Manifest lane**: listed input loads; regenerated spec (digest differs) → `substituted_input`;
   edited config → `substituted_input`; the 31 Oct `vectors.npz` shape; positive control.
3. **Route corpus**: a denied canonical effect; lab-authored variants (case, percent-encoding, dot
   segments, duplicate slashes, trailing slash, `..` traversal, same destination by `write_path`
   versus `send_report` where the key differs by design) all → `effect_denied` at the forked
   receiver; the strawman `naive_string_filter_demo` (exact-bytes deny) admits at least one variant
   (power check). Non-claim: does not pay G22.
4. **Cumulative lane**: calls each under the per-call limit; the running sum crosses the running
   limit → `cumulative_limit_exceeded`; sub-limit calls still land.
5. **Admin-revoked lane**: `admin_revoked` set while the credential and session stay technically
   valid → `admin_revoked`; the same call before the flag lands.

Every lane records the frozen receiver's behaviour on the same bytes where it accepts them
(the frozen `Store` has no run, holder, manifest, canonicaliser, limits or admin flag), so each
reason is shown to be new, not relabelled.

## Gate for 19c

All named reasons fire exactly where specified; positive controls land; the strawman power check
passes; the frozen-receiver comparison rows are present; the pack verifies and rejects five named
mutations; `tree_state` names the lane commit.
