#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5F VMP — Lane C merge (plan Task 18). Folds the per-member hash-bound fragments into the unified
# capture census over the SAME shared corpus, asserting both members saw the identical committed cases.
import json
import sys
from pathlib import Path


def merge(corpus_path, fragment_paths, out_path):
    corpus = json.loads(Path(corpus_path).read_text())
    case_ids = {c["case_id"] for c in corpus["cases"]}
    records = []
    for fp in fragment_paths:
        frag = json.loads(Path(fp).read_text())
        frag_cases = {c["case_id"] for c in frag["cells"]}
        if frag_cases != case_ids:
            print(f"FATAL: {frag['member_id']} did not evaluate the exact shared corpus", file=sys.stderr)
            sys.exit(1)
        for c in frag["cells"]:
            rid = f"rec-{frag['member_id']}-{c['case_id']}"
            records.append({"record_id": rid, "case_id": c["case_id"], "member_id": frag["member_id"], "status": c.get("status", "evaluated"), "attempt_id": f"att-{rid}", "detector_input_digest": c["detector_input_digest"]})
    census = {"schema": "simurgh.vmp.capture_census.v1", "records": records}
    Path(out_path).write_text(json.dumps(census, indent=2))
    print(f"[lanec/merge] wrote {out_path} ({len(records)} records over {len(case_ids)} shared cases)")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("usage: merge_capture_census.py <corpus.json> <out.json> <frag1.json> [frag2.json ...]", file=sys.stderr)
        sys.exit(2)
    merge(sys.argv[1], sys.argv[3:], sys.argv[2])
