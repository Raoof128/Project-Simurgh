"""Phase 19c lanes over the forked receiver, receiver-direct, with the frozen receiver driven on
the same bytes wherever it accepts them (design §4.3, §4.5, §4.8, §4.10).

Every row names the fork's reason and the frozen receiver's outcome. Where the frozen receiver
has no corresponding route (the approved-input manifest) the row says so. The strawman
``naive_string_filter_demo`` is authored here and must admit at least one variant; it is a
demonstration of power, not a comparator, and does not pay G22.
"""

import hashlib
import posixpath
import shutil
import sys
import urllib.parse
from pathlib import Path

import receiver19
from core import encode

ROOT = receiver19.ROOT
sys.path.insert(0, str(ROOT / "tools/assurance-credentials"))
import service as frozen  # noqa: E402

KEY = "k" * 64
SECRET = "s" * 64
OTHER_SECRET = "o" * 64
DENIED = "/etc/passwd"
VARIANTS = (
    ("case_fold", "/ETC/PASSWD", "B2-18 URL encoding and mirrors; case variants"),
    ("percent_encoded", "/etc/%70asswd", "B2-18 URL encoding"),
    ("double_encoded", "/etc/%2570asswd", "B2-18 URL encoding"),
    (
        "dot_segments",
        "/workdir/../etc/passwd",
        "F-7 raw file read of a forbidden source",
    ),
    (
        "encoded_dot_segments",
        "/workdir/%2e%2e/etc/passwd",
        "B2-13 split and encoded forms",
    ),
    ("duplicate_slashes", "//etc//passwd", "B2-18 mirrors and proxies"),
    ("trailing_slash", "/etc/passwd/", "B2-16 altered arguments"),
)


def wire(value):
    return encode(value)


def action(**over):
    base = {
        "id": "a",
        "run": "run-1",
        "principal": "alice",
        "tenant": "tenant",
        "operation": "send_report",
        "resource": "inbox",
        "content": "report a",
        "policyRevision": "v1",
    }
    base.update(over)
    return base


class Pair:
    """A forked store and a frozen store with the same credential and session."""

    def __init__(self, base, name):
        self.dir = Path(base) / name
        self.dir.mkdir(parents=True, exist_ok=True)
        self.fork = receiver19.Store19.create(
            self.dir / "fork.sqlite", "continuous", session_key=KEY, issuer="p19c"
        )
        self.frozen = frozen.Store.create(
            self.dir / "frozen.sqlite", "continuous", session_key=KEY, issuer="p19c"
        )
        self.fork.issue("c1", SECRET, "alice", "tenant", "inbox", 200, run="run-1")
        self.frozen.issue("c1", SECRET, "alice", "tenant", "inbox", 200)
        self.fork.allow("c1", "send_report", "inbox")
        self.fs = self.fork.login(SECRET)
        self.zs = self.frozen.login(SECRET)

    def send_fork(self, act, *, proof=True, sess=None):
        sess = sess or self.fs
        key = receiver19.key_for(act)
        p = receiver19.holder_proof(sess["holder"], key) if proof else None
        out = self.fork.send(sess["secret"], key, act, proof=p)
        return out["status"] if out["status"] == "observed" else out["reason"]

    def send_frozen(self, act):
        key = frozen.key_for(act)
        out = self.frozen.send(self.zs["secret"], key, act)
        return out["status"] if out["status"] == "observed" else out["reason"]

    def close(self):
        shutil.rmtree(self.dir, ignore_errors=True)


def credential_lane(base):
    p = Pair(base, "credential")
    try:
        rows = []

        def row(case, act, **kw):
            rows.append(
                {
                    "case": case,
                    "fork": p.send_fork(act, **kw),
                    "frozen": p.send_frozen(act)
                    if act["operation"] == "send_report"
                    else "request",
                }
            )

        row("positive_control", action(id="p1"))
        row("planted_token_other_run", action(id="p2", run="run-2"))
        row("other_principal", action(id="p3", principal="bob"))
        row("bearer_replay_without_proof", action(id="p4"), proof=False)
        row("second_holder", action(id="p5"), sess={**p.fs, "holder": "h" * 64})
        row(
            "write_under_comment_only_grant",
            action(id="p6", operation="write_path", resource="/workdir/x"),
        )
        p.fork.revoke("c1")
        p.frozen.revoke("c1")
        for i in range(3):
            p.send_fork(action(id=f"v{i}"))
            p.send_frozen(action(id=f"v{i}"))
        return {
            "rows": rows,
            "revoked_retries": {
                "attempts": 3,
                "fork_denials": p.fork.denials("credential_inactive"),
                "frozen_denials": sum(
                    1
                    for (pl,) in frozen.sqlite3.connect(p.frozen.path).execute(
                        "SELECT payload FROM events WHERE kind='denied'"
                    )
                    if '"reason":"credential_inactive"' in pl
                ),
            },
            "note": "the frozen receiver has no run column and no holder; other-run and replayed bearers land there",
        }
    finally:
        p.close()


def manifest_lane(base):
    p = Pair(base, "manifest")
    try:
        spec_v1 = hashlib.sha256(b"spec v1: the program as approved").hexdigest()
        config_v1 = hashlib.sha256(b'{"oversight_frequency": 10}').hexdigest()
        vectors = hashlib.sha256(b"vectors.npz approved package").hexdigest()
        for name, digest in (
            ("spec.txt", spec_v1),
            ("config.json", config_v1),
            ("vectors.npz", vectors),
        ):
            p.fork.list_input("c1", name, digest)
        rows = []

        def load(case, name, data):
            out = p.fork.load(p.fs["secret"], name, hashlib.sha256(data).hexdigest())
            rows.append(
                {
                    "case": case,
                    "name": name,
                    "fork": out["status"]
                    if out["status"] == "loaded"
                    else out["reason"],
                }
            )

        load("listed_input", "spec.txt", b"spec v1: the program as approved")
        load(
            "regenerated_spec",
            "spec.txt",
            b"spec v2: regenerated from the patched program",
        )
        load("edited_config", "config.json", b'{"oversight_frequency": 1000}')
        load(
            "vectors_npz_from_run_cache",
            "vectors.npz",
            b"vectors.npz from the run cache",
        )
        return {
            "rows": rows,
            "frozen": "no_load_route",
            "note": "the frozen receiver has no manifest and no load route (C-21, F-13, 31 Oct vectors.npz)",
        }
    finally:
        p.close()


def naive_string_filter_demo(resource):
    """An authored strawman: denies the exact bytes of the canonical denied path only."""
    return "denied" if resource == DENIED else "admitted"


def single_decode_filter_demo(resource):
    """A plausible one-line filter: decode once, normalise dot segments, fold case."""
    return (
        "denied"
        if posixpath.normpath(urllib.parse.unquote(resource)).lower() == DENIED
        else "admitted"
    )


GRANTED = "/workdir/notes.txt"
# aliases of the GRANTED resource: the rows that exercise canonicalisation (P19-REPAIR03); the
# `/etc/passwd` variants above are denied by the allow-list whatever the canonicaliser does
GRANTED_ALIASES = (
    ("dot_segment", "/workdir/./notes.txt", "observed"),
    ("duplicate_slash", "/workdir//notes.txt", "observed"),
    ("percent_encoded", "/workdir/%6eotes.txt", "observed"),
    ("parent_traversal", "/tmp/../workdir/notes.txt", "observed"),
    ("trailing_slash", "/workdir/notes.txt/", "observed"),
    ("case_variant", "/WORKDIR/NOTES.TXT", "effect_denied"),
    ("nul_suffix", "/workdir/notes.txt%00.png", "effect_denied"),
)


def _alias_rows(p, prefix):
    rows = []
    for name, resource, expected in GRANTED_ALIASES:
        verdict = p.send_fork(
            action(id=prefix + name, operation="write_path", resource=resource)
        )
        rows.append(
            {
                "alias": name,
                "resource": resource,
                "canonical": receiver19.canonical(resource),
                "fork": verdict,
                "expected": expected,
                "holds": verdict == expected,
            }
        )
    return rows


def _stored_resources(p):
    import json as _json
    import sqlite3 as _sqlite3

    db = _sqlite3.connect(p.fork.path)
    try:
        return sorted(
            {
                _json.loads(payload)["resource"]
                for (payload,) in db.execute("SELECT payload FROM effects")
            }
        )
    finally:
        db.close()


def route_corpus(base):
    p = Pair(base, "route")
    try:
        p.fork.allow("c1", "write_path", GRANTED)
        positive = p.send_fork(
            action(id="w0", operation="write_path", resource=GRANTED)
        )
        variants = []
        for name, resource, source in VARIANTS:
            variants.append(
                {
                    "variant": name,
                    "resource": resource,
                    "source_row": source,
                    "canonical": receiver19.canonical(resource),
                    "fork": p.send_fork(
                        action(
                            id="w-" + name, operation="write_path", resource=resource
                        )
                    ),
                    "naive_string_filter_demo": naive_string_filter_demo(resource),
                    "single_decode_filter_demo": single_decode_filter_demo(resource),
                    "frozen": "request (write_path is not a frozen operation)",
                }
            )
        aliases = _alias_rows(p, "alias-")
        stored = _stored_resources(p)
    finally:
        p.close()
    # ablation: with the canonicaliser replaced by the identity, the admitted aliases must be
    # refused; a corpus that cannot tell the two apart would be a string filter in disguise
    real = receiver19.canonical
    receiver19.canonical = lambda value: value
    try:
        q = Pair(base, "route-ablation")
        try:
            q.fork.allow("c1", "write_path", GRANTED)
            ablated = _alias_rows(q, "ablated-")
        finally:
            q.close()
    finally:
        receiver19.canonical = real
    admitted_aliases = [a["alias"] for a in aliases if a["fork"] == "observed"]
    ablation_flips = [
        a["alias"]
        for a, b in zip(aliases, ablated)
        if a["fork"] == "observed" and b["fork"] != "observed"
    ]
    return {
        "denied_canonical": DENIED,
        "positive_control": {"fork": positive},
        "variants": variants,
        "granted": GRANTED,
        "granted_aliases": aliases,
        "effects_record_the_canonical_resource": stored == [GRANTED],
        "stored_effect_resources": stored,
        "identity_canonical_ablation": {
            "rows": ablated,
            "admitted_aliases_refused_under_identity": ablation_flips,
            "canonicalisation_is_load_bearing": bool(admitted_aliases)
            and sorted(ablation_flips) == sorted(admitted_aliases),
        },
        "strawman_admits_at_least_one": any(
            v["naive_string_filter_demo"] == "admitted" for v in variants
        ),
        "single_decode_filter_admits": [
            v["variant"]
            for v in variants
            if v["single_decode_filter_demo"] == "admitted"
        ],
        "pays_G22": False,
        "note": (
            "receiver-direct; the /etc/passwd variants are refused by the allow-list and do not "
            "exercise the canonicaliser; the granted-alias rows and the identity ablation do"
        ),
    }


def cumulative_lane(base):
    p = Pair(base, "cumulative")
    try:
        p.fork.set_limits("c1", per_call=20, running=35)
        rows = []
        for i in range(3):
            act = action(id=f"c{i}", content="x" * 15)
            rows.append(
                {
                    "call": i + 1,
                    "bytes": 15,
                    "fork": p.send_fork(act),
                    "frozen": p.send_frozen(act),
                }
            )
        return {
            "per_call": 20,
            "running": 35,
            "rows": rows,
            "note": "each call is under the per-call limit; the third crosses the running limit (B1-44, C-25)",
        }
    finally:
        p.close()


def admin_revoked_lane(base):
    p = Pair(base, "admin")
    try:
        before = {
            "fork": p.send_fork(action(id="r1")),
            "frozen": p.send_frozen(action(id="r1")),
        }
        p.fork.admin_revoke("c1")
        after = {
            "fork": p.send_fork(action(id="r2")),
            "frozen": p.send_frozen(action(id="r2")),
        }
        return {
            "before": before,
            "after": after,
            "note": "administrative authority revoked while the technical path stays valid (D-22)",
        }
    finally:
        p.close()


def run_all(base):
    base = Path(base)
    base.mkdir(parents=True, exist_ok=True)
    return {
        "credential": credential_lane(base),
        "manifest": manifest_lane(base),
        "route_corpus": route_corpus(base),
        "cumulative": cumulative_lane(base),
        "admin_revoked": admin_revoked_lane(base),
        "reasons": list(receiver19.REASONS),
        "transport": "in-process Store19; the HTTP transport is not forked",
    }
