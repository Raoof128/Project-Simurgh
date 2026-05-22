"""
Proof protocol stub for Project Simurgh.

This stub mirrors the logic in:
  - src/device/daemonProof.js (E1 triple check, canonical serialisation)
  - src/integrity/proofValidator.js (browser-paired proof validation)
  - src/academic/riskScoring.js (risk scoring)
  - src/audit/hmacChain.js (HMAC audit chain)

All signatures use typed stubs — not a runnable implementation.
"""

from __future__ import annotations
import hashlib
import hmac
import json
import time
from dataclasses import dataclass, field
from typing import Literal, Optional

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

RiskLevel = Literal["Critical", "Warning", "Safe"]
ReasonCode = Literal[
    "invalid_signature", "nonce_replayed", "node_mismatch",
    "forbidden_local_field", "missing_field", "schema_invalid",
    "node_already_paired", "challenge_expired", "ok"
]

@dataclass
class DaemonProof:
    type: str
    session_id: str
    exam_id: str
    sequence: int
    timestamp: float
    node_id_hash: str          # "sha256:<64 hex chars>"
    daemon_version: str
    platform: str
    capture_excluded_window_count: int
    helper_state: str
    challenge: str             # base64url, server-issued 32-byte token
    signature: str             # base64url ECDSA P-256 signature

@dataclass
class BrowserPairedProof:
    version: str               # "simurgh-integrity-proof-v1"
    platform: str
    session_id: str
    node_id_hash: str          # 64-char lowercase hex (bare, no prefix)
    node_public_key: str       # base64, 32 bytes Ed25519
    nonce: str                 # base64, 12-64 bytes
    timestamp: float
    capabilities: dict         # exactly 4 boolean keys
    signals: dict              # exactly 4 defined keys
    privacy_mode: str          # "metadata_only"
    signature: str             # base64, 64 bytes Ed25519

@dataclass
class ValidationResult:
    ok: bool
    reason: ReasonCode

@dataclass
class RiskOutput:
    risk_level: RiskLevel
    risk_score: int            # 0-100
    confidence: float          # 0.5 + risk_score/200, clamped to [0,1]
    categories: dict[str, int] # 8 categories, each 0-100
    recommendation: str        # hard-coded literal string

@dataclass
class AuditEntry:
    seq: int
    ts: float
    type: str
    payload: dict
    prev: str                  # HMAC of previous entry or "GENESIS"
    sig: str                   # HMAC of this entry (before sig appended)

# ---------------------------------------------------------------------------
# Canonical Serialisation (two distinct implementations)
# ---------------------------------------------------------------------------

def canonicalise_browser_paired_proof(proof_fields: dict) -> str:
    """
    Recursive key-sorted JSON for browser-paired integrity proofs.
    Mirrors src/integrity/proofCanonicalise.js and simurgh-node-macos Swift.
    EXCLUDES 'signature' field.
    """
    def _sort(obj):
        if isinstance(obj, dict):
            return {k: _sort(obj[k]) for k in sorted(obj.keys())}
        if isinstance(obj, list):
            return [_sort(x) for x in obj]
        return obj

    fields_without_sig = {k: v for k, v in proof_fields.items() if k != "signature"}
    return json.dumps(_sort(fields_without_sig), separators=(",", ":"))


def canonicalise_daemon_payload(proof_fields: dict) -> str:
    """
    Top-level key-sorted JSON for device-shield daemon proofs.
    Mirrors src/device/daemonProof.js:canonicaliseDaemonPayload
    and tools/simurgh-daemon-linux/src/canonical_json.rs.
    EXCLUDES 'signature' field.
    """
    copy = {k: proof_fields[k] for k in sorted(proof_fields.keys()) if k != "signature"}
    return json.dumps(copy, separators=(",", ":"))

# ---------------------------------------------------------------------------
# E1 Triple Check (Device-Shield Daemon Proof)
# ---------------------------------------------------------------------------

def compute_daemon_node_id_hash(public_key_bytes: bytes) -> str:
    """Returns 'sha256:<64 hex chars>'."""
    digest = hashlib.sha256(public_key_bytes).hexdigest()
    return f"sha256:{digest}"


def validate_daemon_proof(
    proof: DaemonProof,
    public_key_spki_bytes: bytes,
    *,
    now: float = None,
    expected_session_id: Optional[str] = None,
    paired_node_id_hash: Optional[str] = None,
    consumed_challenges: set[str] = None,
) -> ValidationResult:
    """
    E1 triple check + N1 node-continuity + challenge consumption.
    Uniform 'invalid_signature' reason for all E1 failures (oracle prevention).

    Mirrors: src/device/daemonProof.js:validateDaemonProof
    """
    now = now or time.time() * 1000  # ms

    # Timestamp window
    PAST_MS = 30_000
    FUTURE_MS = 5_000
    if proof.timestamp < now - PAST_MS or proof.timestamp > now + FUTURE_MS:
        return ValidationResult(ok=False, reason="invalid_signature")

    # (a) node_id_hash == SHA-256(pubkey)
    expected_hash = compute_daemon_node_id_hash(public_key_spki_bytes)
    if proof.node_id_hash != expected_hash:
        return ValidationResult(ok=False, reason="invalid_signature")

    # (b) pubkey matches session-registered key
    if paired_node_id_hash and proof.node_id_hash != paired_node_id_hash:
        return ValidationResult(ok=False, reason="invalid_signature")

    # (c) signature verifies
    canonical = canonicalise_daemon_payload(proof.__dict__)
    # NOTE: actual ECDSA P-256 verification requires cryptography library;
    # omitted from stub — see src/device/daemonProof.js:verifyDaemonSignature
    signature_valid: bool = _verify_ecdsa_p256(canonical, public_key_spki_bytes, proof.signature)
    if not signature_valid:
        return ValidationResult(ok=False, reason="invalid_signature")

    # N1: node continuity (session-level check)
    if expected_session_id and proof.session_id != expected_session_id:
        return ValidationResult(ok=False, reason="node_mismatch")

    # Challenge consumption (device-shield specific)
    if consumed_challenges is not None:
        if proof.challenge in consumed_challenges:
            return ValidationResult(ok=False, reason="nonce_replayed")
        consumed_challenges.add(proof.challenge)

    return ValidationResult(ok=True, reason="ok")


def _verify_ecdsa_p256(canonical: str, public_key_spki: bytes, signature_b64url: str) -> bool:
    """Stub — actual implementation uses Node.js crypto.verify('sha256', ...)."""
    raise NotImplementedError("Requires cryptography library; see daemonProof.js:verifyDaemonSignature")

# ---------------------------------------------------------------------------
# Risk Scoring
# ---------------------------------------------------------------------------

WEIGHTS = {
    "paste_risk": 0.25,
    "focus_risk": 0.18,
    "typing_risk": 0.15,
    "idle_risk": 0.10,
    "affinity_risk": 0.18,
    "helper_risk": 0.05,
    "daemon_risk": 0.09,
    "session_risk": 0.05,
}


def score_risk(
    paste: int = 0,
    typed: int = 0,
    blurs: int = 0,
    off_ms: int = 0,
    wpm: float = 0,
    idle_ms: int = 0,
    connected: bool = False,
    hostile_count: int = 0,
    daemon_risk: int = 0,
    daemon_force_critical: bool = False,
    reconnects: int = 0,
    session_age_sec: float = 0,
) -> RiskOutput:
    """
    Heuristic risk scoring.
    Mirrors: src/academic/riskScoring.js:scoreAcademicRisk
    """
    def clamp(v): return max(0, min(100, round(v)))

    paste_raw = (100 if paste >= 200 and typed < 20 else
                 100 if blurs >= 1 and paste >= 80 else
                 100 if paste >= 80 else
                 60 if paste >= 50 else
                 20 if paste > 0 else 0)

    focus_raw = ((80 if blurs >= 4 else 50 if blurs >= 2 else 20 if blurs == 1 else 0) +
                 (40 if off_ms >= 30000 else 20 if off_ms >= 10000 else 10 if off_ms >= 3000 else 0))

    typing_raw = 90 if wpm >= 250 else 50 if wpm >= 180 else 0

    idle_raw = (80 if idle_ms >= 60000 and paste >= 80 else
                50 if idle_ms >= 8000 and paste > 0 else
                30 if idle_ms >= 30000 else 0)

    affinity_raw = 100 if hostile_count > 0 else 0
    helper_raw = 100 if not connected and session_age_sec > 30 else 0
    session_raw = 80 if reconnects >= 3 else 40 if reconnects >= 2 else 0

    categories = {
        "paste_risk": clamp(paste_raw), "focus_risk": clamp(focus_raw),
        "typing_risk": clamp(typing_raw), "idle_risk": clamp(idle_raw),
        "affinity_risk": clamp(affinity_raw), "helper_risk": clamp(helper_raw),
        "daemon_risk": clamp(daemon_risk), "session_risk": clamp(session_raw),
    }

    score = sum(WEIGHTS[k] * categories[k] for k in WEIGHTS)
    score = clamp(score)

    # Overrides (H01, H02)
    if paste >= 200 and typed < 20: score = max(score, 75)
    if paste >= 80 and score < 40: score = 40
    if affinity_raw >= 100: score = max(score, 85)
    if daemon_risk >= 40 and not daemon_force_critical: score = max(score, 40)
    if daemon_force_critical: score = max(score, 85)

    level: RiskLevel = "Critical" if score >= 70 else "Warning" if score >= 40 else "Safe"
    confidence = max(0, min(1, 0.5 + score / 200))

    recommendation = {
        "Critical": "Manual review required. No automatic misconduct finding.",
        "Warning": "Manual review recommended. No automatic misconduct finding.",
        "Safe": "No anomalies detected.",
    }[level]

    return RiskOutput(
        risk_level=level, risk_score=score,
        confidence=round(confidence * 100) / 100,
        categories=categories, recommendation=recommendation,
    )

# ---------------------------------------------------------------------------
# HMAC-SHA256 Audit Chain
# ---------------------------------------------------------------------------

CHAIN_CAP = 5000


@dataclass
class AuditChain:
    prev_hash: str = "GENESIS"
    entries: list[AuditEntry] = field(default_factory=list)
    truncated: bool = False


def append_entry(chain: AuditChain, hmac_key: bytes, type_: str, payload: dict) -> None:
    """Mirrors src/audit/hmacChain.js:appendEntry"""
    if chain.truncated: return
    if len(chain.entries) >= CHAIN_CAP:
        chain.truncated = True
        return
    entry_data = {
        "seq": len(chain.entries), "ts": time.time() * 1000,
        "type": type_, "payload": payload, "prev": chain.prev_hash,
    }
    sig = hmac.new(hmac_key, json.dumps(entry_data, separators=(",", ":")).encode(), "sha256").hexdigest()
    entry_data["sig"] = sig
    chain.entries.append(AuditEntry(**entry_data))  # type: ignore
    chain.prev_hash = sig


def verify_chain(chain: AuditChain, hmac_key: bytes) -> tuple[bool, list[str]]:
    """Mirrors src/audit/hmacChain.js:verifyChain"""
    errors = []
    prev_hash = "GENESIS"
    for entry in chain.entries:
        rest = {k: v for k, v in entry.__dict__.items() if k != "sig"}
        expected = hmac.new(hmac_key, json.dumps(rest, separators=(",", ":")).encode(), "sha256").hexdigest()
        if expected != entry.sig:
            errors.append(f"Entry seq={entry.seq} signature mismatch")
        if rest["prev"] != prev_hash:
            errors.append(f"Entry seq={entry.seq} prev hash mismatch")
        prev_hash = entry.sig
    return len(errors) == 0, errors
