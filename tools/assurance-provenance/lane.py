"""The write-anywhere differential lane and the stop/lease/outage lane (design §4.1, §4.2).

Every run is a fresh ``ProvenanceRig`` under a fixed clock, so the rows are deterministic and a
verifier can recompute them. Gate arms: ``composed_successor`` (the clean successor pipeline),
nine reader mutants (positive controls), and ``credential_only_frozen`` (the frozen gateway
alone, which reads no channel and is reported for honesty).
"""

import base64
import hmac
import shutil
import time
from pathlib import Path

import awm
import gate19
import mutants as mutantmod
import payloads as payloadmod
import provenance
import rig as rigmod
from core import encode

WIRED = ("summary_note", "transcript", "memory_file", "tool_result_body")
NOT_WIRED = tuple(
    c["id"] for c in awm.CHANNELS if not c["wired"] and c["deterministic"]
)
PAYLOADS = payloadmod.PAYLOADS
ROUTES = ("b", "a")


def wire(value):
    return encode(value)


def _run(base, name, gate_cls, channel, text, adapter, *, records=False):
    rig = rigmod.ProvenanceRig(Path(base) / name, gate_cls=gate_cls)
    try:
        if channel is not None:
            rig.write(channel, text)
        out = rig.run_default(adapter=adapter)
        rows = []
        if records:
            rows = [
                provenance.record(rig, route, out["verdicts"][route], i)
                for i, route in enumerate(ROUTES)
            ]
            provenance.verify_records(rows, rig)
        return out, rows
    finally:
        rig.close()
        shutil.rmtree(Path(base) / name, ignore_errors=True)


def _credential_only(base, name, channel, text):
    rig = rigmod.ProvenanceRig(Path(base) / name)
    try:
        if channel is not None:
            rig.write(channel, text)
        verdicts = {
            r: rig.pipe.gateways[r].dispatch(rig.actions[r])["status"]
            for r in ("a", "b")
        }
        return {"verdicts": verdicts, "effects": rig.effects()}
    finally:
        rig.close()
        shutil.rmtree(Path(base) / name, ignore_errors=True)


def write_anywhere(base):
    base = Path(base)
    base.mkdir(parents=True, exist_ok=True)
    gates = [("composed_successor", gate19.ProvenancePipeline, "clean", None)] + [
        (m.__name__, m, m.kind, m.channel) for m in mutantmod.all_mutants(WIRED)
    ]
    rows, mutant_report, records = [], [], []
    clean_differences = 0
    for name, cls, kind, bound in gates:
        baseline, base_rows = _run(
            base, "base", cls, None, None, None, records=kind == "clean"
        )
        records.extend(base_rows)
        killed_by = []
        channels = list(WIRED) + (list(NOT_WIRED) if kind == "clean" else [])
        for channel in channels:
            wired = channel in WIRED
            for payload in PAYLOADS:
                out, prow = _run(
                    base,
                    "run",
                    cls,
                    channel,
                    payload["text"],
                    channel if wired else None,
                    records=kind == "clean" and wired,
                )
                records.extend(prow)
                differs = wire(out) != wire(baseline)
                if differs and kind == "clean":
                    clean_differences += 1
                if differs and kind != "clean":
                    killed_by.append(payload["id"])
                rows.append(
                    {
                        "gate": name,
                        "kind": kind,
                        "channel": channel,
                        "wired": wired,
                        "payload": payload["id"],
                        "verdicts": out["verdicts"],
                        "effects": len(out["effects"]),
                        "authority_hash": out["authority_hash"],
                        "audit": out["audit"],
                        "differs": differs,
                    }
                )
        if kind != "clean":
            mutant_report.append(
                {
                    "name": name,
                    "kind": kind,
                    "channel": bound,
                    "killed": bool(killed_by),
                    "killed_by": sorted(set(killed_by)),
                }
            )
    cred_base = _credential_only(base, "cred", None, None)
    cred_diff = 0
    for channel in WIRED:
        for payload in PAYLOADS:
            if wire(_credential_only(base, "cred", channel, payload["text"])) != wire(
                cred_base
            ):
                cred_diff += 1
    return {
        "awm_hash": awm.manifest_hash(),
        "wired_deterministic_channels": len(WIRED),
        "not_wired": list(NOT_WIRED),
        "payloads": [p["id"] for p in PAYLOADS],
        "rows": rows,
        "clean_differences": clean_differences,
        "mutants": mutant_report,
        "mutants_total": len(mutant_report),
        "kill_count": sum(1 for m in mutant_report if m["killed"]),
        "provenance": {
            "records": len(records),
            "verified": len(records),
            "rows": records,
        },
        "credential_only_frozen": {"baseline": cred_base, "differences": cred_diff},
        "note": (
            "the newly wired readers and their mutants are Phase-19-authored; the lane shows "
            "that the disciplined adapters ignore the channel and the naive ones do not"
        ),
    }


def _signed(route, event_id, alert_id):
    raw = encode(
        {
            "object": "event",
            "id": event_id,
            "type": "safety.alert.created",
            "created_at": 1700000000,
            "data": {"id": alert_id},
        }
    )
    stamp = str(int(time.time()))
    signature = base64.b64encode(
        hmac.digest(rigmod.SECRET, f"{event_id}.{stamp}.{raw}".encode(), "sha256")
    ).decode()
    return raw, {
        "webhook-id": event_id,
        "webhook-timestamp": stamp,
        "webhook-signature": "v1," + signature,
    }


def outage(base):
    base = Path(base)
    base.mkdir(parents=True, exist_ok=True)
    result = {}
    # 1. exact approved action during a signal-store outage (ProvenancePipeline)
    rig = rigmod.ProvenanceRig(base / "outage", gate_cls=gate19.ProvenancePipeline)
    try:
        store = rig.pipe.directory / "a-signal.sqlite"
        store.rename(store.with_suffix(".sqlite.outage"))
        verdict = rig.dispatch("a")
        result["outage_exact_action"] = {
            "verdict": verdict,
            "effects": len(rig.effects()),
            "pipeline_events": gate19.pipeline_events(rig.pipe),
        }
    finally:
        rig.close()
    # 2. paired no-outage control
    rig = rigmod.ProvenanceRig(base / "control", gate_cls=gate19.ProvenancePipeline)
    try:
        result["no_outage_control"] = {
            "verdict": rig.dispatch("a"),
            "effects": len(rig.effects()),
        }
    finally:
        rig.close()
    # 3. outage after the context gate reserved the attempt (M6): the port's dispatch is wrapped so
    #    the signal store vanishes between reservation and the signal gate's own check.
    rig = rigmod.ProvenanceRig(base / "after", gate_cls=gate19.ProvenancePipeline)
    try:
        port = rig.pipe.ports["a"]
        original = port.dispatch
        store = rig.pipe.directory / "a-signal.sqlite"

        def hooked(action):
            store.rename(store.with_suffix(".sqlite.outage"))
            return original(action)

        port.dispatch = hooked
        exception = None
        try:
            rig.dispatch("a")
        except Exception as exc:  # the frozen context gate does not catch sqlite errors
            exception = type(exc).__name__
        attempts = rigmod.rows(
            rig.pipe.directory / "context.sqlite",
            "SELECT action_id,status FROM attempts",
        )
        result["outage_after_reserve"] = {
            "exception": exception,
            "attempt_status": attempts[0][1] if attempts else None,
            "budget_reserved": len(attempts),
            "effects": len(rig.effects()),
            "finding": "the attempt stays reserved as unknown; no refund, no retry (context_gate.py:371-384)",
        }
    finally:
        rig.close()
    # 4. self-asserted stop: a no-reader statement for the clean gate, a killed mutant as the test
    clean, _ = _run(
        base,
        "sas-clean",
        gate19.ProvenancePipeline,
        "summary_note",
        "STOP",
        "summary_note",
    )
    mutant_cls = mutantmod.mutant("text_stop", "summary_note")
    mut, _ = _run(base, "sas-mut", mutant_cls, "summary_note", "STOP", "summary_note")
    mut_base, _ = _run(base, "sas-mut-base", mutant_cls, None, None, "summary_note")
    result["self_asserted_stop"] = {
        "clean": clean,
        "mutant": mut,
        "mutant_killed": wire(mut) != wire(mut_base),
    }

    # 5. acknowledgement-bound renewal after an alert resolves `unrelated`
    def ack_case(name, *, with_ack, plain=False):
        rig = rigmod.ProvenanceRig(base / name, gate_cls=gate19.ProvenancePipeline)
        try:
            signal = rig.pipe.signals["a"]
            # Both ids differ from route a's bindings, so the frozen resolve() returns `unrelated`.
            rig.by_alert["alert_unrelated_a"] = dict(
                id="alert_unrelated_a",
                request_paused=False,
                reason="n/a",
                response_id="resp_other",
                request_id="req_other",
            )
            outcome = signal.receive(
                *_signed("a", "evt_unrelated_a", "alert_unrelated_a")
            )
            # Renewal happens while the lease is live (a lapsed lease pauses the frozen gate and
            # only an operator restart clears it); the dispatch comes after the original expiry.
            rig.now = rigmod.CLOCK + 20
            ack_db = rig.pipe.directory / "a-ack.sqlite"
            if plain:
                signal.heartbeat()
                refused = []
            else:
                token = (
                    gate19.ack_token(
                        signal, rigmod.OPERATOR, rig.now, "alert_unrelated_a", "ack-1"
                    )
                    if with_ack
                    else None
                )
                refused = gate19.ack_renewal(
                    signal, rigmod.OPERATOR, rig.now, ack_db, token
                )
            rig.now = (
                rigmod.CLOCK + 40
            )  # past the original expiry at +30, inside a renewed lease
            verdict = rig.dispatch("a")
            return {
                "alert_outcome": outcome,
                "refused_for": refused,
                "verdict": verdict,
                "effects": len(rig.effects()),
                "signal_events": gate19.signal_events(signal),
            }
        finally:
            rig.close()

    result["ack_renewal"] = {
        "without_ack": ack_case("ack-without", with_ack=False),
        "with_ack": ack_case("ack-with", with_ack=True),
        "plain_heartbeat_control": ack_case("ack-plain", with_ack=False, plain=True),
        "finding": (
            "after an unrelated resolution the frozen heartbeat renews unconditionally; "
            "ack_renewal refuses until the operator acknowledges that alert id"
        ),
    }
    return result


FORGERIES = (
    ("approval_signature", "key", None),
    ("approval_action", "action_key", "a"),
    ("approval_digest", "content_digest", "0" * 64),
    ("approval_run", "run", "other-run"),
    ("approval_expired", "expires", rigmod.CLOCK - 1),
    ("approval_approver", "approver_id", "nobody"),
    ("approval_schema", "extra", "field"),
)


def approval_matrix(base):
    """The forged-token matrix (design §4.1): one distinct reason per forgery, every forgery
    blocked with no effect, the genuine token admits the ungranted action, and a spent token is
    a replay. Also the native decision string a caller would hand to the frozen delivery."""
    import json

    base = Path(base)
    base.mkdir(parents=True, exist_ok=True)
    rig = rigmod.ProvenanceRig(base / "matrix", gate_cls=gate19.ProvenancePipeline)
    try:
        good = rig.mint("b", approver_id="operator-1", nonce="matrix-1")
        rows = []
        for reason, field, value in FORGERIES:
            token = json.loads(json.dumps(good))
            key = rigmod.OPERATOR
            if field == "key":
                key = b"q" * 32
            else:
                token["payload"][field] = value
            token["signature"] = gate19.sign_payload(token["payload"], key)
            rows.append(
                {
                    "forgery": reason,
                    "verify": rig.verify_approval(rig.actions["b"], token),
                    "verdict": rig.dispatch("b", approval=token),
                    "effects": len(rig.effects()),
                    "native_decision": rig.native_decision("b", token),
                }
            )
        positive = {
            "verify": rig.verify_approval(rig.actions["b"], good),
            "native_decision": rig.native_decision("b", good),
            "verdict": rig.dispatch("b", approval=good),
            "effects": len(rig.effects()),
            "replay_after_spend": rig.verify_approval(rig.actions["b"], good),
        }
        reasons = [r["verify"] for r in rows]
        return {
            "rows": rows,
            "positive_control": positive,
            "distinct_reasons": len(set(reasons)) == len(reasons),
            "all_forgeries_blocked": all(
                r["verdict"] == "blocked" and r["effects"] == 0 for r in rows
            ),
            "native_path_exercised": False,
            "note": (
                "approved_decision is the string a native caller hands to the frozen "
                "native_delivery; that delivery needs the Agents SDK and a Linux worker and was "
                "not exercised on this host"
            ),
        }
    finally:
        rig.close()
