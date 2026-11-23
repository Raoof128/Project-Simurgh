"""Phase 19ag: the results page, written from the pack's report (P19-GUARD01).

Every number on ``docs/research/provenance-phase-19ag/RESULTS.md`` comes from ``report.json``
through this file; none is typed by hand. The committed page is this output after the
repository's Markdown formatter, which pads tables and escapes ``*`` and ``_``. A test holds
the page to this output with that formatting set aside.

Standard library only::

    python -B tools/assurance-provenance/results19ag.py           # print the page
    python -B tools/assurance-provenance/results19ag.py --check   # fail if the page differs
"""

import json
import re
import sys
from pathlib import Path

DOCS = Path(__file__).resolve().parents[2] / "docs/research/provenance-phase-19ag"
# The model that served each seat, read from the harness's record of the agent. It is not in
# the pack: a seat's file holds attempts and names no model.
SEAT_MODELS = {
    "seat-a": "Claude Opus 5.5",
    "seat-b": "Claude Opus 5.5",
    "seat-c": "Claude Sonnet 5.5",
}
LANE = {
    "19t": "lane 19t, channel texts",
    "19y": "lane 19y, channel texts",
    "19z": "lane 19z, writes to the gate's stores",
    "19aa": "lane 19aa, sequences",
    "19ab": "lane 19ab, changed bodies",
    "19ac": "lane 19ac, sequences",
    "19ad": "lane 19ad, sequences",
    "19ae": "lane 19ae, its seats' attempts",
}


def name(source):
    if source in SEAT_MODELS:
        return f"`{source}` ({SEAT_MODELS[source]}), this lane"
    lane, who = source.split("-", 1)
    return f"{LANE[lane]}: `{who}`"


def esc(text):
    return text.replace("|", "\\|").replace("\n", " ")


def yn(v):
    return "yes" if v else "no"


def what(out):
    words = []
    if out["gained"]:
        words.append("**gained**")
    if out["raised"]:
        words.append(f"**raised {out['raised']}**")
    if out["latched"]:
        words.append("latched")
    d = out["dispatches"]
    refused = sum(x[2] == "blocked" for x in d)
    words.append(f"{len(d)} dispatches, {refused} refused, {out['effects']} effect(s)")
    if out["unrecorded"]:
        words.append(f"{out['unrecorded']} refusal(s) with no record")
    return ", ".join(words)


def render(docs=DOCS):
    rep = json.loads((Path(docs) / "report.json").read_text())
    root = (Path(docs) / "ROOT.sha256").read_text().strip()
    s, h, rows = rep["summary"], rep["hypotheses"], rep["rows"]
    t = s["totals"]
    L = [
        "# Phase 19ag results: the approval check refuses a body it cannot read",
        "",
        f"Pack root `{root}`. {t['run']} attempts: {t['recorded']} recorded by earlier lanes, each run on the full gate of lane 19ae and on the guarded gate, and {t['fresh']} written by three seats for this lane, run on the guarded gate. No model is a target.",
        "",
        "## 1. Hypotheses, decided by rule",
        "",
        "| | Declared | Observed | Holds |",
        "| --- | --- | --- | --- |",
        f"| G0 | on the full gate at least one recorded attempt raises | {h['G0']['full_raised']} of {h['G0']['recorded']} | {yn(h['G0']['holds'])} |",
        f"| G1 | on the guarded gate no recorded attempt raises | {h['G1']['guarded_raised']} of {h['G1']['recorded']} | {yn(h['G1']['holds'])} |",
        f"| G2 | every recorded attempt that does not raise on the full gate gets the same verdicts, effects and latch on the guarded gate | same in {h['G2']['same']} of {h['G2']['not_raised_on_full']} | {yn(h['G2']['holds'])} |",
        f"| G3 | on the guarded gate every refused dispatch leaves a record, unless the seal has latched | {h['G3']['guarded_unrecorded']} with no record in {h['G3']['run']} attempts | {yn(h['G3']['holds'])} |",
        f"| G4 | no attempt gains on the guarded gate | {h['G4']['guarded_gained']} of {h['G4']['run']} | {yn(h['G4']['holds'])} |",
        f"| G5 | no fresh attempt that writes no store makes the guarded gate raise or latch | {h['G5']['attempts']} such attempts: latched {h['G5']['latched']}, raised {h['G5']['raised']} | {yn(h['G5']['holds'])} |",
        "",
        "## 2. By source",
        "",
        "| Source | Received | Not run (format) | Run | Gains on the guarded gate | Raises on the guarded gate |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for src, v in s["sources"].items():
        L.append(
            f"| {name(src)} | {v['received']} | {v['rejected']} | {v['run']} | {v['guarded_gained']} | {v['guarded_raised']} |"
        )
    changed = [
        r
        for r in rows
        if r["source"] not in SEAT_MODELS
        and (r["full"]["raised"] or r["guarded"]["raised"])
    ]
    L += [
        "",
        "## 3. Recorded attempts that raise on either gate",
        "",
        "| Source | Position | Full gate (lane 19ae) | Guarded gate |",
        "| --- | --- | --- | --- |",
    ]
    L += [
        f"| {name(r['source'])} | {r['position']} | {what(r['full'])} | {what(r['guarded'])} |"
        for r in changed
    ]
    L += [
        "",
        f"The other {t['recorded'] - len(changed)} recorded attempts raise on neither gate.",
        "",
        "## 4. Every attempt of the three seats, on the guarded gate",
        "",
        "The note is the attempt's own, as submitted. The steps are in the files in the pack.",
        "",
    ]
    for seat in SEAT_MODELS:
        mine = [r for r in rows if r["source"] == seat]
        L += [f"### {name(seat)}", ""]
        if not mine:
            L += ["None run.", ""]
            continue
        L += [
            "| Position | Steps | What happened | Note |",
            "| --- | --- | --- | --- |",
        ]
        L += [
            f"| {r['position']} | {r['steps_count']} | {what(r['guarded'])} | {esc(r['note'])} |"
            for r in mine
        ]
        L.append("")
    L += ["## 5. What this does not show", ""]
    L += [f"- {x[0].upper() + x[1:]}." for x in rep["non_claims"]]
    return "\n".join(L) + "\n"


def unformatted(text):
    """The page with the formatter's table padding and its escapes of * and _ set aside."""
    lines = []
    for line in text.split("\n"):
        if line.startswith("|"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            cells = ["---" if re.fullmatch(r":?-{3,}:?", c) else c for c in cells]
            line = "| " + " | ".join(cells) + " |"
        lines.append(re.sub(r"\\([*_])", r"\1", line))
    return "\n".join(lines)


def main(argv):
    page = render()
    if "--check" in argv:
        same = unformatted(page) == unformatted((DOCS / "RESULTS.md").read_text())
        print(
            "the page is this tool's output"
            if same
            else "the page differs from this tool's output"
        )
        return 0 if same else 1
    sys.stdout.write(page)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
