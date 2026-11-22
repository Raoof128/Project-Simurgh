"""Lane 19ad: the approval bound to what the host minted. The rules with a stand-in gate, and
the repair itself on real fixtures."""

import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import bind19ad as m  # noqa: E402

TRB = "tool_result_body"


def d(route, times=1, adapter=None):
    return {"do": "dispatch", "route": route, "times": times, "adapter": adapter}


def mint(route, name):
    return {"do": "mint", "route": route, "name": name}


def relay(text):
    return {"do": "relay", "text": text}


def seq(*steps, note="n"):
    return {"steps": list(steps), "note": note}


def file(name, attempts):
    return json.dumps({"attacker": name, "attempts": attempts}).encode()


REBIND = seq(mint("a", "ta"), relay("REBIND"), d("b", 1, TRB), note="b on a's nonce")
RESIGN = seq(
    mint("b", "tb"), relay("REBIND"), d("b", 1, TRB), note="b re-signed, b approved"
)
PLAIN = seq(d("b"), d("a"), note="the baseline")
REAL = seq(
    mint("b", "tb"),
    {"do": "dispatch_with", "route": "b", "token": "tb", "times": 2},
    note="real",
)


class StubGate:
    """``before`` admits a relayed REBIND token when any approval was minted. ``bound`` does
    not, unless ``unrepaired``. ``regress`` makes the bound gate refuse a real approval."""

    def __init__(self, *, unrepaired=False, regress=False):
        self.unrepaired, self.regress = unrepaired, regress

    def run(self, name, steps):
        done, minted, forged, effects, spent = [], set(), False, 0, False
        loose = name == "before" or self.unrepaired
        for step in steps:
            if step["do"] == "mint":
                minted.add(step["route"])
            elif step["do"] == "relay":
                forged = step.get("text") == "REBIND"
            elif step["do"] == "dispatch":
                for _ in range(step["times"]):
                    ok = step["route"] == "a"
                    if (
                        step["route"] == "b"
                        and forged
                        and minted
                        and loose
                        and not spent
                    ):
                        ok, spent = True, True
                    effects += ok
                    kind = "adapter" if step["adapter"] else "plain"
                    done.append([step["route"], kind, "observed" if ok else "blocked"])
            else:
                for _ in range(step["times"]):
                    ok = not spent and not (self.regress and name == "bound")
                    spent = spent or ok
                    effects += ok
                    done.append(
                        [
                            step["route"],
                            "token:" + step["route"],
                            "observed" if ok else "blocked",
                        ]
                    )
        return {
            "dispatches": done,
            "effects": effects,
            "reasons": {},
            "latched": [],
            "raised": None,
        }


def files(**over):
    base = {
        "19aa-author": file("author", [PLAIN, REAL]),
        "19ac-author": file("author", [PLAIN]),
        "19ac-seat-a": file("seat-a", [REBIND, REBIND, REBIND]),
        "19ac-seat-b": file("seat-b", [REBIND, REBIND, REBIND, PLAIN]),
        "author": file("author", [REBIND, RESIGN, REAL]),
    }
    return {**base, **over}


def report(gate, given=None):
    given = given or files()
    rows = m.measure(given, gate)
    summary = m.summarise(rows, m.received(given))
    return rows, summary, m.hypotheses(summary)


class RuleTests(unittest.TestCase):
    def test_five_sources_read_by_the_lanes_that_own_them(self):
        self.assertEqual(
            list(m.SOURCES),
            ["19aa-author", "19ac-author", "19ac-seat-a", "19ac-seat-b", "author"],
        )
        got = m.received(files())
        self.assertEqual(
            {s: len(v["attempts"]) for s, v in got.items()},
            {
                "19aa-author": 2,
                "19ac-author": 1,
                "19ac-seat-a": 3,
                "19ac-seat-b": 4,
                "author": 3,
            },
        )
        self.assertEqual(got["19ac-seat-a"]["source"], "19ac-seat-a")
        wrong = m.read_attempts("19ac-seat-a", file("seat-b", [PLAIN]))
        self.assertEqual(wrong["rejected"], [{"position": None, "reason": "file"}])
        with self.assertRaises(ValueError):
            m.received({"author": b"{}"})

    def test_a_forged_token_is_admitted_when_b_is_observed_with_no_minted_token(self):
        out = {"dispatches": [["b", "adapter", "observed"]]}
        self.assertIs(m.forged_admitted(out), True)
        for kind, verdict in (
            ("token:b", "observed"),
            ("relayed:b", "observed"),
            ("adapter", "blocked"),
        ):
            self.assertIs(
                m.forged_admitted({"dispatches": [["b", kind, verdict]]}), False
            )
        self.assertIs(
            m.forged_admitted({"dispatches": [["a", "adapter", "observed"]]}), False
        )

    def test_all_four_hold_when_the_repair_works_and_changes_nothing_else(self):
        rows, summary, h = report(StubGate())
        self.assertEqual(
            {k: v["holds"] for k, v in h.items()},
            dict.fromkeys(("D0", "D1", "D2", "D3"), True),
        )
        t = summary["totals"]
        self.assertEqual((t["run"], t["before_gained"], t["bound_gained"]), (13, 7, 0))
        self.assertEqual((t["seats_before_gained"], t["author_before_gained"]), (6, 1))
        self.assertEqual(
            (
                t["no_forged_token_admitted_before"],
                t["no_forged_token_admitted_before_same_on_bound"],
            ),
            (5, 5),
        )
        self.assertEqual(
            (
                t["resigned_for_an_approved_action"],
                t["resigned_for_an_approved_action_admitted_on_bound"],
            ),
            (1, 0),
        )
        self.assertEqual(
            set(rows[0]),
            {
                "source",
                "position",
                "steps_sha256",
                "steps_count",
                "note",
                "before",
                "bound",
            },
        )

    def test_a_repair_that_does_nothing_fails_d1(self):
        _, _, h = report(StubGate(unrepaired=True))
        self.assertEqual((h["D1"]["bound_gained"], h["D1"]["holds"]), (7, False))

    def test_a_repair_that_refuses_a_real_approval_fails_d2(self):
        _, _, h = report(StubGate(regress=True))
        self.assertEqual(
            (
                h["D2"]["no_forged_token_admitted_before"],
                h["D2"]["same_on_bound"],
                h["D2"]["holds"],
            ),
            (5, 3, False),
        )
        self.assertIs(h["D1"]["holds"], True)

    def test_d0_needs_the_six_recorded_gains_and_one_of_the_authors(self):
        _, _, h = report(
            StubGate(), files(**{"19ac-seat-a": file("seat-a", [REBIND, PLAIN])})
        )
        self.assertEqual((h["D0"]["seats_before_gained"], h["D0"]["holds"]), (4, False))
        _, _, h = report(StubGate(), files(author=file("author", [REAL])))
        self.assertEqual(
            (h["D0"]["author_before_gained"], h["D0"]["holds"]), (0, False)
        )

    def test_a_latch_or_raise_on_the_bound_gate_fails_d3(self):
        class Latching(StubGate):
            def run(self, name, steps):
                out = super().run(name, steps)
                return (
                    dict(out, latched=["provenance.sqlite"]) if name == "bound" else out
                )

        _, _, h = report(Latching())
        self.assertIs(h["D3"]["holds"], False)


class RepairTests(unittest.TestCase):
    """Both gates on real fixtures. These need the hash-locked set."""

    @classmethod
    def setUpClass(cls):
        import gate19
        import rig

        def token(route, nonce, **changes):
            action = rig.actions_for()[route]
            payload = {
                "run": action["run"],
                "action_key": route,
                "approver_id": "operator-1",
                "content_digest": gate19.content_digest(action),
                "expires": rig.CLOCK + 30,
                "nonce": nonce,
                "actor": rig.ACTOR,
                **changes,
            }
            signed = {
                "payload": payload,
                "signature": gate19.sign_payload(payload, rig.OPERATOR),
            }
            return json.dumps({"approval": signed})

        cls.token = staticmethod(token)
        cls.clock = rig.CLOCK
        cls.gate = m.Gate()
        cls.addClassCleanup(cls.gate.close)

    def test_a_token_for_b_on_the_nonce_of_as_approval_lands_before_and_not_on_the_bound_gate(
        self,
    ):
        steps = [
            mint("a", "ta"),
            relay(self.token("b", "n-ta")),
            d("b", 1, TRB),
            d("a"),
        ]
        before, bound = self.gate.run("before", steps), self.gate.run("bound", steps)
        self.assertEqual([x[2] for x in before["dispatches"]], ["observed", "blocked"])
        self.assertEqual([x[2] for x in bound["dispatches"]], ["blocked", "observed"])
        self.assertEqual(bound["reasons"], {"approval_denied:approval_replay": 1})
        self.assertEqual(
            (m.gained(steps, before), m.gained(steps, bound)), (True, False)
        )
        self.assertEqual(
            (bound["latched"], bound["raised"], bound["effects"]), ([], None, 1)
        )

    def test_a_real_approval_is_honoured_once_on_the_bound_gate_direct_or_relayed(self):
        direct = [
            mint("b", "tb"),
            {"do": "dispatch_with", "route": "b", "token": "tb", "times": 2},
        ]
        relayed = [mint("b", "tb"), {"do": "relay", "token": "tb"}, d("b", 2, TRB)]
        for steps in (direct, relayed):
            before, bound = (
                self.gate.run("before", steps),
                self.gate.run("bound", steps),
            )
            self.assertEqual(before, bound)
            self.assertEqual(
                [x[2] for x in bound["dispatches"]], ["observed", "blocked"]
            )
            self.assertEqual(bound["latched"], [])

    def test_a_resigned_token_with_another_expiry_is_refused_and_does_not_spend_the_approval(
        self,
    ):
        steps = [
            mint("b", "tb"),
            relay(self.token("b", "n-tb", expires=self.clock + 25)),
            d("b", 1, TRB),
            {"do": "dispatch_with", "route": "b", "token": "tb", "times": 1},
        ]
        before, bound = self.gate.run("before", steps), self.gate.run("bound", steps)
        self.assertEqual([x[2] for x in before["dispatches"]], ["observed", "blocked"])
        self.assertEqual([x[2] for x in bound["dispatches"]], ["blocked", "observed"])
        self.assertEqual(bound["effects"], 1)

    def test_the_repaired_class_is_offered_to_a_caller(self):
        import seal19z

        cls = m.pipeline()
        self.assertTrue(issubclass(cls, seal19z.Pipeline))
        self.assertIsNot(cls, seal19z.Pipeline)
        with self.assertRaises(ValueError):
            self.gate.run("planted", [d("a")])


if __name__ == "__main__":
    unittest.main()
