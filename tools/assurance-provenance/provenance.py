"""Provenance-tagged decision records (design §4.1b).

One row per dispatch: the verdict, and for every authority input the gate consumed, its class and
the digest of the host state it was derived from. Rows are HMAC-signed under the fixture operator
key; ``verify_records`` recomputes every class and digest from the host tables and rejects a
relabelled class or altered digest with ``provenance_mismatch``. The signer is a fixture; an
operator-held key is ``IOU-19-OPERATOR``.
"""

import copy
import hashlib
import hmac
import json
from pathlib import Path

import awm
import rig as rigmod
from core import encode

SCHEMA = "simurgh-phase19-provenance-record-v1"
CLASSES = ("host_state", "operator_signed", "issuer", "operator_signed_approval")
IMPL_FILES = (
    rigmod.ROOT / "tools/assurance-composed-successor/successor.py",
    rigmod.ROOT / "tools/assurance-composed/composition.py",
    rigmod.ROOT / "tools/assurance-context/context_gate.py",
    rigmod.ROOT / "tools/assurance-signals/signals.py",
    rigmod.ROOT / "tools/assurance-credentials/gateway.py",
)


def sha(value):
    return hashlib.sha256(encode(value).encode()).hexdigest()


def impl_hash():
    h = hashlib.sha256()
    for path in IMPL_FILES:
        h.update(Path(path).read_bytes())
    return h.hexdigest()


def authority_inputs(rig, route):
    d = rig.pipe.directory
    grants = rigmod.rows(
        d / "context.sqlite",
        "SELECT actor,parent,actions,depth,source,revoked FROM grants ORDER BY actor",
    )
    signal = rigmod.rows(
        d / (route + "-signal.sqlite"), "SELECT terminal,paused FROM state"
    )
    lease = rigmod.rows(d / (route + "-signal.sqlite"), "SELECT lease_until FROM state")
    decisions = rigmod.rows(
        d / (route + "-signal.sqlite"), "SELECT nonce FROM decisions ORDER BY nonce"
    )
    policy = rigmod.rows(
        d / (route + "-port.sqlite"),
        "SELECT identity,approved,control,revoked FROM policy ORDER BY identity",
    )
    return [
        {"kind": "grant", "class": "host_state", "source_digest": sha(grants)},
        {"kind": "stop", "class": "host_state", "source_digest": sha(signal)},
        {"kind": "lease", "class": "host_state", "source_digest": sha(lease)},
        {
            "kind": "operator_decision",
            "class": "operator_signed",
            "source_digest": sha(decisions),
        },
        {"kind": "credential", "class": "issuer", "source_digest": sha(policy)},
    ]


def unsigned(row):
    return {k: v for k, v in row.items() if k != "signature"}


def sign(row, key):
    return hmac.new(key, encode(unsigned(row)).encode(), hashlib.sha256).hexdigest()


def record(rig, route, verdict, decision_id, *, key=rigmod.OPERATOR):
    row = {
        "schema": SCHEMA,
        "decision_id": decision_id,
        "action_key": route,
        "verdict": verdict,
        "gate_class": type(rig.pipe).__name__,
        "authority_inputs": authority_inputs(rig, route),
        "awm_hash": awm.manifest_hash(),
        "impl_hash": impl_hash(),
    }
    row["signature"] = sign(row, key)
    return row


def clone(rows):
    return copy.deepcopy(rows)


def verify_records(rows, rig, *, key=rigmod.OPERATOR):
    for row in rows:
        if type(row) is not dict or row.get("schema") != SCHEMA:
            raise ValueError("provenance_schema")
        if not hmac.compare_digest(row.get("signature", ""), sign(row, key)):
            raise ValueError("provenance_signature")
        expected = authority_inputs(rig, row["action_key"])
        if encode(row["authority_inputs"]) != encode(expected):
            raise ValueError("provenance_mismatch")
        if row["awm_hash"] != awm.manifest_hash() or row["impl_hash"] != impl_hash():
            raise ValueError("provenance_binding")
    return len(rows)


def dumps(rows):
    return json.dumps(rows, sort_keys=True, separators=(",", ":")) + "\n"
