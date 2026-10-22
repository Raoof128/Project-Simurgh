"""Complete source-bound replay; unsupported baselines never count as protection."""

import argparse
import hashlib
import json
import sys
from pathlib import Path

from .harness import ATTACKS, CASES, CONTROLS, HYGIENE, NEGATIVE, ROOT, USEFUL, run_case
from .kernel import Refusal
from .protocol import unique, validate_worker
from .worker import CANARY


def sources():
    paths = sorted((ROOT / "tools/assurance-isolation").rglob("*.py"))
    paths += [
        ROOT / "tools/assurance-scope/simurgh_scope" / name
        for name in ("__init__.py", "broker.py")
    ]
    return {
        str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in paths
    }


def validate_results(rows):
    if [(r.get("case"), r.get("control")) for r in rows] != [
        (c, m) for c in CASES for m in CONTROLS
    ]:
        raise Refusal("incomplete, duplicate or reordered matrix")
    for row in rows:
        case, control = row["case"], row["control"]
        if row["worker"] is not None:
            validate_worker(row["worker"], case)
        expected = control != "deny_all" and (
            case in USEFUL + NEGATIVE or (control == "baseline" and case in ATTACKS)
        )
        if row["effect"] is not expected:
            raise Refusal("missing expected observation: " + case + "/" + control)
        if expected != (row["broker"]["status"] == "completed"):
            raise Refusal("broker/result mismatch")
        outcome = (
            "delivered" if expected else "closed" if case in HYGIENE else "blocked"
        )
        worker = (
            None
            if control == "deny_all"
            else {
                "outcome": outcome,
                "errno": None if expected else 9 if case in HYGIENE else 1,
                "data": CANARY.decode() if case == "file_read" and expected else None,
            }
        )
        if row["worker"] != worker:
            raise Refusal("unexpected worker outcome: " + case + "/" + control)


def run():
    rows = [run_case(case, control) for case in CASES for control in CONTROLS]
    validate_results(rows)
    return {
        "schema": "simurgh-descriptor-isolation-v1",
        "sources": sources(),
        "rows": rows,
    }


def check_shape(report):
    if not isinstance(report, dict) or set(report) != {"schema", "sources", "rows"}:
        raise Refusal("invalid report shape")
    if (
        report["schema"] != "simurgh-descriptor-isolation-v1"
        or report["sources"] != sources()
    ):
        raise Refusal("schema/source mismatch")
    if not isinstance(report["rows"], list) or any(
        not isinstance(r, dict) for r in report["rows"]
    ):
        raise Refusal("invalid rows")
    if [(r.get("case"), r.get("control")) for r in report["rows"]] != [
        (c, m) for c in CASES for m in CONTROLS
    ]:
        raise Refusal("incomplete, duplicate or reordered matrix")


def verify(report):
    check_shape(report)
    if json.dumps(report, sort_keys=True) != json.dumps(run(), sort_keys=True):
        raise Refusal("observed replay differs")


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
            print("verified all 57 rows against fresh file/network/signal observations")
    except (Refusal, OSError, ValueError) as exc:
        print("refused: " + str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
