# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5A VNC — Lane C conflict ceremony (plan Task 14). OFFLINE, digest-only, NEVER CI-gated.
# Harness shipped; the real GPU capture is a closeout-window action (see README.md). The
# --dry-run path prints the ordered ceremony + the frozen rails without touching a GPU, so the
# runbook and the rails are checkable in CI-free form. Motto: AnthropicSafe First, then
# ReviewerSafe.
import argparse
import sys

RAILS = [
    "no_elicitation_no_honeypots_no_misaligned_organisms",
    "detection_side_lexicon_only",
    "benign_pinned_corpus_only",
    "capture_never_ci_gated",
    "no_evasion_search",
]

STEPS = [
    "sign the 4Z declaration (lexicon + theta_nano + total position rule + layer set)",
    "readout half: run the 4Z capture on Llama-3.2-1B-Instruct (pinned rev); salted commitments",
    "narrative half (same session): benign post-task introspection -> 4W span-typed narrative",
    "author + SIGN the claim table BEFORE deriving the map (binds narrative + declaration digest)",
    "derive the map, build the ledger, attest; evaluateVnc at both tiers",
    "seal BOTH outcomes (captured | capture_failed); never re-run until it looks good",
]


def dry_run():
    print("Stage 5A VNC — Lane C ceremony (DRY RUN, no GPU)")
    print("Frozen rails:")
    for r in RAILS:
        print(f"  - {r}")
    print("Ordered steps (Law 3: claim table signed BEFORE the map is revealed):")
    for i, s in enumerate(STEPS, 1):
        print(f"  {i}. {s}")
    print("Status: harness shipped; real capture NOT executed in this build.")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    if args.dry_run:
        sys.exit(dry_run())
    print("Real capture requires a pinned GPU host; see README.md. Use --dry-run for the runbook.")
    sys.exit(2)
