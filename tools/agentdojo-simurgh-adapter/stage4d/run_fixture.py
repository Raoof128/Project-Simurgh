# SPDX-License-Identifier: AGPL-3.0-or-later
"""Write Stage 4D structured run input for the Node pack builder."""

import argparse
import json
from pathlib import Path

from .mediator import build_run_record


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixture", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    record = build_run_record(args.fixture)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(record, indent=2, sort_keys=True) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
