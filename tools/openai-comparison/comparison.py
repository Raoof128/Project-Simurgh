"""Bounded Luna capture and credential-free replay of frozen synthetic workflows."""

import argparse
import hashlib
import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/local-meta-study"))
from client import PYTHON, Client
from replay import quantiles, stable, summarize
from study import (
    MODES,
    complete,
    digest,
    load_cases,
    loads,
    measured,
    messages,
    proposal,
    semantic,
)

EVIDENCE = ROOT / "docs/assurance/openai-comparison/evidence"
URL = "https://api.openai.com/v1/responses"
SETTINGS = {
    "model": "gpt-6-luna",
    "store": False,
    "reasoning": {"effort": "none"},
    "temperature": 0.7,
    "top_p": 0.9,
    "max_output_tokens": 128,
    "service_tier": "default",
}


def payload(prompt):
    body = {**SETTINGS, "input": prompt}
    if len(json.dumps(body).encode()) > 8192:
        raise ValueError("request byte limit")
    return body


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def decode_response(raw):
    if not isinstance(raw, dict) or raw.get("model") != SETTINGS["model"]:
        raise ValueError("unexpected response model")
    if not isinstance(raw.get("id"), str) or not raw["id"].startswith("resp_"):
        raise ValueError("response identity")
    usage = raw.get("usage")
    if not isinstance(usage, dict) or any(
        type(usage.get(k)) is not int or usage[k] < 0
        for k in ("input_tokens", "output_tokens", "total_tokens")
    ):
        raise ValueError("response usage")
    if (
        usage["output_tokens"] > 128
        or usage["total_tokens"] != usage["input_tokens"] + usage["output_tokens"]
    ):
        raise ValueError("response token limits/totals")
    if usage["input_tokens"] > 10000:
        raise ValueError("unexpected input accounting")
    if raw.get("status") not in ("completed", "incomplete", "failed"):
        raise ValueError("response state")
    output = raw.get("output")
    if not isinstance(output, list):
        raise ValueError("response output")  # noqa: TRY004 -- malformed provider JSON
    texts, refusals = [], []
    for item in output:
        if not isinstance(item, dict) or item.get("type") not in (
            "message",
            "reasoning",
        ):
            raise ValueError("unexpected output item")
        if item["type"] == "reasoning":
            continue
        if item.get("role") != "assistant" or not isinstance(item.get("content"), list):
            raise ValueError("response message")
        for content in item["content"]:
            if content.get("type") == "output_text" and isinstance(
                content.get("text"), str
            ):
                texts.append(content["text"])
            elif content.get("type") == "refusal" and isinstance(
                content.get("refusal"), str
            ):
                refusals.append(content["refusal"])
            else:
                raise ValueError("unexpected message content")
    return {
        "status": "generated",
        "completion": "".join(texts),
        "finish_reason": "stop"
        if raw["status"] == "completed" and not refusals
        else "invalid",
        "refusals": refusals,
        "response": raw,
    }


def request(prompt, key):
    began = time.monotonic()
    try:
        body = json.dumps(payload(prompt)).encode()
        req = urllib.request.Request(
            URL,
            data=body,
            headers={
                "Authorization": "Bearer " + key,
                "Content-Type": "application/json",
            },
            method="POST",
        )
        opener = urllib.request.build_opener(NoRedirect())
        with opener.open(req, timeout=45) as stream:
            data = stream.read(1048577)
            if len(data) > 1048576 or key.encode() in data:
                raise ValueError("response size/credential contamination")
            decoded = loads(data)
            # Keep only response evidence, never headers or provider error objects.
            raw = {
                k: decoded.get(k)
                for k in (
                    "id",
                    "model",
                    "status",
                    "output",
                    "usage",
                    "incomplete_details",
                    "created_at",
                    "service_tier",
                )
            }
            result = decode_response(raw)
    except urllib.error.HTTPError as exc:
        result = {"status": "api_error", "http_status": exc.code}
        exc.close()
    except Exception as exc:  # noqa: BLE001 -- no raw errors, key or retry
        result = {"status": "api_error", "error_type": type(exc).__name__}
    result["messages"] = prompt
    result["seconds"] = round(time.monotonic() - began, 6)
    return result


def input_names():
    inherited = loads(
        (ROOT / "docs/assurance/meta-study/evidence/protocol.json").read_text()
    )
    names = set(inherited["inputs"])
    names.add("docs/assurance/meta-study/evidence/protocol.json")
    names.add("docs/superpowers/plans/2026-10-15-luna-comparison.md")
    for directory in ("tools/local-meta-study", "tools/openai-comparison"):
        names.update(str(p.relative_to(ROOT)) for p in (ROOT / directory).rglob("*.py"))
    return sorted(names)


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT, stderr=subprocess.DEVNULL)


def protocol(commit=None):
    path = EVIDENCE / "protocol.json"
    value = loads(path.read_text())
    if (
        value.get("schema") != "simurgh-luna-protocol-v1"
        or value.get("settings") != SETTINGS
    ):
        raise ValueError("protocol settings")
    if set(value.get("inputs", {})) != set(input_names()):
        raise ValueError("exact source inventory")
    for name, expected in value["inputs"].items():
        if digest(ROOT / name) != expected:
            raise ValueError("source digest mismatch: " + name)
    if commit is not None:
        if not re.fullmatch(r"[a-f0-9]{40}", commit):
            raise ValueError("protocol commit")
        subprocess.run(
            ["git", "merge-base", "--is-ancestor", commit, "HEAD"],
            cwd=ROOT,
            check=True,
            capture_output=True,
        )
        for name, expected in {
            **value["inputs"],
            str(path.relative_to(ROOT)): digest(path),
        }.items():
            if hashlib.sha256(git("show", f"{commit}:{name}")).hexdigest() != expected:
                raise ValueError("commit source mismatch")
    return value, digest(path)


def validate_rows(capture):
    cases = load_cases()
    expected = [(i, case["id"]) for i in range(3) for case in cases]
    rows = capture.get("rows")
    if (
        not isinstance(rows, list)
        or [(r.get("repeat"), r.get("id")) for r in rows] != expected
    ):
        raise ValueError("exact ordered repetition/case inventory")
    failed = False
    by_id = {c["id"]: c for c in cases}
    for row in rows:
        measured(row.get("seconds"))
        if len(row.get("steps", [])) != 2 or len(row.get("trajectory", [])) != 2:
            raise ValueError("two steps and observations required")
        for index, step in enumerate(row["steps"]):
            measured(step.get("seconds"))
            measured(row["trajectory"][index].get("seconds"))
            prompt = messages(
                by_id[row["id"]], index, None if index == 0 else row["trajectory"][0]
            )
            if step.get("messages") != prompt:
                raise ValueError("prompt/feedback mismatch")
            payload(prompt)
            status = step.get("status")
            if failed:
                if (
                    set(step) != {"messages", "seconds", "status"}
                    or status != "skipped_after_error"
                ):
                    raise ValueError("request after first error")
            elif status == "generated":
                decoded = decode_response(step.get("response"))
                if step != {**decoded, "messages": prompt, "seconds": step["seconds"]}:
                    raise ValueError("response/proposal linkage")
            elif status == "api_error":
                extra = set(step) - {"messages", "seconds", "status"}
                if extra not in ({"http_status"}, {"error_type"}):
                    raise ValueError("sanitized failure shape")
                if "http_status" in step and (
                    type(step["http_status"]) is not int
                    or not 300 <= step["http_status"] <= 599
                ):
                    raise ValueError("HTTP failure code")
                if "error_type" in step and (
                    not isinstance(step["error_type"], str)
                    or not re.fullmatch(
                        r"[A-Za-z][A-Za-z0-9]{0,79}", step["error_type"]
                    )
                ):
                    raise ValueError("error type")
                failed = True
            else:
                raise ValueError("generation state")


def validate_capture(capture):
    if capture.get("schema") != "simurgh-luna-capture-v1":
        raise ValueError("capture schema")
    _, sha = protocol(capture.get("protocol_commit", ""))
    if capture.get("protocol_sha256") != sha:
        raise ValueError("protocol digest")
    validate_rows(capture)


def capture_run(out, key_file, runtime_python):
    if out.exists() or out.with_suffix(".jsonl").exists():
        raise ValueError("refusing capture/journal overwrite")
    commit = git("rev-parse", "HEAD").decode().strip()
    _, sha = protocol(commit)
    keys = re.findall(r"sk-[A-Za-z0-9_-]{20,}", key_file.read_text())
    if len(keys) != 1:
        raise ValueError("expected one key in external file")
    key = keys[0]
    cap = {
        "schema": "simurgh-luna-capture-v1",
        "protocol_commit": commit,
        "protocol_sha256": sha,
        "started_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "rows": [],
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    failed = False
    with (
        out.with_suffix(".jsonl").open("x") as journal,
        Client(runtime_python) as runtime,
    ):
        journal.write(json.dumps({"capture_header": cap}) + "\n")
        journal.flush()
        for repeat in range(3):
            for case in load_cases():
                runtime.request({"op": "start", "case": case, "mode": "enforced"})
                row = {
                    "repeat": repeat,
                    "id": case["id"],
                    "steps": [],
                    "trajectory": [],
                }
                began = time.monotonic()
                for index in (0, 1):
                    prompt = messages(
                        case, index, None if index == 0 else row["trajectory"][0]
                    )
                    step = (
                        {
                            "status": "skipped_after_error",
                            "messages": prompt,
                            "seconds": 0,
                        }
                        if failed
                        else request(prompt, key)
                    )
                    failed = failed or step["status"] == "api_error"
                    journal.write(
                        json.dumps(
                            {
                                "repeat": repeat,
                                "id": case["id"],
                                "index": index,
                                "step": step,
                            }
                        )
                        + "\n"
                    )
                    journal.flush()
                    row["steps"].append(step)
                    row["trajectory"].append(
                        runtime.request(
                            {
                                "op": "read" if index == 0 else "write",
                                "proposal": proposal(step),
                            }
                        )
                    )
                runtime.request({"op": "close"})
                row["seconds"] = round(time.monotonic() - began, 6)
                cap["rows"].append(row)
                journal.write(json.dumps({"completed_row": row}) + "\n")
                journal.flush()
                print(
                    json.dumps(
                        {
                            "repeat": repeat,
                            "case": case["id"],
                            "states": [s["status"] for s in row["steps"]],
                        }
                    ),
                    flush=True,
                )
    validate_capture(cap)
    with out.open("x") as stream:
        stream.write(json.dumps(cap, indent=2) + "\n")


def generation(cap):
    steps = [s for r in cap["rows"] for s in r["steps"]]
    usage = [s["response"]["usage"] for s in steps if s["status"] == "generated"]
    inputs = sum(u["input_tokens"] for u in usage)
    outputs = sum(u["output_tokens"] for u in usage)
    return {
        "slots": len(steps),
        "requests_attempted": sum(s["status"] != "skipped_after_error" for s in steps),
        "responses": len(usage),
        "api_errors": sum(s["status"] == "api_error" for s in steps),
        "skipped": sum(s["status"] == "skipped_after_error" for s in steps),
        "invalid_or_failed_json": sum(proposal(s) is None for s in steps),
        "refusals": sum(bool(s.get("refusals")) for s in steps),
        "incomplete": sum(
            s.get("response", {}).get("status") == "incomplete" for s in steps
        ),
        "input_tokens": inputs,
        "output_tokens": outputs,
        "conservative_estimated_usd": (inputs * 0.125 + outputs * 0.5) / 1000000,
        "cost_note": "all input at cache-write rate, output at standard rate; excludes unknown usage on errors; not invoice",
        "seconds": sum(s["seconds"] for s in steps),
        "latency": quantiles(
            [s["seconds"] for s in steps if s["status"] != "skipped_after_error"]
        ),
    }


def generate_report(path, runtime_python):
    cap = loads(path.read_text())
    validate_capture(cap)
    cases = load_cases()
    by_id = {c["id"]: c for c in cases}
    rows, recovery = [], []
    with Client(runtime_python) as runtime:
        for captured in cap["rows"]:
            case = by_id[captured["id"]]
            # The inherited scorer calls its grouping key seed; this is only a repetition index.
            row = {"id": case["id"], "seed": captured["repeat"], "modes": {}}
            for mode in MODES:
                runtime.request({"op": "start", "case": case, "mode": mode})
                row["modes"][mode] = [
                    runtime.request(
                        {
                            "op": "read" if i == 0 else "write",
                            "proposal": proposal(step),
                        }
                    )
                    for i, step in enumerate(captured["steps"])
                ]
                runtime.request({"op": "close"})
            if semantic(row["modes"]["enforced"]) != semantic(captured["trajectory"]):
                raise ValueError("capture effects do not reproduce")
            rows.append(row)
        eligible = [r for r in cap["rows"] if complete(by_id[r["id"]], r["trajectory"])]
        if eligible:
            first = eligible[0]
            for fault in ("after_pause", "after_effect"):
                result = runtime.request(
                    {
                        "op": "recovery",
                        "case": by_id[first["id"]],
                        "proposal": proposal(first["steps"][1]),
                        "fault": fault,
                    }
                )
                recovery.append(
                    {
                        "id": first["id"],
                        "repeat": first["repeat"],
                        "fault": fault,
                        "result": result,
                    }
                )
    return {
        "schema": "simurgh-luna-report-v1",
        "capture_sha256": digest(path),
        "protocol_sha256": cap["protocol_sha256"],
        "rows": rows,
        "summary": summarize(rows, cases),
        "generation": generation(cap),
        "recovery": recovery,
        "grouping_note": "seed/by_seed keys inherited from scorer mean repetition index, not API seed",
        "recovery_selection": "first complete enforced workflow; no replacement or resampling",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("capture", "run", "verify"))
    parser.add_argument("capture", type=Path)
    parser.add_argument("report", type=Path, nargs="?")
    parser.add_argument("--key-file", type=Path)
    parser.add_argument("--allow-live", action="store_true")
    parser.add_argument("--runtime-python", default=PYTHON)
    args = parser.parse_args()
    if args.command == "capture":
        if not args.allow_live or args.key_file is None:
            raise ValueError("live opt-in and external key file required")
        capture_run(args.capture, args.key_file, args.runtime_python)
        return
    if args.report is None:
        raise ValueError("report path required")
    if args.command == "run" and args.report.exists():
        raise ValueError("refusing report overwrite")
    if args.command == "verify":
        saved = loads(args.report.read_text())
        if saved["summary"] != summarize(saved["rows"], load_cases()):
            raise ValueError("summary mismatch")
    actual = generate_report(args.capture, args.runtime_python)
    if args.command == "run":
        with args.report.open("x") as stream:
            stream.write(json.dumps(actual, indent=2) + "\n")
        print(
            json.dumps(
                {
                    "generation": actual["generation"],
                    "by_repeat": actual["summary"]["by_seed"],
                }
            )
        )
    elif stable(saved) != stable(actual):
        raise ValueError("semantic replay mismatch")
    else:
        print(
            "Verified 72 trajectories, 432 control attempts and selected recovery probes"
        )


if __name__ == "__main__":
    main()
