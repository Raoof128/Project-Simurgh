# Phase 11: portable reproduction handoff

Declared 16 October 2026, while Phase 10 review is in progress. Execute after the
Phase 10 evidence publication commit exists. This is an additive documentation and
reproduction phase; no frozen harness or prior result changes.

Deliver a manifest pinning the publication commit, Phase 10 archive manifest root,
protocol and archive hashes, requirements files and verification entry point. Supply
commands for Linux x86_64/Python 3.12 that clone the pinned revision, create a new
virtual environment, install both hash-locked requirements files, check dependencies,
run focused tests and replay all 144 branches without model files or API keys.

Run those commands from a clean clone with a fresh virtual environment. Retain the
command outcomes, package inventory, revision, root, test count and replay receipt.
Check tracked status before and after. Record project-hosted CI separately when it
finishes. Local clean checkout and project CI do not establish outside operator custody.
Provide an explicitly unexecuted operator record for an external party's own evidence.

Write scope: `docs/research/handoff-phase-11/**`, current reviewer navigation and both
root logs. No new CI gate or runtime implementation is introduced. The existing frozen
Phase 10 verifier supplies exact inventory and non-vacuity checks. A future successor
adds a new namespace; corrections to frozen bytes require declared repair authority.

Acceptance: a complete 48-generation/144-branch/1,440-snapshot replay from a clean clone,
with exact published root, dependency check and focused tests; omitted evidence or
unknown prerequisite is never reported as a successful reproduction.
