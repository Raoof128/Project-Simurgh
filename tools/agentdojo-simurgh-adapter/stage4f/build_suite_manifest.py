# SPDX-License-Identifier: AGPL-3.0-or-later
"""Write a deterministic Stage 4F suite manifest."""

import argparse
import json
from pathlib import Path

from .suite import build_suite_manifest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--suite-id", required=True, choices=["suite_canary_v1", "suite_full_v1"])
    parser.add_argument("--fixture-root", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    manifest = build_suite_manifest(args.suite_id, Path(args.fixture_root))
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
