"""Source-bound complete replay of the kernel egress experiment."""

import argparse
import hashlib
import json
import sys
from pathlib import Path

from .harness import CASES, CONTROLS, ROOT, run_case
from .kernel import Refusal


def sources():
    paths = sorted((ROOT / "tools/assurance-egress").rglob("*.py"))
    paths += [
        ROOT / "tools/assurance-scope/simurgh_scope" / name
        for name in ("__init__.py", "broker.py")
    ]
    return {
        str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in paths
    }


def run():
    rows = [run_case(case, control) for case in CASES for control in CONTROLS]
    validate_baselines(rows)
    return {"schema": "simurgh-kernel-egress-v1", "sources": sources(), "rows": rows}


def validate_baselines(rows):
    baselines = {row["case"]: row for row in rows if row["control"] == "unfiltered"}
    network = set(CASES) - {
        "public_read",
        "approved_write",
        "inherited_socket",
        "filesystem_mailbox",
    }
    for case in network:
        row = baselines.get(case)
        expected = ["proxy", "proxy_relay"] if case == "proxy_relay" else [case]
        if (
            not row
            or row["observed"] != expected
            or row["service"] != {"outcome": "delivered", "errno": None}
            or row["broker"]["status"] != "completed"
        ):
            raise Refusal("missing usable baseline: " + case)


def check_shape(report):
    if not isinstance(report, dict) or set(report) != {"schema", "sources", "rows"}:
        raise Refusal("invalid report schema")
    if report["schema"] != "simurgh-kernel-egress-v1" or report["sources"] != sources():
        raise Refusal("schema/source mismatch")
    if not isinstance(report["rows"], list) or any(
        not isinstance(r, dict) for r in report["rows"]
    ):
        raise Refusal("invalid rows")
    if [(r.get("case"), r.get("control")) for r in report["rows"]] != [
        (c, m) for c in CASES for m in CONTROLS
    ]:
        raise Refusal("incomplete, reordered or duplicated matrix")


def verify(report):
    check_shape(report)
    if json.dumps(report, sort_keys=True) != json.dumps(run(), sort_keys=True):
        raise Refusal("observed replay differs")


def unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise Refusal("duplicate JSON key")
        result[key] = value
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("run").add_argument("--out", required=True)
    commands.add_parser("verify").add_argument("report")
    case = commands.add_parser("case")
    case.add_argument("name", choices=CASES)
    case.add_argument("control", choices=CONTROLS)
    args = parser.parse_args()
    try:
        if args.command == "case":
            print(json.dumps(run_case(args.name, args.control)))
        elif args.command == "run":
            path = Path(args.out)
            if path.exists():
                raise Refusal("refusing output overwrite")
            report = run()
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("x") as output:
                output.write(json.dumps(report, indent=2) + "\n")
            print(f"wrote {len(report['rows'])} rows: {path}")
        else:
            verify(json.loads(Path(args.report).read_text(), object_pairs_hook=unique))
            print("verified all 36 rows against local service observations")
    except (Refusal, OSError, ValueError) as exc:
        print("refused: " + str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
