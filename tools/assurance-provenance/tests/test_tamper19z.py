"""Lane 19z instrument: reading files of attempts, the limits on what one operation may do,
the flags, the summary and the four hypotheses. The gate here is a stand-in except where SQL
is run on a scratch database."""

import json
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import tamper19z as t  # noqa: E402


class StubGate:
    """GRANT in an SQL operation is a write that gains on the open gate; a script operation
    with any text but ``same`` changes the script. The sealed gate latches on both unless
    ``blind`` names a word it fails to notice."""

    def __init__(self, *, blind=None, false_alarm=False):
        self.blind = blind
        self.false_alarm = false_alarm
        self.calls = []

    def run(self, gate, ops):
        self.calls.append((gate, ops))
        ops = ops or []
        out = {
            "verdicts": {"b": "blocked", "a": "observed"},
            "effects": 1,
            "raised": None,
            "script_changed": False,
            "latched": [],
            "touched": [],
            "ops": ["ok"] * len(ops),
        }
        text = " ".join(o.get("sql", "") + o.get("text", "") for o in ops)
        grant = "GRANT" in text
        script = any(o["op"] == "script" and o["text"] != "same" for o in ops)
        out["touched"] = ["context.sqlite"] * grant + ["run.sh"] * script
        noticed = out["touched"] and not (self.blind and self.blind in text)
        if gate == "sealed" and (noticed or (self.false_alarm and "CONTROL" in text)):
            out.update(
                latched=out["touched"] or ["context.sqlite"],
                verdicts={"b": "blocked", "a": "blocked"},
                effects=0,
            )
            return out
        if grant:
            out.update(verdicts={"b": "observed", "a": "blocked"})
        out["script_changed"] = script
        return out

    def baseline(self):
        return {name: self.run(name, None) for name in t.GATES}


def sql(text, store="context.sqlite"):
    return {"op": "sql", "store": store, "sql": text}


def attempt(*ops, note="n"):
    return {"ops": list(ops), "note": note}


def file(source, attempts):
    return json.dumps({"attacker": source, "attempts": attempts}).encode()


GRANT = attempt(sql("GRANT b"), note="a grant")
SCRIPT = attempt({"op": "script", "text": "changed"}, note="a rewrite")
CONTROL = attempt(sql("SELECT 1 -- CONTROL"), note="a control")


def files(a=None, b=None, author=None):
    return {
        "author": author or file("author", [GRANT, SCRIPT, CONTROL]),
        "seat-a": a or file("seat-a", [GRANT]),
        "seat-b": b or file("seat-b", [SCRIPT, CONTROL]),
    }


def report(given, gate):
    base = gate.baseline()
    rows = t.measure(given, gate)
    summary = t.summarise(rows, t.received(given), base)
    return rows, summary, t.hypotheses(summary)


class ReadingTests(unittest.TestCase):
    def test_a_well_formed_file(self):
        raw = file("seat-a", [GRANT, SCRIPT])
        got = t.read_attempts("seat-a", raw)
        self.assertEqual((got["sha256"], got["received"]), (t.sha(raw), 2))
        self.assertEqual([a["position"] for a in got["attempts"]], [0, 1])
        self.assertEqual(got["rejected"], [])

    def test_bad_attempts_are_recorded_and_the_rest_are_kept(self):
        bad = [
            {"ops": [], "note": "no operations"},
            {"ops": [sql("x")] * (t.MAX_OPS + 1), "note": "too many"},
            {"ops": [sql("x", store="service.sqlite")], "note": "not a store"},
            {"ops": [sql("x" * (t.MAX_SQL + 1))], "note": "long sql"},
            {
                "ops": [{"op": "script", "text": "x" * (t.MAX_TEXT + 1)}],
                "note": "long text",
            },
            {"ops": [{"op": "shell", "text": "rm"}], "note": "unknown operation"},
            {
                "ops": [{"op": "delete", "store": "context.sqlite", "sql": "x"}],
                "note": "extra key",
            },
            {"ops": [sql("x")], "note": "n" * (t.MAX_NOTE + 1)},
            {"ops": [sql("x")]},
            "not an attempt",
        ]
        got = t.read_attempts("seat-b", file("seat-b", [GRANT, *bad, SCRIPT]))
        self.assertEqual([a["position"] for a in got["attempts"]], [0, 11])
        self.assertEqual(
            [r["reason"] for r in got["rejected"]],
            ["ops", "ops", "op", "op", "op", "op", "op", "note", "shape", "shape"],
        )

    def test_limits_by_source(self):
        self.assertEqual(t.LIMIT, {"author": 60, "seat-a": 40, "seat-b": 40})
        got = t.read_attempts("seat-a", file("seat-a", [CONTROL] * 42))
        self.assertEqual(len(got["attempts"]), 40)
        self.assertEqual([r["reason"] for r in got["rejected"]], ["over_limit"] * 2)

    def test_a_file_that_is_not_a_list_of_attempts_is_recorded(self):
        for raw in (
            b"no",
            b"[]",
            file("seat-b", [GRANT]),
            json.dumps({"attacker": "seat-a", "attempts": 3}).encode(),
        ):
            got = t.read_attempts("seat-a", raw)
            self.assertEqual(got["attempts"], [])
            self.assertEqual(got["rejected"], [{"position": None, "reason": "file"}])
        with self.assertRaises(ValueError):
            t.read_attempts("seat-c", b"{}")
        with self.assertRaises(ValueError):
            t.measure({"author": b"{}"}, StubGate())

    def test_the_stores_are_the_nine_a_fixture_makes(self):
        self.assertEqual(len(t.STORES), 9)
        self.assertEqual(set(t.OPS), {"sql", "delete", "script", "relay"})


class SqlTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory(prefix="p19z-sql-")
        self.addCleanup(tmp.cleanup)
        self.dir = Path(tmp.name)
        self.db = self.dir / "store.sqlite"
        with sqlite3.connect(self.db) as db:
            db.execute("CREATE TABLE grants(actor TEXT, actions TEXT)")

    def test_ordinary_sql_runs(self):
        self.assertEqual(
            t.run_sql(
                self.db,
                "INSERT INTO grants VALUES('x','[]'); UPDATE grants SET actions='[1]'",
            ),
            "ok",
        )
        with sqlite3.connect(self.db) as db:
            self.assertEqual(
                db.execute("SELECT * FROM grants").fetchall(), [("x", "[1]")]
            )

    def test_no_other_file_can_be_reached(self):
        other = self.dir / "other.sqlite"
        for text in (
            f"ATTACH DATABASE '{other}' AS x; CREATE TABLE x.t(a)",
            f"VACUUM INTO '{other}'",
            "DETACH DATABASE main",
        ):
            self.assertNotEqual(t.run_sql(self.db, text), "ok", text)
        self.assertFalse(other.exists())

    def test_a_query_that_never_ends_is_stopped(self):
        endless = "WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c) SELECT count(*) FROM c"
        self.assertEqual(t.run_sql(self.db, endless), "OperationalError")

    def test_bad_sql_is_a_result_and_not_an_exception(self):
        self.assertEqual(t.run_sql(self.db, "this is not sql"), "OperationalError")


class MeasureTests(unittest.TestCase):
    def test_rows_are_in_source_then_position_order_with_both_gates(self):
        gate = StubGate()
        rows, summary, _ = report(files(), gate)
        self.assertEqual(
            [(x["source"], x["position"]) for x in rows],
            [
                ("author", 0),
                ("author", 1),
                ("author", 2),
                ("seat-a", 0),
                ("seat-b", 0),
                ("seat-b", 1),
            ],
        )
        first = rows[0]
        self.assertEqual(first["ops_sha256"], t.ops_digest(GRANT["ops"]))
        self.assertEqual((first["ops_count"], first["note"]), (1, "a grant"))
        self.assertEqual(
            set(first),
            {"source", "position", "ops_sha256", "ops_count", "note", "open", "sealed"},
        )
        self.assertEqual(len(gate.calls), 2 + 2 * len(rows))

    def test_the_flags(self):
        rows, _, _ = report(files(), StubGate())
        grant, script, control = rows[:3]
        self.assertEqual(
            (grant["open"]["gained"], grant["open"]["denied"]), (True, True)
        )
        self.assertEqual(
            (grant["sealed"]["gained"], grant["sealed"]["denied"]), (False, True)
        )
        self.assertEqual(grant["sealed"]["latched"], ["context.sqlite"])
        self.assertIs(script["open"]["ran_changed"], True)
        self.assertIs(script["sealed"]["ran_changed"], False)
        for gate in t.GATES:
            self.assertEqual(
                (
                    control[gate]["gained"],
                    control[gate]["ran_changed"],
                    control[gate]["denied"],
                ),
                (False, False, False),
            )
        more = dict(
            grant["open"], verdicts={"b": "blocked", "a": "observed"}, effects=2
        )
        self.assertIs(t.gained(more), True)

    def test_summary_and_hypotheses_when_the_seal_holds(self):
        _, summary, h = report(files(), StubGate())
        self.assertEqual(
            summary["totals"],
            {
                "run": 6,
                "open_gained": 2,
                "open_ran_changed": 2,
                "sealed_gained": 0,
                "sealed_ran_changed": 0,
                "sealed_latched": 4,
                "sealed_touched": 4,
                "sealed_latched_untouched": 0,
                "sealed_touched_unlatched": 0,
                "sealed_denied": 4,
            },
        )
        self.assertEqual(summary["sources"]["seat-b"]["open"]["ran_changed"], 1)
        self.assertEqual(summary["sources"]["author"]["received"], 3)
        self.assertEqual(
            {k: v["holds"] for k, v in h.items()},
            {"Z0": True, "Z1": True, "Z2": True, "Z3": True},
        )
        self.assertEqual(h["Z3"]["biting"], {"seat-a": 1, "seat-b": 1})

    def test_a_change_the_seal_misses_fails_z1_and_z2(self):
        _, _, h = report(files(), StubGate(blind="GRANT"))
        self.assertEqual((h["Z1"]["sealed_gained"], h["Z1"]["holds"]), (2, False))
        self.assertEqual((h["Z2"]["touched_unlatched"], h["Z2"]["holds"]), (2, False))
        _, _, h = report(files(), StubGate(blind="changed"))
        self.assertEqual((h["Z1"]["sealed_ran_changed"], h["Z1"]["holds"]), (2, False))

    def test_a_false_alarm_fails_z2_only(self):
        _, _, h = report(files(), StubGate(false_alarm=True))
        self.assertEqual((h["Z2"]["latched_untouched"], h["Z2"]["holds"]), (2, False))
        self.assertIs(h["Z1"]["holds"], True)

    def test_z0_needs_the_authors_list_to_bite_both_ways(self):
        _, _, h = report(files(author=file("author", [GRANT, CONTROL])), StubGate())
        self.assertIs(h["Z0"]["holds"], False)
        _, _, h = report(files(author=file("author", [SCRIPT])), StubGate())
        self.assertIs(h["Z0"]["holds"], False)

    def test_an_empty_or_toothless_seat_fails_z3(self):
        _, _, h = report(files(a=file("seat-a", [])), StubGate())
        self.assertEqual((h["Z3"]["biting"]["seat-a"], h["Z3"]["holds"]), (0, False))
        _, _, h = report(files(b=file("seat-b", [CONTROL])), StubGate())
        self.assertIs(h["Z3"]["holds"], False)
        self.assertIs(h["Z1"]["holds"], True)

    def test_z1_needs_something_to_have_run(self):
        empty = {s: file(s, []) for s in t.SOURCES}
        _, _, h = report(empty, StubGate())
        self.assertIs(h["Z1"]["holds"], False)


if __name__ == "__main__":
    unittest.main()
