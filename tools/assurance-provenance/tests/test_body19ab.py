"""Lane 19ab instrument: reading attempts, the facts read off an outcome, the summary and the
five hypotheses, with a stand-in gate; and a few bodies on the real sealed gate."""

import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import body19ab as m  # noqa: E402

A = {"id": "a", "run": "p19", "content": "report a"}
B = {"id": "b", "run": "p19", "content": "report b"}
PAY = {"a": m.sha(m.wire(A)), "b": m.sha(m.wire(B))}
FIXTURE = {"actions": {"a": A, "b": B}, "payload_sha256": PAY}


def att(route, body, note="n"):
    return {"route": route, "body": body, "note": note}


def file(attempts):
    return json.dumps({"attacker": "author", "attempts": attempts}).encode()


class StubGate:
    """A gate that observes a body only when it is the unchanged action (with an approval on
    route b, honoured once). ``loose`` matches on the name alone and sends the body it was
    given; ``burn`` spends the approval on a refused body; ``lever`` refuses the delegated
    action after a refusal."""

    def __init__(self, *, loose=False, burn=False, lever=False):
        self.loose, self.burn, self.lever = loose, burn, lever

    def fixture(self):
        return FIXTURE

    def run(self, route, body):
        base = FIXTURE["actions"][route]
        same = m.wire(body) == m.wire(base)
        ok = same or (self.loose and body.get("id") == route)
        payloads, reasons, blocked = [], {}, 0
        spent = False
        if ok:
            payloads.append(m.sha(m.wire(body)))
            spent = route == "b"
        else:
            blocked += 1
            spent = self.burn and route == "b"
            if route == "b":
                reasons["approval_denied:approval_digest"] = 1
        if route == "a":
            second = not (self.lever and not ok)
            if second and not ok:
                payloads.append(PAY["a"])
        else:
            second = not spent
            if second:
                payloads.append(PAY["b"])
        blocked += not second
        return {
            "first": "observed" if ok else "blocked",
            "second": "observed" if second else "blocked",
            "effects": len(payloads),
            "payloads": sorted(payloads),
            "blocked_events": blocked,
            "reasons": reasons,
            "latched": [],
            "raised": None,
        }


GOOD = [
    att("a", dict(A), "the baseline"),
    att("a", {**A, "content": "report b"}, "changed content"),
    att("a", dict(reversed(list(A.items()))), "reordered"),
    att("b", {**B, "cc": "mallory"}, "added field under the approval"),
]


def report(gate, attempts=GOOD):
    files = {"author": file(attempts)}
    rows = m.measure(files, gate, gate.fixture())
    summary = m.summarise(rows, m.received(files), gate.fixture())
    return rows, summary, m.hypotheses(summary)


class ReadingTests(unittest.TestCase):
    def test_a_well_formed_file(self):
        raw = file(GOOD)
        got = m.read_attempts("author", raw)
        self.assertEqual(
            (got["sha256"], got["received"], got["rejected"]), (m.sha(raw), 4, [])
        )
        self.assertEqual([a["position"] for a in got["attempts"]], [0, 1, 2, 3])

    def test_bad_attempts_are_recorded_and_the_rest_are_kept(self):
        bad = [
            {"route": "a", "body": {}},
            att("c", {}),
            att("a", ["not", "an", "object"]),
            att("a", "report a"),
            att("a", {"content": "x" * (m.MAX_BODY + 1)}),
            att("a", {}, "n" * (m.MAX_NOTE + 1)),
        ]
        got = m.read_attempts("author", file([GOOD[0], *bad, GOOD[1]]))
        self.assertEqual([a["position"] for a in got["attempts"]], [0, 7])
        self.assertEqual(
            [x["reason"] for x in got["rejected"]],
            ["shape", "route", "body", "body", "body", "note"],
        )

    def test_a_body_json_cannot_carry_is_recorded(self):
        raw = b'{"attacker": "author", "attempts": [{"route": "a", "body": {"n": NaN}, "note": ""}]}'
        self.assertEqual(
            m.read_attempts("author", raw)["rejected"],
            [{"position": 0, "reason": "body"}],
        )

    def test_a_file_that_is_not_a_list_of_attempts_is_recorded(self):
        for raw in (
            b"no",
            b"[]",
            json.dumps({"attacker": "x", "attempts": []}).encode(),
        ):
            got = m.read_attempts("author", raw)
            self.assertEqual(got["rejected"], [{"position": None, "reason": "file"}])
        with self.assertRaises(ValueError):
            m.read_attempts("seat-a", b"{}")
        with self.assertRaises(ValueError):
            m.measure({}, StubGate(), FIXTURE)


class FactTests(unittest.TestCase):
    def test_changed_is_about_the_value_not_the_order_of_keys(self):
        self.assertIs(m.changed("a", dict(reversed(list(A.items()))), FIXTURE), False)
        self.assertIs(m.changed("a", {**A, "content": "report a "}, FIXTURE), True)
        self.assertIs(m.changed("a", {**A, "extra": None}, FIXTURE), True)
        self.assertIs(
            m.changed("a", {k: v for k, v in A.items() if k != "run"}, FIXTURE), True
        )
        self.assertIs(m.changed("b", dict(A), FIXTURE), True)

    def test_true_and_one_are_different_values(self):
        fixture = {"actions": {"a": {"id": "a", "n": 1}, "b": B}, "payload_sha256": PAY}
        self.assertIs(m.changed("a", {"id": "a", "n": True}, fixture), True)
        self.assertIs(m.changed("a", {"id": "a", "n": 1.0}, fixture), True)

    def test_the_digest_of_a_body_keeps_the_order_it_was_written_in(self):
        rows, _, _ = report(StubGate())
        self.assertNotEqual(rows[0]["body_sha256"], rows[2]["body_sha256"])
        self.assertEqual(rows[0]["body_sha256"], m.sha(m.as_written(A)))
        self.assertEqual(
            set(rows[0]),
            {"source", "position", "route", "body_sha256", "note", "outcome", "facts"},
        )

    def test_facts_of_a_refused_changed_body(self):
        rows, _, _ = report(StubGate())
        self.assertEqual(
            rows[1]["facts"],
            {
                "changed": True,
                "first_observed": False,
                "second_observed": True,
                "payloads_are_the_unchanged_one": True,
            },
        )


class HypothesisTests(unittest.TestCase):
    def test_all_five_hold_on_a_gate_that_binds_the_body(self):
        _, summary, h = report(StubGate())
        self.assertEqual(
            {k: v["holds"] for k, v in h.items()},
            dict.fromkeys(("B1", "B2", "B3", "B4", "B5"), True),
        )
        t = summary["totals"]
        self.assertEqual(
            (t["run"], t["changed"], t["unchanged"], t["unchanged_observed"]),
            (4, 2, 2, 2),
        )
        self.assertEqual((t["payloads"], t["most_effects"]), (4, 1))

    def test_a_gate_that_matches_on_the_name_fails_b1_and_b2(self):
        _, summary, h = report(StubGate(loose=True))
        self.assertEqual((h["B1"]["observed"], h["B1"]["holds"]), (2, False))
        self.assertEqual(
            (h["B2"]["not_the_unchanged_one"], h["B2"]["holds"]), (2, False)
        )

    def test_a_refusal_that_stops_the_delegated_action_fails_b3(self):
        _, _, h = report(StubGate(lever=True))
        self.assertEqual(
            (h["B3"]["refused"], h["B3"]["then_observed"], h["B3"]["holds"]),
            (1, 0, False),
        )

    def test_an_approval_spent_on_a_refused_body_fails_b4(self):
        _, _, h = report(StubGate(burn=True))
        self.assertEqual(
            (h["B4"]["refused"], h["B4"]["then_honoured_once"], h["B4"]["holds"]),
            (1, 0, False),
        )

    def test_a_latch_or_a_raise_fails_b5(self):
        class Raising(StubGate):
            def run(self, route, body):
                return dict(super().run(route, body), raised="TypeError")

        _, _, h = report(Raising())
        self.assertIs(h["B5"]["holds"], False)

    def test_empty_groups_do_not_hold_vacuously(self):
        _, _, h = report(StubGate(), [att("a", dict(A))])
        self.assertEqual(
            (h["B1"]["holds"], h["B3"]["holds"], h["B4"]["holds"]),
            (False, False, False),
        )


class RealGateTests(unittest.TestCase):
    """The sealed gate itself. These need the hash-locked set."""

    @classmethod
    def setUpClass(cls):
        cls.gate = m.Gate()
        cls.addClassCleanup(cls.gate.close)
        cls.fixture = cls.gate.fixture()
        cls.a = cls.fixture["actions"]["a"]
        cls.b = cls.fixture["actions"]["b"]

    def test_the_fixture_names_two_actions_and_two_payloads(self):
        self.assertEqual(set(self.fixture["actions"]), {"a", "b"})
        self.assertNotEqual(
            self.fixture["payload_sha256"]["a"], self.fixture["payload_sha256"]["b"]
        )

    def test_a_changed_delegated_body_is_refused_and_the_unchanged_one_still_goes(self):
        out = self.gate.run("a", {**self.a, "content": "report a "})
        self.assertEqual(
            (out["first"], out["second"], out["effects"]), ("blocked", "observed", 1)
        )
        self.assertEqual(out["payloads"], [self.fixture["payload_sha256"]["a"]])
        self.assertEqual((out["latched"], out["raised"]), ([], None))

    def test_reordered_keys_are_the_same_action(self):
        out = self.gate.run("a", dict(reversed(list(self.a.items()))))
        self.assertEqual((out["first"], out["effects"]), ("observed", 1))
        self.assertEqual(out["payloads"], [self.fixture["payload_sha256"]["a"]])

    def test_an_approval_does_not_cover_a_changed_body_and_is_not_spent_by_it(self):
        out = self.gate.run("b", {**self.b, "cc": "mallory"})
        self.assertEqual(
            (out["first"], out["second"], out["effects"]), ("blocked", "observed", 1)
        )
        self.assertEqual(
            out["reasons"],
            {"approval_admitted": 1, "approval_denied:approval_digest": 1},
        )
        self.assertEqual(out["payloads"], [self.fixture["payload_sha256"]["b"]])


if __name__ == "__main__":
    unittest.main()
