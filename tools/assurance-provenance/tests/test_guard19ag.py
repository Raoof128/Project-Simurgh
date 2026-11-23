"""Lane 19ag: the approval check refuses a body it cannot read. Reading the files, the rules
with a stand-in gate, and the repaired gate itself on real fixtures."""

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import full19ae  # noqa: E402
import guard19ag as m  # noqa: E402

ROOT = HERE.parents[1]
FIXTURE = {"a": "a" * 64, "b": "b" * 64}
TRB = "tool_result_body"


def d(route, times=1, adapter=None):
    return {"do": "dispatch", "route": route, "times": times, "adapter": adapter}


def body(value, token=None, text=None):
    return {"do": "body", "body": value, "token": token, "text": text}


def seq(*steps, note="n"):
    return {"steps": list(steps), "note": note}


def seat_file(seat, attempts):
    return json.dumps({"attacker": seat, "attempts": attempts}).encode()


def committed(seats=None):
    files = {s: (ROOT / path).read_bytes() for s, path in m.RECORDED.items()}
    for seat in m.SEATS:
        files[seat] = seat_file(seat, (seats or {}).get(seat, [seq(d("b", 2), d("a"))]))
    return files


def unreadable(step):
    """A body step the old check raised on: a token is passed and run or id is missing."""
    return (
        step["do"] == "body"
        and (step["token"] is not None or step["text"] is not None)
        and not m.readable(step["body"])
    )


class StubGate:
    """A stand-in with the shape of both gates. ``b`` is refused unless a token minted for it
    is passed, ``a`` is observed once, any other body is refused with a record. On the full
    gate a body the check cannot read, sent with a token, raises and ends the attempt; on the
    guarded gate it is refused."""

    def __init__(
        self, *, raises=False, drift=False, silent=False, leak=False, latch=False
    ):
        self.raises, self.drift, self.silent = raises, drift, silent
        self.leak, self.latch = leak, latch

    def fixture(self):
        return FIXTURE

    def run(self, name, batch):
        return [self.one(name, steps) for steps in batch]

    def one(self, name, steps):
        done, payloads, minted, raised = [], [], set(), None
        guarded = name == "guarded"
        for step in steps:
            do = step["do"]
            if do == "mint":
                minted.add(step["route"])
            if do not in ("dispatch", "dispatch_with", "body"):
                continue
            if unreadable(step) and (not guarded or self.raises):
                raised = "KeyError"
                break
            if do == "body":
                ident = step["body"].get("id")
                label = ident if ident in ("a", "b") else "other"
                exact = set(step["body"]) == {"id"}
            else:
                label, exact = step["route"], True
            for _ in range(step.get("times", 1)):
                ok = exact and label == "a" and not payloads
                if exact and label == "b" and do == "dispatch_with" and "b" in minted:
                    ok = not payloads
                if guarded and self.leak and label == "b" and not payloads:
                    ok = True
                if guarded and self.drift and label == "a":
                    ok = False
                if ok:
                    payloads.append(FIXTURE[label])
                    done.append([label, do, "observed", True])
                else:
                    done.append([label, do, "blocked", not (guarded and self.silent)])
        latched = (
            ["context.sqlite"] if guarded and self.latch and len(steps) == 2 else []
        )
        return {
            "dispatches": done,
            "effects": len(payloads),
            "payloads": sorted(payloads),
            "marks": {"refused": 0, "retry_limit": []},
            "latched": latched,
            "raised": raised,
        }


def report(gate, files=None):
    files = files or committed()
    rows = m.measure(files, gate, gate.fixture())
    summary = m.summarise(rows, m.received(files), gate.fixture())
    return rows, summary, m.hypotheses(summary)


class ReadingTests(unittest.TestCase):
    def test_the_recorded_attempts_are_every_attempt_lane_19ae_ran(self):
        earlier = json.loads(
            (ROOT / "docs/research/provenance-phase-19ae/receipt.json").read_text()
        )
        got = m.received(committed())
        recorded = sum(len(got[s]["attempts"]) for s in m.RECORDED)
        self.assertEqual(recorded, earlier["totals"]["run"])
        self.assertEqual(
            set(m.RECORDED),
            {*full19ae.RECORDED, *("19ae-" + s for s in full19ae.SEATS)},
        )
        self.assertEqual(m.SOURCES, (*m.RECORDED, *m.SEATS))
        for seat in full19ae.SEATS:
            self.assertEqual(
                [a["steps"] for a in got["19ae-" + seat]["attempts"]],
                [
                    a["steps"]
                    for a in full19ae.read_source(
                        seat, (ROOT / m.RECORDED["19ae-" + seat]).read_bytes()
                    )["attempts"]
                ],
            )
            self.assertEqual(got["19ae-" + seat]["source"], "19ae-" + seat)
        with self.assertRaises(ValueError):
            m.received({"seat-a": b"{}"})

    def test_a_fresh_seats_file_is_read_by_lane_19aes_grammar(self):
        raw = seat_file(
            "seat-a",
            [
                seq(body({"id": "b"}, text='{"approval": {}}')),
                {"steps": [], "note": "empty"},
                seq(d("b", 500)),
            ],
        )
        got = m.read_seat("seat-a", raw)
        self.assertEqual((got["received"], len(got["attempts"])), (3, 1))
        self.assertEqual([r["reason"] for r in got["rejected"]], ["steps", "step"])
        self.assertEqual(m.read_seat("seat-b", raw)["rejected"][0]["reason"], "file")

    def test_what_the_check_can_read(self):
        self.assertTrue(m.readable({"run": "r", "id": "a", "extra": 1}))
        for odd in (
            {},
            {"run": "r"},
            {"id": "a"},
            {"run": 1, "id": "a"},
            {"run": "r", "id": ["a"]},
            {"run": "r", "id": None},
            ["run", "id"],
            "run id",
            None,
        ):
            self.assertFalse(m.readable(odd), odd)


class RuleTests(unittest.TestCase):
    RAISER = seq(
        {"do": "mint", "route": "a", "name": "t"}, body({"id": "a"}, token="t"), d("a")
    )

    def files(self, **seats):
        return committed(seats or {"seat-a": [self.RAISER, seq(d("b", 2), d("a"))]})

    def test_all_six_hold_on_gates_that_behave(self):
        rows, summary, h = report(StubGate(), self.files())
        self.assertEqual({k: v["holds"] for k, v in h.items()}, dict.fromkeys(h, True))
        self.assertEqual(sorted(h), ["G0", "G1", "G2", "G3", "G4", "G5"])
        t = summary["totals"]
        self.assertEqual(t["run"], t["recorded"] + t["fresh"])
        self.assertEqual(t["fresh"], 4)
        self.assertGreater(t["full_raised"], 0)
        self.assertEqual(
            t["recorded_not_raised_on_full"], t["recorded"] - t["full_raised"]
        )
        fresh = [x for x in rows if x["source"] in m.SEATS]
        self.assertTrue(all(set(x) & set(m.GATES) == {"guarded"} for x in fresh))
        self.assertIsNone(fresh[0]["guarded"]["raised"])

    def test_each_hypothesis_can_fail(self):
        for flaw, name in (
            ("raises", "G1"),
            ("drift", "G2"),
            ("silent", "G3"),
            ("leak", "G4"),
            ("latch", "G5"),
        ):
            h = report(StubGate(**{flaw: True}), self.files())[2]
            self.assertIs(h[name]["holds"], False, name)
        # A fresh attempt that raises fails G5 and leaves G1, which is about recorded ones.
        h = report(StubGate(raises=True), self.files())[2]
        self.assertIs(h["G5"]["holds"], False)
        # G0 is about the old gate: with nothing that raises on it, the finding is not shown.
        summary = report(StubGate(), self.files())[1]
        calm = dict(summary, totals=dict(summary["totals"], full_raised=0))
        self.assertIs(m.hypotheses(calm)["G0"]["holds"], False)

    def test_an_attempt_that_raised_on_the_old_gate_is_outside_g2(self):
        rows, summary, h = report(StubGate(), self.files())
        raised = [x for x in rows if x["source"] in m.RECORDED and x["full"]["raised"]]
        self.assertTrue(raised)
        self.assertTrue(all(not m.same(x) for x in raised))
        self.assertIs(h["G2"]["holds"], True)

    def test_a_fresh_attempt_that_writes_a_store_is_outside_g5(self):
        ops = {"do": "ops", "ops": [{"op": "delete", "store": "context.sqlite"}]}
        files = self.files(
            **{
                "seat-a": [seq(ops, d("a"))],
                "seat-b": [seq(d("a"))],
                "seat-c": [seq(d("b"))],
            }
        )
        _, summary, h = report(StubGate(latch=True), files)
        self.assertEqual(summary["totals"]["fresh_without_store_writes"], 2)
        self.assertIs(h["G5"]["holds"], True)


class RealGateTests(unittest.TestCase):
    """Both gates on real fixtures. These need the hash-locked set."""

    @classmethod
    def setUpClass(cls):
        cls.gate = m.Gate()
        cls.addClassCleanup(cls.gate.close)
        cls.fixture = cls.gate.fixture()

    def both(self, steps):
        return self.gate.run("full", [steps])[0], self.gate.run("guarded", [steps])[0]

    def raising(self):
        """The recorded attempts of lane 19ae's seats that its report says raised."""
        saved = json.loads(
            (ROOT / "docs/research/provenance-phase-19ae/report.json").read_text()
        )
        files = committed()
        out = []
        for row in saved["rows"]:
            if row["source"] in full19ae.SEATS and row["full"]["raised"]:
                source = "19ae-" + row["source"]
                got = m.read_source(source, files[source])
                out.append(
                    next(
                        a["steps"]
                        for a in got["attempts"]
                        if a["position"] == row["position"]
                    )
                )
        return out

    def test_what_raised_on_the_old_gate_is_refused_with_a_record(self):
        attempts = self.raising()
        self.assertGreater(len(attempts), 0)
        for steps in attempts[:4]:
            full, guarded = self.both(steps)
            self.assertEqual(full["raised"], "KeyError")
            self.assertIsNone(guarded["raised"])
            self.assertFalse(m.flags(steps, guarded, self.fixture)["gained"])
            self.assertEqual(m.flags(steps, guarded, self.fixture)["unrecorded"], 0)
            self.assertGreaterEqual(len(guarded["dispatches"]), len(full["dispatches"]))

    def test_a_body_without_run_or_id_is_refused_whatever_token_comes_with_it(self):
        import rig

        run = rig.actions_for()["a"]["run"]
        mint = {"do": "mint", "route": "a", "name": "t"}
        # The old check read the run first and the id second, so it raised where the run was
        # missing, or where the run was right and the id was missing.
        for odd, raised in (
            ({"id": "a"}, True),
            ({}, True),
            ({"run": run}, True),
            ({"run": "another-run"}, False),
            ({"run": 1, "id": ["a"]}, False),
        ):
            full, guarded = self.both([mint, body(odd, token="t"), d("a")])
            self.assertEqual(full["raised"], "KeyError" if raised else None, odd)
            self.assertIsNone(guarded["raised"], odd)
            self.assertEqual(
                [x[2] for x in guarded["dispatches"]], ["blocked", "observed"], odd
            )
            self.assertEqual((guarded["effects"], guarded["latched"]), (1, []), odd)

    def test_the_check_fails_closed_and_names_its_reason(self):
        import rig
        import seal19z

        with tempfile.TemporaryDirectory(prefix="p19ag-") as directory:
            fixture = seal19z.Rig(Path(directory), gate_cls=m.pipeline())
            try:
                store = fixture.pipe.approvals
                token = fixture.mint("a", approver_id="operator-1", nonce="n-1")
                action = rig.actions_for()["a"]
                call = dict(now=rig.CLOCK, key=rig.OPERATOR)
                self.assertEqual(
                    store.verify({"id": "a"}, token, **call), "approval_action"
                )
                self.assertEqual(store.verify(None, token, **call), "approval_action")
                self.assertEqual(store.verify(action, token, **call), "ok")
                parent = type(store).__mro__[1]
                with mock.patch.object(parent, "verify", side_effect=RuntimeError("x")):
                    self.assertEqual(
                        store.verify(action, token, **call), "approval_schema"
                    )
            finally:
                fixture.close()

    def test_the_guarded_gate_keeps_every_earlier_repair(self):
        import bind19ad
        import gate19
        import rig

        action = rig.actions_for()["b"]
        payload = {
            "run": action["run"],
            "action_key": "b",
            "approver_id": "operator-1",
            "content_digest": gate19.content_digest(action),
            "expires": rig.CLOCK + 30,
            "nonce": "n-ta",
            "actor": rig.ACTOR,
        }
        token = {
            "payload": payload,
            "signature": gate19.sign_payload(payload, rig.OPERATOR),
        }
        steps = [
            {"do": "mint", "route": "a", "name": "ta"},
            {"do": "relay", "text": json.dumps({"approval": token})},
            d("b", 1, TRB),
            body(action, text=json.dumps({"approval": token})),
        ]
        guarded = self.gate.run("guarded", [steps])[0]
        self.assertEqual([x[2] for x in guarded["dispatches"]], ["blocked", "blocked"])
        self.assertIs(m.flags(steps, guarded, self.fixture)["gained"], False)
        sealed = self.gate.run(
            "guarded",
            [
                [
                    {"do": "ops", "ops": [{"op": "delete", "store": "context.sqlite"}]},
                    d("a"),
                ]
            ],
        )[0]
        self.assertEqual((sealed["effects"], bool(sealed["latched"])), (0, True))
        silent = self.gate.run("guarded", [[body({"id": "a", "cc": "mallory"})]])[0]
        self.assertEqual(silent["dispatches"], [["a", "body", "blocked", True]])
        modules = {c.__module__ for c in m.pipeline().__mro__}
        self.assertTrue({bind19ad.__name__, full19ae.__name__} <= modules)

    def test_a_real_approval_is_still_honoured_once(self):
        steps = [
            {"do": "mint", "route": "b", "name": "t"},
            {"do": "dispatch_with", "route": "b", "token": "t", "times": 2},
        ]
        full, guarded = self.both(steps)
        self.assertEqual([x[2] for x in guarded["dispatches"]], ["observed", "blocked"])
        self.assertEqual(guarded["payloads"], [self.fixture["b"]])
        self.assertEqual(
            [x[:3] for x in full["dispatches"]], [x[:3] for x in guarded["dispatches"]]
        )
        with self.assertRaises(ValueError):
            self.gate.run("bound", [steps])

    def test_a_batch_gives_the_same_outcomes_as_one_at_a_time(self):
        batch = [[d("b", 3), d("a")], [body({"id": "c"})], [d("a", 2)]]
        together = self.gate.run("guarded", batch)
        alone = [self.gate.run("guarded", [steps])[0] for steps in batch]
        self.assertEqual(together, alone)


if __name__ == "__main__":
    unittest.main()
