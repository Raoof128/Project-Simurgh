#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5C VSB - Lane C Prompt Guard adapter (plan Task 13). Motto: AnthropicSafe First, then
# ReviewerSafe. NON-CI: imports torch/transformers; NEVER add to pytest or scripts/check.sh.
# A worked example of the BYO flagged(text) interface: wrap a real shipped guardrail (Meta Prompt
# Guard 86M) as a deterministic verdict at a pinned threshold. Not executed this build - the
# mechanism + interface ship; a real capture is the honest next increment (see README).
#
# Usage (offline, keyed, outside CI):
#   python3 promptguard-adapter.py --threshold 0.5 < prompts.jsonl
#
# The verdict log is sealed digest-only into the PUBLIC artifact; the raw prompts + mutated texts
# live only in the AUDIT-PRIVATE artifact (P0-5).


def flagged(text, model, tokenizer, threshold):
    """Return True iff Prompt Guard scores `text` as malicious at or above `threshold`.

    Deterministic given fixed weights + pinned threshold (fp determinism is hardware-bound, so the
    verdicts are hash-anchored in the log, not recomputed in CI).
    """
    import torch  # noqa: F401 - imported lazily, NON-CI only

    inputs = tokenizer(text, return_tensors="pt", truncation=True)
    with torch.no_grad():
        logits = model(**inputs).logits
    score = torch.softmax(logits, dim=-1)[0, -1].item()
    return score >= threshold


if __name__ == "__main__":
    raise SystemExit(
        "promptguard-adapter is a NON-CI worked example; run it offline with a real Prompt Guard "
        "checkpoint. See lanec/README.md for the audit-private / public two-artifact split."
    )
