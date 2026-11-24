"""Phase 19 census: which committed packs record the model the provider says answered
(P19-AUDIT01, extended by P19-AUDIT02, corrected by P19-AUDIT03).

For every committed Phase 19 ``evidence.zip`` this reads the JSON and JSON-lines members and
collects two things.

The model ids the pack names: a string under the key ``model`` or ``api_model``, a key of an
object under the key ``models`` whose values are all objects, or the ``id`` of each entry of a
list under ``models`` whose entries are all objects with a string ``id``.

Every place where the pack holds an id the provider returned: a string under ``model``
directly inside an object held under the key ``response`` (a provider's response body, stored
beside a generation), or a string under the key ``served_model`` (an id a harness copied out
of a response). A ``model`` inside a stored response is a returned id and not a named one.

It reads only the packs. It contacts no provider and no model and edits nothing but the page
it writes.

Standard library only::

    python -B tools/assurance-provenance/served19.py            # print the census as JSON
    python -B tools/assurance-provenance/served19.py --write    # write the page
    python -B tools/assurance-provenance/served19.py --check    # fail if the page is stale
"""

import argparse
import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RESEARCH = ROOT / "docs/research"
PAGE = RESEARCH / "PROVENANCE_PHASE_19_SERVED_MODELS.md"
PREFIX = "provenance-phase-"
NAMED_KEYS = ("model", "api_model")
MODELS_KEY = "models"
SERVED_KEY = "served_model"
RESPONSE_KEY = "response"
MAX_MEMBER = 64 * 1024 * 1024


def _listed(value):
    """The ids a ``models`` value names, one entry per model, or nothing."""
    if type(value) is dict and value and all(type(v) is dict for v in value.values()):
        # P19-AUDIT02: the keys of an object (lane 19af's capture).
        return list(value)
    if (
        type(value) is list
        and value
        and all(type(v) is dict and type(v.get("id")) is str for v in value)
    ):
        # P19-AUDIT03: a list of entries that each carry an id (lane 19e's spend record).
        return [v["id"] for v in value]
    return []


def _walk(value, parent, named, served, responses):
    stack = [(value, parent)]
    while stack:
        item, key = stack.pop()
        if type(item) is dict:
            # P19-AUDIT03: an object held under `response` is a stored provider response,
            # and the `model` in it is what the provider returned, not what was asked for.
            body = key == RESPONSE_KEY
            for name in NAMED_KEYS:
                if type(item.get(name)) is str:
                    if body and name == "model":
                        responses[item[name]] = responses.get(item[name], 0) + 1
                    else:
                        named.add(item[name])
            named.update(_listed(item.get(MODELS_KEY)))
            if type(item.get(SERVED_KEY)) is str:
                asked = next(
                    (
                        item[n]
                        for n in NAMED_KEYS
                        if type(item.get(n)) is str and not (body and n == "model")
                    ),
                    key,
                )
                pair = (str(asked), item[SERVED_KEY])
                served[pair] = served.get(pair, 0) + 1
            stack.extend((v, k) for k, v in item.items())
        elif type(item) is list:
            stack.extend((v, key) for v in item)


def _documents(name, raw):
    text = raw.decode("utf-8", "replace")
    if name.endswith(".jsonl"):
        for line in text.splitlines():
            if line.strip():
                yield json.loads(line)
    else:
        yield json.loads(text)


def read_pack(path):
    """The model ids one pack names and the provider-returned ids it holds."""
    named, served, responses, unread = set(), {}, {}, []
    with zipfile.ZipFile(path) as z:
        for info in sorted(z.infolist(), key=lambda i: i.filename):
            name = info.filename
            if not name.endswith((".json", ".jsonl")):
                continue
            if info.file_size > MAX_MEMBER:
                unread.append(name)
                continue
            try:
                for doc in _documents(name, z.read(name)):
                    _walk(doc, None, named, served, responses)
            except (ValueError, RecursionError):
                unread.append(name)
    returned = sorted({s for _, s in served} | set(responses))
    return {
        "named": sorted(named),
        "served": [
            {
                "served": i,
                "responses": responses.get(i, 0),
                "records": sum(c for (_, s), c in served.items() if s == i),
                "requested": sorted({a for a, s in served if s == i}),
            }
            for i in returned
        ],
        "unread": unread,
    }


def census(research=RESEARCH):
    out = {}
    for directory in sorted(Path(research).glob(PREFIX + "19*")):
        pack = directory / "evidence.zip"
        if pack.is_file():
            out[directory.name[len(PREFIX) :]] = read_pack(pack)
    return out


def _table(header, rows):
    """A Markdown table padded the way the repository's formatter pads it."""
    widths = [max(3, *(len(r[i]) for r in [header, *rows])) for i in range(len(header))]

    def line(cells):
        return "| " + " | ".join(c.ljust(w) for c, w in zip(cells, widths)) + " |"

    return [line(header), line(["-" * w for w in widths]), *(line(r) for r in rows)]


def _entry(s):
    """One returned id, with where the pack holds it. No comma or semicolon inside."""
    parts = []
    if s["responses"]:
        parts.append(f"{s['responses']} stored responses")
    if s["records"]:
        asked = " and ".join(f"`{a}`" for a in s["requested"])
        parts.append(f"{s['records']} `served_model` records for {asked}")
    return f"`{s['served']}` in " + " and ".join(parts)


def render(data):
    with_ids = {k: v for k, v in data.items() if v["named"]}
    holding = {k: v for k, v in with_ids.items() if v["served"]}
    rows = []
    for lane, v in with_ids.items():
        got = "; ".join(_entry(s) for s in v["served"])
        ids = ", ".join(f"`{n}`" for n in v["named"])
        rows.append([lane, ids, got or "none recorded"])
    strangers = {
        k: sorted(s["served"] for s in v["served"] if s["served"] not in v["named"])
        for k, v in holding.items()
    }
    strangers = {k: v for k, v in strangers.items() if v}
    if strangers:
        match = [
            "Returned ids that the pack holding them does not name: "
            + "; ".join(
                f"{k}: " + ", ".join(f"`{i}`" for i in v) for k, v in strangers.items()
            )
            + "."
        ]
    else:
        match = ["Every returned id above is one that the pack holding it also names."]
    header = [
        "Pack",
        "Model ids the pack names",
        "Ids the provider returned, as the pack records them",
    ]
    lines = [
        "# Phase 19: which packs record the model the provider says answered",
        "",
        "Generated by `tools/assurance-provenance/served19.py --write` from the committed packs",
        "(P19-AUDIT01, extended by P19-AUDIT02, corrected by P19-AUDIT03). Do not edit by hand;",
        "a test holds this page to the tool's output.",
        "",
        "A pack names a model as a string under the key `model` or `api_model`, as a key of an",
        "object under `models`, or as the `id` of an entry of a list under `models`. Naming a",
        "model is not running it: a pack may name one it declared and did not capture. Only an",
        "id the provider returned says what answered. A pack holds one in two forms: a stored",
        "response, which is a provider's response body kept beside a generation with the",
        "`model` the provider wrote in it, and a `served_model` record, which is an id a harness",
        "copied out of a response. This page lists, for every committed Phase 19 pack that names",
        "a model, whether the pack also holds such an id.",
        "",
        "Until 24 November 2026 this page counted only `served_model` records and said that one",
        "pack held a returned id. It missed the stored responses of lanes 19o and 19u, which",
        "those lanes' own pages had described.",
        "",
        f"Packs that name a model: {len(with_ids)}. Packs among them that hold an id the provider",
        f"returned: {len(holding)}.",
        "",
        *_table(header, rows),
        "",
        *match,
        "",
        "## What this does and does not say",
        "",
        "- Where the last column says none recorded, the pack holds the id that was requested",
        "  and nothing from the provider. The census cannot say what answered, and it does not",
        "  say anything answered wrongly.",
        "- A returned id that equals the requested one says the provider reported that id. It",
        "  does not say which weights ran behind it.",
        "- The census reads what a pack stores. It calls no provider and cannot tell whether a",
        "  stored response is what the provider sent.",
        "- A `served_model` record is counted once for each member of the pack that holds it,",
        "  so one call that a capture record and a report both carry shows as two.",
        "- A tally under `served_models` in a spend record is a count a harness made from the",
        "  stored responses. It is not counted again here.",
        "- A local-model lane names a file the author loaded on the author's machine; no",
        "  provider is involved and none is expected in the last column.",
        "- The census covers models in packs. The model behind an attacker seat is recorded by",
        "  the harness outside the repository and is not in any pack.",
        "",
    ]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    data = census()
    if args.write:
        PAGE.write_text(render(data))
    elif args.check:
        if not PAGE.is_file() or PAGE.read_text() != render(data):
            sys.exit("the served-model page is stale; run served19.py --write")
    else:
        print(json.dumps(data, sort_keys=True, indent=1))


if __name__ == "__main__":
    main()
