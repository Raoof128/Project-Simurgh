# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5B VAR — Lane C grounded-red-team ceremony (plan Task 2). OFFLINE, digest-only, NEVER
# CI-gated. Harness shipped; the real 1B capture is a closeout-window action on commodity
# hardware (README.md). --dry-run prints the ordered ceremony + frozen rails without a model, so
# the runbook is checkable CI-free. Motto: AnthropicSafe First, then ReviewerSafe.
import argparse
import sys

RAILS = [
    "benign_pinned_corpus_only",
    "detection_side_lexicon_only",
    "no_elicitation_no_honeypots_no_misaligned_organisms",
    "capture_never_ci_gated",
    "no_evasion_search",
    "the_attacked_capture_is_adversary_independent_no_author_s_map",
]

STEPS = [
    "sign the 4Z declaration (lexicon + theta_nano + total position rule + layer set)",
    "sign the VAR charter: campaign_seed + family_counts + attack_manifest_root + caps, BINDING "
    "the declaration_digest (NEVER a tensor-commitment root — that would be reading the map)",
    "capture: run capture-workspace-readout.py on Llama-3.2-1B-Instruct (pinned rev), CPU float32",
    "MEASURE byte-stability: capture twice, cmp; if unstable, hash-anchor + sign the limitation",
    "narrative half (same session): benign post-task introspection -> 4W span-typed narrative",
    "run the 46-attack corpus at the frozen 4V-5A verifiers against the REAL precommitted readout",
    "assemble findings + attestation; evaluateVar at both tiers; recompute ASR + floor reconciliation",
    "seal BOTH outcomes (captured | capture_failed); never re-run until it looks good",
]


def dry_run():
    print("Stage 5B VAR — Lane C grounded-red-team ceremony (DRY RUN, no model)")
    print("Frozen rails:")
    for r in RAILS:
        print("  - %s" % r)
    print("Ordered steps (charter binds the declaration BEFORE the map is revealed):")
    for i, s in enumerate(STEPS, 1):
        print("  %d. %s" % (i, s))
    print("Status: harness shipped; real 1B capture NOT executed in this build.")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    if args.dry_run:
        sys.exit(dry_run())
    print("Real capture needs a pinned model host (see README.md). Use --dry-run for the runbook.")
    sys.exit(2)
