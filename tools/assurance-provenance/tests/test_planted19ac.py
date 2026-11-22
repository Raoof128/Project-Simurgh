"""Lane 19ac instrument: reading attempts, what counts as a gain, the summary and the four
hypotheses with a stand-in gate; and the planted fault on the real fixtures."""

import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import planted19ac as m  # noqa: E402


def d(route, times=1, adapter=None):
    return {"do": "dispatch", "route": route, "times": times, "adapter": adapter}


def relay(text):
    return {"do": "relay", "text": text}


def seq(*steps, note="n"):
    return {"steps": list(steps), "note": note}


def file(source, attempts):
    return json.dumps({"attacker": source, "attempts": attempts}).encode()


FORGE = seq(relay("FORGED"), d("b", 1, "tool_result_body"), note="a forged token")
PLAIN = seq(d("b"), d("a"), note="the baseline")
MINTED = seq(
    {"do": "mint", "route": "b", "name": "t1"},
    {"do": "dispatch_with", "route": "b", "token": "t1", "times": 1},
    note="a real approval",
)


class StubGate:
    """``real`` observes b only with a minted approval. ``planted`` also observes it after a
    relayed text that says FORGED. ``leaky`` makes the real gate do the same; ``twice`` makes
    a minted approval send two effects on the real gate."""

    def __init__(self, *, leaky=False, twice=False):
        self.leaky, self.twice = leaky, twice

    def run(self, name, steps):
        done, forged, minted, effects = [], False, set(), 0
        for step in steps:
            if step["do"] == "relay":
                forged = step.get("text") == "FORGED"
            elif step["do"] == "mint":
                minted.add(step["route"])
            elif step["do"] in ("dispatch", "dispatch_with"):
                route = step["route"]
                ok = route == "a" or route in minted
                if route == "b" and forged and (name == "planted" or self.leaky):
                    ok = True
                effects += ok
                if ok and route in minted and self.twice and name == "real":
                    effects += 1
                done.append([route, "plain", "observed" if ok else "blocked"])
        return {
            "dispatches": done,
            "effects": effects,
            "reasons": {},
            "latched": [],
            "raised": None,
        }


def files(author=(PLAIN, FORGE), a=(FORGE, MINTED), b=(PLAIN, FORGE)):
    return {
        "author": file("author", list(author)),
        "seat-a": file("seat-a", list(a)),
        "seat-b": file("seat-b", list(b)),
    }


def report(gate, given=None):
    given = given or files()
    rows = m.measure(given, gate)
    summary = m.summarise(rows, m.received(given))
    return rows, summary, m.hypotheses(summary)


class ReadingTests(unittest.TestCase):
    def test_three_sources_and_their_limits(self):
        self.assertEqual(m.SOURCES, ("author", "seat-a", "seat-b"))
        self.assertEqual(
            (m.LIMIT["seat-a"], m.LIMIT["seat-b"], m.GATES),
            (40, 40, ("real", "planted")),
        )
        got = m.received(files())
        self.assertEqual(
            {s: len(v["attempts"]) for s, v in got.items()},
            {"author": 2, "seat-a": 2, "seat-b": 2},
        )

    def test_bad_attempts_are_recorded_and_the_rest_are_kept(self):
        bad = [
            {"steps": [], "note": ""},
            seq({"do": "sleep"}),
            {"note": "x"},
            "text",
            seq(d("b", 201)),
        ]
        got = m.read_attempts("seat-a", file("seat-a", [FORGE, *bad, PLAIN]))
        self.assertEqual([a["position"] for a in got["attempts"]], [0, 6])
        self.assertEqual(
            [x["reason"] for x in got["rejected"]],
            ["steps", "step", "shape", "shape", "step"],
        )

    def test_a_seat_cannot_hand_in_more_than_its_limit_or_another_seats_file(self):
        got = m.read_attempts("seat-a", file("seat-a", [PLAIN] * 43))
        self.assertEqual((len(got["attempts"]), len(got["rejected"])), (40, 3))
        self.assertEqual({x["reason"] for x in got["rejected"]}, {"over_limit"})
        for raw in (file("seat-b", [PLAIN]), b"not json", b"[]"):
            self.assertEqual(
                m.read_attempts("seat-a", raw)["rejected"],
                [{"position": None, "reason": "file"}],
            )
        with self.assertRaises(ValueError):
            m.read_attempts("seat-c", b"{}")
        with self.assertRaises(ValueError):
            m.measure({"author": b"{}"}, StubGate())


class GainTests(unittest.TestCase):
    def out(self, dispatches, effects):
        return {
            "dispatches": dispatches,
            "effects": effects,
            "reasons": {},
            "latched": [],
            "raised": None,
        }

    def test_b_observed_with_no_approval_minted_for_it_is_a_gain(self):
        self.assertIs(
            m.gained(FORGE["steps"], self.out([["b", "adapter", "observed"]], 1)), True
        )
        self.assertIs(
            m.gained(FORGE["steps"], self.out([["b", "adapter", "blocked"]], 0)), False
        )

    def test_using_an_approval_the_host_minted_for_b_is_not_a_gain(self):
        self.assertIs(
            m.gained(MINTED["steps"], self.out([["b", "token:b", "observed"]], 1)),
            False,
        )

    def test_an_approval_minted_for_a_does_not_excuse_b(self):
        steps = [
            {"do": "mint", "route": "a", "name": "t"},
            {"do": "dispatch_with", "route": "b", "token": "t", "times": 1},
        ]
        self.assertIs(
            m.gained(steps, self.out([["b", "token:a", "observed"]], 1)), True
        )

    def test_more_than_one_effect_is_a_gain_whatever_was_minted(self):
        self.assertIs(
            m.gained(MINTED["steps"], self.out([["b", "token:b", "observed"]], 2)), True
        )
        self.assertIs(
            m.gained(
                PLAIN["steps"],
                self.out([["b", "plain", "blocked"], ["a", "plain", "observed"]], 1),
            ),
            False,
        )


class HypothesisTests(unittest.TestCase):
    def test_all_four_hold_when_the_fault_is_found_and_the_real_gate_stands(self):
        rows, summary, h = report(StubGate())
        self.assertEqual(
            {k: v["holds"] for k, v in h.items()},
            dict.fromkeys(("P0", "P1", "P2", "P3"), True),
        )
        self.assertEqual(h["P2"]["planted_gained"], {"seat-a": 1, "seat-b": 1})
        self.assertEqual(
            (summary["totals"]["run"], summary["totals"]["seat_attempts"]), (6, 4)
        )
        self.assertEqual(
            set(rows[0]),
            {
                "source",
                "position",
                "steps_sha256",
                "steps_count",
                "note",
                "real",
                "planted",
            },
        )
        self.assertEqual(rows[1]["steps_sha256"], m.steps_digest(FORGE["steps"]))

    def test_a_seat_that_does_not_find_the_fault_fails_p2_only(self):
        _, _, h = report(StubGate(), files(b=(PLAIN, MINTED)))
        self.assertEqual(h["P2"]["planted_gained"], {"seat-a": 1, "seat-b": 0})
        self.assertEqual(
            (h["P0"]["holds"], h["P1"]["holds"], h["P2"]["holds"]), (True, True, False)
        )

    def test_an_empty_seat_fails_p2(self):
        given = files()
        given["seat-b"] = file("seat-b", [])
        _, _, h = report(StubGate(), given)
        self.assertIs(h["P2"]["holds"], False)

    def test_a_gain_on_the_real_gate_fails_p0_and_p1(self):
        _, _, h = report(StubGate(leaky=True))
        self.assertEqual((h["P0"]["author_real_gained"], h["P0"]["holds"]), (1, False))
        self.assertEqual((h["P1"]["real_gained"], h["P1"]["holds"]), (2, False))

    def test_a_second_effect_on_the_real_gate_is_a_gain(self):
        _, _, h = report(StubGate(twice=True))
        self.assertEqual((h["P1"]["real_gained"], h["P1"]["holds"]), (1, False))

    def test_controls_that_do_not_bite_fail_p0(self):
        _, _, h = report(StubGate(), files(author=(PLAIN,)))
        self.assertIs(h["P0"]["holds"], False)

    def test_a_latch_or_raise_on_the_real_gate_fails_p3(self):
        class Raising(StubGate):
            def run(self, name, steps):
                out = super().run(name, steps)
                return dict(out, raised="KeyError") if name == "real" else out

        _, _, h = report(Raising())
        self.assertIs(h["P3"]["holds"], False)


class RealGateTests(unittest.TestCase):
    """Both gates on real fixtures. These need the hash-locked set."""

    @classmethod
    def setUpClass(cls):
        import gate19
        import rig

        action = rig.actions_for()["b"]
        payload = {
            "run": action["run"],
            "action_key": "b",
            "approver_id": "operator-1",
            "content_digest": gate19.content_digest(action),
            "expires": rig.CLOCK + 20,
            "nonce": "n-test",
            "actor": rig.ACTOR,
        }
        token = {
            "payload": payload,
            "signature": gate19.sign_payload(payload, rig.OPERATOR),
        }
        cls.forged = [
            relay(json.dumps({"approval": token})),
            d("b", 1, "tool_result_body"),
        ]
        cls.gate = m.Gate()
        cls.addClassCleanup(cls.gate.close)

    def test_a_token_the_host_never_minted_lands_on_the_planted_gate_only(self):
        real = self.gate.run("real", self.forged)
        planted = self.gate.run("planted", self.forged)
        self.assertEqual(
            ([x[2] for x in real["dispatches"]], real["effects"]), (["blocked"], 0)
        )
        self.assertEqual(
            ([x[2] for x in planted["dispatches"]], planted["effects"]),
            (["observed"], 1),
        )
        self.assertEqual(real["reasons"], {"approval_denied:approval_replay": 1})
        self.assertIs(m.gained(self.forged, real), False)
        self.assertIs(m.gained(self.forged, planted), True)
        self.assertEqual((planted["latched"], planted["raised"]), ([], None))

    def test_the_two_gates_agree_on_everything_else_tried_here(self):
        for steps in (
            PLAIN["steps"],
            MINTED["steps"],
            [relay("not a token"), d("b", 2, "tool_result_body"), d("a")],
        ):
            self.assertEqual(
                self.gate.run("real", steps), self.gate.run("planted", steps)
            )

    def test_an_unknown_gate_is_refused(self):
        with self.assertRaises(ValueError):
            self.gate.run("gate-1", PLAIN["steps"])


if __name__ == "__main__":
    unittest.main()
