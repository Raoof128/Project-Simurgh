"""Lane 19ag: a stricter check of a pack than its verifier makes without a replay
(P19-GUARD02 and its two amendments).

``evidence19ag.py verify`` is pinned by the lane's own pack. Without ``--replay`` it checks
each row's identity against the seats' files, that each recorded outcome has the declared
shape and agrees with its own flags, that the summary and the hypotheses follow from the
rows, and the file hashes. It does not compare four other parts of ``report.json`` with the
lane's module: the arm, the ``model_inference`` flag, the list of non-claims and the set of
field names. Nor does it ask that the bytes of the report and of the two sidecars are the
lane's canonical form, so a key written twice is read as its last value. This runs that
verifier unchanged and then checks those things. It reads only the pack.

What neither tool checks without a replay: it runs no gate, so a recorded outcome is not
compared with what the gate does. A copy with outcomes rewritten consistently is accepted by
both under the copy's own root. The committed root refuses it, and so does ``--replay``.

Standard library only::

    python -B tools/assurance-provenance/strict19ag.py \\
      docs/research/provenance-phase-19ag/evidence.zip \\
      --expected-root "$(cat docs/research/provenance-phase-19ag/ROOT.sha256)"

It prints the verifier's receipt with one more field, ``"report_fields": "compared"``. A
pack the verifier refuses is refused here with the same reason.
"""

import argparse
import json
import sys
from pathlib import Path

import evidence19ag as ev
from projection import loads, read_pack, wire

# What ``evidence19ag.build_report`` writes, and the digest ``run`` adds to it.
FIELDS = frozenset(
    {
        "schema",
        "arm",
        "attempt_files",
        "rows",
        "summary",
        "hypotheses",
        "model_inference",
        "non_claims",
        "protocol_sha256",
    }
)


def declared():
    """The parts of a report that the lane's module fixes and the verifier does not compare."""
    return {
        "schema": ev.SCHEMA,
        "arm": ev.ARM,
        "model_inference": False,
        "non_claims": list(ev.NON_CLAIMS),
    }


def verify(pack, expected_root, *, protocol=None):
    receipt = ev.verify(pack, expected_root, protocol=protocol)
    files = read_pack(Path(pack), expected_root)
    raw = files["report.json"]
    report = loads(raw)
    if wire(report) != raw:
        raise ValueError("report_bytes")
    for name in sorted(ev.SIDECARS):
        if wire(loads(files[name])) != files[name]:
            raise ValueError("sidecar_bytes:" + name)
    for key, value in declared().items():
        if key not in report or wire(report[key]) != wire(value):
            raise ValueError("report_field:" + key)
    if set(report) != FIELDS:
        raise ValueError("report_fields")
    return {**receipt, "report_fields": "compared"}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("pack", type=Path)
    parser.add_argument("--expected-root", required=True)
    parser.add_argument("--protocol", type=Path, default=None)
    args = parser.parse_args(argv)
    try:
        receipt = verify(args.pack, args.expected_root, protocol=args.protocol)
    except Exception as error:  # any failure to check is a refusal
        # one line, as an operator reads it: the reason the pack is refused
        print(f"refused: {type(error).__name__}: {error}", file=sys.stderr)
        return 1
    print(json.dumps(receipt, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
