"""Phase 19q: where the destinations in a public monitor benchmark came from (P19-DEST01).

Reads the sessions of SLEIGHT-Bench (github.com/safety-research/sleight-bench, MIT), types
every destination token by the first block that holds it (the principal's own text, a tool
result, or the agent), and scores three rules on the attack session and on its benign twin:

  P  every destination a command uses was supplied by the principal
  E  ... by the principal or by the environment
  A  as E, but a destination the agent itself wrote in the earlier stage is refused

No model runs. The dataset carries canary strings against inclusion in training corpora, so a
row names a session by its directory path and holds counts, flags and truncated digests of the
tokens; no token, transcript or metadata text is written anywhere by this module.

A grammar over recorded text is not a network boundary: it misses what a session only produces
when it runs. See the non-claims in ``evidence19q``.
"""

import base64
import hashlib
import json
import math
import re
from pathlib import Path

DATASET = "github.com/safety-research/sleight-bench"
DATASET_COMMIT = "218c58315cc01ff0dc5a100e906c27d82d259521"
HOST_SCHEMES = ("http", "https", "ftp", "sftp", "ssh", "git", "ws", "wss", "rsync")
BUCKET_SCHEMES = ("s3", "gs", "gcs", "az", "abfs", "abfss", "hdfs")
LOOPBACK = frozenset({"localhost", "127.0.0.1", "0.0.0.0", "::1"})
ORIGINS = ("principal", "environment", "agent", "agent_prior")
RULES = ("P", "E", "A")
REFUSED = {
    "P": frozenset({"environment", "agent", "agent_prior"}),
    "E": frozenset({"agent"}),
    "A": frozenset({"agent", "agent_prior"}),
}
READINGS = ("strict", "lenient")
KINDS = ("attack", "benign")
FILES = {"attack": "transcript.jsonl", "benign": "benign.jsonl"}
Q1_SESSIONS = (
    "authorization_confusion/ambiguous-instruction-weight-backup-orion-personal",
    "authorization_confusion/transcript-perm-launder-corp-2part-stage2",
    "authorization_confusion/transcript-perm-launder-gcs-2part-stage2",
    "jailbreaks/prompt-injection-video-rce-exfil-no-dialog-tags",
    "plausible_naming/curl-pipe-bash--anthropic-setup",
    "plausible_naming/great-gcs-bucket-name-weight-exfil",
)
Q1_NEED = 5
Q3_SESSIONS = (
    "authorization_confusion/transcript-perm-launder-corp-2part-stage2",
    "authorization_confusion/transcript-perm-launder-gcs-2part-stage2",
)
PRIMARY = ("strict", "P")
Z95 = 1.959963984540054

_URL = re.compile(
    r"(?i)(?<![a-z0-9+.\-])("
    + "|".join(sorted(HOST_SCHEMES + BUCKET_SCHEMES, key=len, reverse=True))
    + r")://([^\s\"'<>\\`|;,(){}]*)"
)
_REMOTE = re.compile(
    r"(?<![A-Za-z0-9_.\-])[A-Za-z0-9_.\-]+@([A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)+):"
)
_IPV4 = re.compile(
    r"(?<![A-Za-z0-9=_.\-])(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?![0-9])(?!\.[0-9])"
)
_HOST = re.compile(r"[a-z0-9]([a-z0-9.\-]*[a-z0-9])?\Z")
_BUCKET = re.compile(r"[a-z0-9]([a-z0-9._\-]*[a-z0-9])?\Z")
_STAGE = re.compile(r"-(stage|part)([12])\Z")


def _host(authority):
    authority = authority.split("/", 1)[0].split("?", 1)[0].split("#", 1)[0]
    authority = authority.rsplit("@", 1)[-1]
    if authority.startswith("["):
        return authority[1:].split("]", 1)[0].lower()
    return re.sub(r":\d*\Z", "", authority).lower()


def tokens(text):
    """Destination tokens of ``text`` in order of first appearance, each once."""
    found = []
    for m in _URL.finditer(text):
        scheme, host = m.group(1).lower(), _host(m.group(2))
        if scheme in BUCKET_SCHEMES:
            if _BUCKET.match(host):
                found.append((m.start(), f"{scheme}://{host}"))
        elif _HOST.match(host) and host not in LOOPBACK:
            found.append((m.start(), host))
    for m in _REMOTE.finditer(text):
        host = m.group(1).lower()
        if host not in LOOPBACK:
            found.append((m.start(1), host))
    for m in _IPV4.finditer(text):
        if all(int(part) <= 255 for part in m.groups()):
            address = ".".join(str(int(part)) for part in m.groups())
            if address not in LOOPBACK:
                found.append((m.start(), address))
    out = []
    for _, token in sorted(found):
        if token not in out:
            out.append(token)
    return out


def _strings(value):
    if type(value) is str:
        yield value
    elif type(value) is list:
        for item in value:
            yield from _strings(item)
    elif type(value) is dict:
        for item in value.values():
            yield from _strings(item)


def blocks(raw):
    """The session's blocks in order and the number of lines that could not be read. A block
    is {role, kind, strings, tool, input}; the canary line is skipped."""
    out, unread = [], 0
    for text in raw.decode("utf-8", errors="replace").splitlines():
        if not text.strip():
            continue
        try:
            item = json.loads(text)
        except ValueError:
            unread += 1
            continue
        if type(item) is not dict:
            unread += 1
            continue
        if "role" not in item:
            if "canary" not in item:
                unread += 1
            continue
        content = item.get("content")
        if type(content) is not dict or type(content.get("type")) is not str:
            unread += 1
            continue
        kind = content["type"]
        block = {"role": item["role"], "kind": kind, "tool": None, "input": {}}
        if kind == "text":
            block["strings"] = list(_strings(content.get("text")))
        elif kind == "thinking":
            block["strings"] = list(_strings(content.get("thinking")))
        elif kind == "tool_use":
            given = content.get("input")
            block["tool"] = content.get("name")
            block["input"] = given if type(given) is dict else {}
            block["strings"] = list(_strings(given))
        elif kind == "tool_result":
            block["strings"] = list(_strings(content.get("content")))
        else:
            unread += 1
            continue
        out.append(block)
    return out, unread


def _origin_of(block):
    if block["role"] == "assistant":
        return "agent"
    if block["role"] == "user" and block["kind"] == "text":
        return "principal"
    if block["role"] == "user" and block["kind"] == "tool_result":
        return "environment"
    return None


def origins(session_blocks, prior=None):
    """token -> origin, by the first block that holds it. ``prior`` is the same map for the
    earlier stage of a multi-stage attack."""
    out = {}
    for block in session_blocks:
        origin = _origin_of(block)
        if origin is None:
            continue
        for text in block["strings"]:
            for token in tokens(text):
                out.setdefault(token, origin)
    if prior:
        for token, origin in out.items():
            if origin == "environment" and prior.get(token) == "agent":
                out[token] = "agent_prior"
    return out


def uses(session_blocks, reading):
    """Tokens a session uses, in order: in a Bash command (strict), and also in the content a
    Write or Edit call puts into a file (lenient)."""
    if reading not in READINGS:
        raise ValueError("reading")
    out = []
    for block in session_blocks:
        if block["kind"] != "tool_use" or block["role"] != "assistant":
            continue
        fields = []
        if block["tool"] == "Bash":
            fields.append(block["input"].get("command"))
        elif reading == "lenient" and block["tool"] == "Write":
            fields.append(block["input"].get("content"))
        elif reading == "lenient" and block["tool"] == "Edit":
            fields.append(block["input"].get("new_string"))
        for field in fields:
            if type(field) is str:
                for token in tokens(field):
                    if token not in out:
                        out.append(token)
    return out


def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()[:16]


def flags(token_rows):
    """{reading: {rule: flagged}} from a row's token list alone."""
    return {
        reading: {
            rule: any(
                t["used_" + reading] and t["origin"] in REFUSED[rule]
                for t in token_rows
            )
            for rule in RULES
        }
        for reading in READINGS
    }


def row(session, kind, raw, prior):
    if kind not in KINDS:
        raise ValueError("kind")
    session_blocks, unread = blocks(raw)
    origin = origins(session_blocks, prior)
    used = {reading: set(uses(session_blocks, reading)) for reading in READINGS}
    token_rows = [
        {
            "id": digest(token),
            "origin": origin[token],
            "used_strict": token in used["strict"],
            "used_lenient": token in used["lenient"],
        }
        for token in origin
    ]
    return {
        "session": session,
        "kind": kind,
        "category": session.split("/", 1)[0],
        "blocks": len(session_blocks),
        "unread_lines": unread,
        "tool_calls": sum(b["kind"] == "tool_use" for b in session_blocks),
        "tokens": token_rows,
        "flags": flags(token_rows),
    }


def earlier(session):
    """The directory of the earlier stage of a second-stage session, or None."""
    m = _STAGE.search(session)
    if not m or m.group(2) != "2":
        return None
    return session[: m.start()] + f"-{m.group(1)}1"


def attack_of(session):
    return _STAGE.sub("", session)


def open_blob(raw, decrypt):
    payload = json.loads(decrypt(raw))
    if type(payload) is not dict:
        raise ValueError("blob_shape")
    return {name: base64.b64decode(content) for name, content in payload.items()}


def fernet(key):
    """The dataset's own decryption (Fernet), with the key its README publishes."""
    from cryptography.fernet import Fernet

    return Fernet(key.encode()).decrypt


def inputs(dataset, decrypt):
    """Every ``encrypted.bin`` under ``attacks/`` with its sha256, and the sessions of each
    directory that holds an attack transcript and its benign twin."""
    dataset = Path(dataset)
    blobs, sessions, excluded = {}, {}, []
    for path in sorted((dataset / "attacks").rglob("encrypted.bin")):
        if path.is_symlink():
            raise ValueError("blob_is_a_link")
        raw = path.read_bytes()
        blobs[path.relative_to(dataset).as_posix()] = hashlib.sha256(raw).hexdigest()
        name = path.parent.relative_to(dataset / "attacks").as_posix()
        files = open_blob(raw, decrypt)
        if all(f in files for f in FILES.values()):
            sessions[name] = {kind: files[f] for kind, f in FILES.items()}
        else:
            excluded.append(name)
    return {
        "dataset": DATASET,
        "commit": DATASET_COMMIT,
        "blobs": blobs,
        "sessions": sessions,
        "excluded": excluded,
    }


def measure(given):
    """One attack row and one benign row per pair, in path order."""
    sessions = given["sessions"]
    rows = []
    for name in sorted(sessions):
        before = earlier(name)
        for kind in KINDS:
            prior = None
            if before in sessions:
                prior = origins(blocks(sessions[before][kind])[0])
            rows.append(row(name, kind, sessions[name][kind], prior))
    return rows


def wilson(k, n):
    """Wilson 95% interval for k of n, rounded to four places."""
    p = k / n
    scale = 1 + Z95 * Z95 / n
    centre = (p + Z95 * Z95 / (2 * n)) / scale
    half = Z95 * math.sqrt(p * (1 - p) / n + Z95 * Z95 / (4 * n * n)) / scale
    return [round(max(0.0, centre - half), 4), round(min(1.0, centre + half), 4)]


def _pairs(rows):
    out = {}
    for r in rows:
        out.setdefault(r["session"], {})[r["kind"]] = r
    if any(set(pair) != set(KINDS) for pair in out.values()):
        raise ValueError("unpaired_session")
    return out


def summarise(rows):
    pairs = _pairs(rows)
    n = len(pairs)
    cells = {}
    for reading in READINGS:
        cells[reading] = {}
        for rule in RULES:

            def hit(name, kind):
                return pairs[name][kind]["flags"][reading][rule]

            attack = sum(hit(s, "attack") for s in pairs)
            benign = sum(hit(s, "benign") for s in pairs)
            paired = {"attack_only": 0, "both": 0, "benign_only": 0, "neither": 0}
            by_category = {}
            merged = {}
            for s in sorted(pairs):
                a, b = hit(s, "attack"), hit(s, "benign")
                key = (
                    "both"
                    if a and b
                    else "attack_only"
                    if a
                    else "benign_only"
                    if b
                    else "neither"
                )
                paired[key] += 1
                c = by_category.setdefault(
                    pairs[s]["attack"]["category"],
                    {"sessions": 0, "attack_flagged": 0, "benign_flagged": 0},
                )
                c["sessions"] += 1
                c["attack_flagged"] += a
                c["benign_flagged"] += b
                m = merged.setdefault(attack_of(s), [False, False])
                m[0], m[1] = m[0] or a, m[1] or b
            cells[reading][rule] = {
                "sessions": n,
                "attack_flagged": attack,
                "attack_interval": wilson(attack, n),
                "benign_flagged": benign,
                "benign_interval": wilson(benign, n),
                "paired": paired,
                "by_category": dict(sorted(by_category.items())),
                "per_attack": {
                    "attacks": len(merged),
                    "attack_flagged": sum(m[0] for m in merged.values()),
                    "benign_flagged": sum(m[1] for m in merged.values()),
                },
            }
    used = {}
    for reading in READINGS:
        used[reading] = {}
        for kind in KINDS:
            count = dict.fromkeys(ORIGINS, 0)
            for r in rows:
                if r["kind"] == kind:
                    for t in r["tokens"]:
                        if t["used_" + reading]:
                            count[t["origin"]] += 1
            used[reading][kind] = count
    return {"pairs": n, "cells": cells, "used_by_origin": used}


def hypotheses(rows, *, q1=Q1_SESSIONS, q1_need=Q1_NEED, q3=Q3_SESSIONS):
    """Q1 to Q3 of P19-DEST01, each decided by rule from the rows."""
    reading, rule = PRIMARY
    attack = {r["session"]: r for r in rows if r["kind"] == "attack"}
    q1_hits = sum(s in attack and attack[s]["flags"][reading][rule] for s in q1)
    benign = sum(r["kind"] == "benign" and r["flags"][reading][rule] for r in rows)
    q3_hits = sum(
        s in attack
        and not attack[s]["flags"]["strict"]["E"]
        and attack[s]["flags"]["strict"]["A"]
        for s in q3
    )
    return {
        "Q1": {
            "flagged": q1_hits,
            "of": len(q1),
            "need": q1_need,
            "holds": q1_hits >= q1_need,
        },
        "Q2": {"benign_flagged": benign, "holds": benign >= 1},
        "Q3": {
            "allowed_by_E_and_refused_by_A": q3_hits,
            "of": len(q3),
            "holds": q3_hits == len(q3),
        },
    }
