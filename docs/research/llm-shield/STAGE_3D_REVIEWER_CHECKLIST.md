<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Stage 3D — Reviewer Checklist

```
[ ] Stage does not claim jailbreak immunity.
[ ] Stage does not claim live-provider safety.
[ ] Stage uses the mock provider only (no live LLM call).
[ ] Stage uses mock tools only and never executes a tool.
[ ] Context guard prevents untrusted context from becoming instruction authority.
[ ] Tool gate blocks unsafe + unknown tool classes before execution.
[ ] Output firewall blocks suspected hidden-policy/secret leakage before export.
[ ] Blocked output is hashed, never stored or echoed.
[ ] Receipts are metadata-only (hashes + enum codes; no raw text).
[ ] Raw input/context/tool-args/output appear only in fixtures.
[ ] Plain { input } requests keep the 3A/3B/3C path and the v1/3C receipt.
[ ] HTTP route rejects mock_provider_output; unknown scenario rejected.
[ ] Audit chain verifies after accepted, demoted, rejected, tool-blocked, output-blocked paths.
[ ] Stage 3A smoke still passes.
[ ] Stage 3B frozen benchmark still passes (no drift).
[ ] Privacy audit passes (3A and 3D).
[ ] Security audit passes (3A and 3D).
[ ] Docs include the threat model, limitations, and non-claims.
```

How to verify: run the closeout command block in `STAGE_3D_CLOSEOUT.md`.
