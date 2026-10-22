"""Capture, source binding, raw evidence verification and fresh offline replay."""

import argparse
import concurrent.futures
import json
import multiprocessing
import re
import statistics
import subprocess
import tempfile
import time
import zipfile
from pathlib import Path, PurePosixPath

from transfer_deps import (
    ROOT,
    DOCS,
    MANIFEST,
    Provider,
    CONTROLS,
    wire,
    loads,
    parse,
    messages,
    validate_tasks,
    run_branch,
    observe,
    paths_for,
    write_pack,
    CASES,
    REL_CONTROLS,
    REPETITIONS,
    run_case,
    check_rows,
    reliability_summary,
)
from model_inputs import check_output
from transfer import (
    OpenAI,
    WORKFLOWS,
    RESERVE,
    request,
    decode,
    run_workflow,
    workflow_inputs,
    workflow_second,
    workflow_replay,
    check_inventory,
    summary,
    sha,
)

MODELS = ("luna", "llama")


def save(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(wire(value))


def expected_sources():
    names = set()
    for phase in ("model-composition-phase-10", "reliability-phase-13"):
        p = ROOT / f"docs/research/{phase}/protocol.json"
        names.update(loads(p.read_bytes())["sources"])
        names.add(str(p.relative_to(ROOT)))
    names.update(
        str(p.relative_to(ROOT))
        for p in (ROOT / "tools/assurance-transfer").rglob("*.py")
    )
    names.update(
        str((DOCS / n).relative_to(ROOT))
        for n in (
            "tasks.json",
            "settings.json",
            "DESIGN.md",
            "CORPUS.md",
            "sources.json",
        )
    )
    names.add(str(MANIFEST.relative_to(ROOT)))
    return names


def freeze():
    validate_tasks(loads((DOCS / "tasks.json").read_bytes()))
    save(
        DOCS / "protocol.json",
        {
            "schema": "simurgh-transfer-v1",
            "sources": {
                n: sha((ROOT / n).read_bytes()) for n in sorted(expected_sources())
            },
            "models": list(MODELS),
            "workflows": list(WORKFLOWS),
            "trials": [0, 1],
            "controls": list(CONTROLS),
            "max_api_attempts": 64,
            "max_output_tokens": 256,
            "reliability_epochs": 2,
            "pace_seconds": 0.5,
            "workers": 4,
        },
    )


def check_protocol(commit=None):
    p = loads((DOCS / "protocol.json").read_bytes())
    if (
        set(p["sources"]) != expected_sources()
        or p["models"] != list(MODELS)
        or p["workflows"] != list(WORKFLOWS)
        or p["trials"] != [0, 1]
        or p["controls"] != list(CONTROLS)
        or p["max_api_attempts"] != 64
        or p["reliability_epochs"] != 2
        or p["pace_seconds"] != 0.5
        or p["workers"] != 4
        or p["max_output_tokens"] != 256
    ):
        raise ValueError("protocol_inventory")
    for n, h in p["sources"].items():
        if sha((ROOT / n).read_bytes()) != h:
            raise ValueError("source_binding:" + n)
    if commit is not None:
        if not re.fullmatch("[0-9a-f]{40}", commit):
            raise ValueError("freeze_commit")
        for n in [*p["sources"], str((DOCS / "protocol.json").relative_to(ROOT))]:
            raw = subprocess.check_output(["git", "show", commit + ":" + n], cwd=ROOT)
            if raw != (ROOT / n).read_bytes():
                raise ValueError("uncommitted_source:" + n)
    validate_tasks(loads((DOCS / "tasks.json").read_bytes()))
    return p


def metadata():
    commit = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
    check_protocol(commit)
    return {
        "freeze_commit": commit,
        "protocol_sha256": sha((DOCS / "protocol.json").read_bytes()),
    }


def slots():
    return [(c, t) for t in (0, 1) for c in loads((DOCS / "tasks.json").read_bytes())]


def capture_openai(out, key_file):
    meta = metadata()
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    keys = re.findall(r"sk-[A-Za-z0-9_-]{20,}", Path(key_file).read_text())
    if len(keys) != 1:
        raise ValueError("key_file_shape")
    client = OpenAI(keys[0], out / "api")
    files = {}
    workflows = []
    try:
        for case in WORKFLOWS:
            row, raw = run_workflow(case, client, out / "workflows" / case)
            workflows.append(row)
            files.update({"workflow/" + k: v for k, v in raw.items()})
            save(out / "workflows.json", {"metadata": meta, "rows": workflows})
            print("workflow", case, row["status"], flush=True)
        cap = {"metadata": meta, "model": "luna", "generations": [], "rows": []}
        started = time.perf_counter()
        for i, (case, trial) in enumerate(slots()):
            gid = f"g{i + 1}"
            call = client.call("comparison-" + gid, request(messages(case)))
            p = (
                decode(call["response"])
                if call["status"] == "received"
                else {"status": "generation_error"}
            )
            g = {
                "id": gid,
                "task_id": case["id"],
                "trial": trial,
                "call": call,
                "proposal": p,
            }
            cap["generations"].append(g)
            save(out / "comparison.json", cap)
            for control in CONTROLS:
                row, raw = run_branch(
                    case, trial, control, gid, p, out / "branches" / f"{gid}-{control}"
                )
                cap["rows"].append(row)
                files.update({"luna/" + k: v for k, v in raw.items()})
            save(out / "comparison.json", cap)
            print("luna", gid, p["status"], flush=True)
        cap["wall_seconds"] = time.perf_counter() - started
        save(out / "comparison.json", cap)
        for name, data in files.items():
            p = out / "raw" / name
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(data)
    finally:
        client.close()
    # Credential scan includes all emitted public payloads before publication.
    for p in out.rglob("*"):
        if p.is_file() and keys[0].encode() in p.read_bytes():
            raise ValueError("credential_in_output")


def capture_meta(out, model_dir, model_python):
    meta = metadata()
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    provider = Provider(
        model_python, model_dir, MANIFEST, DOCS / "settings.json", out / "worker.log"
    )
    cap = {
        "metadata": meta,
        "model": "llama",
        "header": provider.header,
        "requests": [],
        "generations": [],
        "rows": [],
    }
    started = time.perf_counter()
    entries = slots()
    try:
        for batch, start in enumerate(range(0, len(entries), 16)):
            items = entries[start : start + 16]
            prompts = [messages(c) for c, t in items]
            seed = 171000 + batch
            req = {"batch": batch, "seed": seed, "prompts": prompts}
            cap["requests"].append(req)
            save(out / "comparison.json", cap)
            outputs = provider.generate(prompts, seed)
            # Retain the entire returned batch before any connector dispatch.
            save(out / f"batch-{batch}.json", {"request": req, "outputs": outputs})
            for pos, ((case, trial), output) in enumerate(
                zip(items, outputs, strict=True)
            ):
                check_output(output)
                gid = f"g{start + pos + 1}"
                p = (
                    parse(output["raw"], output["truncated"])
                    if output["status"] == "generated"
                    else {"status": "generation_error"}
                )
                cap["generations"].append(
                    {
                        "id": gid,
                        "task_id": case["id"],
                        "trial": trial,
                        "batch": batch,
                        "position": pos,
                        "output": output,
                        "proposal": p,
                    }
                )
                save(out / "comparison.json", cap)
                for control in CONTROLS:
                    row, raw = run_branch(
                        case,
                        trial,
                        control,
                        gid,
                        p,
                        out / "branches" / f"{gid}-{control}",
                    )
                    cap["rows"].append(row)
                    for n, data in raw.items():
                        dest = out / "raw" / "llama" / n
                        dest.parent.mkdir(parents=True, exist_ok=True)
                        dest.write_bytes(data)
                save(out / "comparison.json", cap)
            print("llama batch", batch, "captured", len(outputs), flush=True)
        cap["wall_seconds"] = time.perf_counter() - started
        save(out / "comparison.json", cap)
    finally:
        provider.close()


def reliability_job(case, rep, control, directory, submitted):
    start = time.monotonic()
    row, files = run_case(case, rep, control, directory)
    return (
        row,
        files,
        {"queue_seconds": start - submitted, "run_seconds": time.monotonic() - start},
    )


def soak(out):
    meta = metadata()
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    start = time.monotonic()
    futures = []
    with concurrent.futures.ProcessPoolExecutor(
        max_workers=4, mp_context=multiprocessing.get_context("fork")
    ) as pool:
        for epoch in range(2):
            for rep in REPETITIONS:
                for case in CASES:
                    for control in REL_CONTROLS:
                        due = start + len(futures) * 0.5
                        time.sleep(max(0, due - time.monotonic()))
                        name = f"e{epoch}-{case}-{rep}-{control}"
                        future = pool.submit(
                            reliability_job,
                            case,
                            rep,
                            control,
                            out / "fixtures" / name,
                            time.monotonic(),
                        )
                        futures.append((epoch, name, future))
        epochs = [{"rows": [], "timings": []} for _ in range(2)]
        for epoch, name, future in futures:
            row, files, timing = future.result()
            epochs[epoch]["rows"].append(row)
            epochs[epoch]["timings"].append(timing)
            for n, data in files.items():
                p = out / "raw" / f"epoch-{epoch}" / n
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_bytes(data)
            save(
                out / "soak.json",
                {"metadata": meta, "epochs": epochs, "complete": False},
            )
        save(
            out / "soak.json",
            {
                "metadata": meta,
                "epochs": epochs,
                "complete": True,
                "wall_seconds": time.monotonic() - start,
            },
        )
    print("soak complete: 120 fixtures", flush=True)


def check_call(call, body, identity):
    if (
        call["id"] != identity
        or wire(call["request"]) != wire(body)
        or call["attempt"]["id"] != identity
    ):
        raise ValueError("api_request_binding")
    if not isinstance(call["seconds"], (int, float)) or not 0 <= call["seconds"] < 3600:
        raise ValueError("api_clock")
    if call["status"] == "received":
        if call["http_status"] != 200 or call["response"].get("model") not in (
            "gpt-6-luna",
        ):
            # Exact returned model retained; unknown aliases require declared amendment.
            raise ValueError("api_model_or_status")
        u = call["response"]["usage"]
        if any(
            type(u.get(k)) is not int or not 0 <= u[k] <= n
            for k, n in [("input_tokens", 32768), ("output_tokens", 256)]
        ):
            raise ValueError("api_usage")
    elif call["status"] not in ("http_error", "transport_error"):
        raise ValueError("api_status")


def check_raw(row, files, prefix, temp):
    d = Path(temp)
    (d / "controls").mkdir(exist_ok=True, parents=True)
    ps = paths_for(d)
    ps["service-before"] = d / "service-before.sqlite"
    names = set()
    for k, p in ps.items():
        name = prefix + k + ".sqlite"
        names.add(name)
        p.write_bytes(files[name])
    raw = observe(d)
    if wire(raw) != wire({k: row[k] for k in raw}):
        raise ValueError("raw_snapshot_mismatch")
    return names


def verify_comparison(cap, files, replay=True):
    entries = slots()
    check_inventory(cap["generations"], [(c["id"], t) for c, t in entries])
    if cap["model"] not in MODELS or len(cap["rows"]) != 144:
        raise ValueError("comparison_inventory")
    if cap["model"] == "llama":
        h = cap["header"]
        if h.get("ready") is not True or h["manifest_sha256"] != sha(
            MANIFEST.read_bytes()
        ):
            raise ValueError("model_header")
        expected = [
            {
                "batch": b,
                "seed": 171000 + b,
                "prompts": [messages(c) for c, t in entries[s : s + 16]],
            }
            for b, s in enumerate(range(0, 48, 16))
        ]
        if wire(cap["requests"]) != wire(expected):
            raise ValueError("local_requests")
    inventory = set()
    with tempfile.TemporaryDirectory(prefix="transfer-verify-") as td:
        for i, (g, (case, trial)) in enumerate(
            zip(cap["generations"], entries, strict=True)
        ):
            if g["id"] != f"g{i + 1}":
                raise ValueError("generation_id")
            if cap["model"] == "luna":
                check_call(g["call"], request(messages(case)), "comparison-" + g["id"])
                expected = (
                    decode(g["call"]["response"])
                    if g["call"]["status"] == "received"
                    else {"status": "generation_error"}
                )
            else:
                if (g["batch"], g["position"]) != (i // 16, i % 16):
                    raise ValueError("batch_linkage")
                check_output(g["output"])
                expected = (
                    parse(g["output"]["raw"], g["output"]["truncated"])
                    if g["output"]["status"] == "generated"
                    else {"status": "generation_error"}
                )
            if wire(g["proposal"]) != wire(expected):
                raise ValueError("proposal_mismatch")
            for j, control in enumerate(CONTROLS):
                row = cap["rows"][i * 3 + j]
                if (
                    row["task_id"],
                    row["trial"],
                    row["control"],
                    row["generation"],
                ) != (case["id"], trial, control, g["id"]):
                    raise ValueError("branch_linkage")
                inventory.update(
                    check_raw(
                        row,
                        files,
                        f"snapshots/{case['id']}-{trial}-{control}-",
                        Path(td) / "raw",
                    )
                )
                if replay:
                    fresh, _ = run_branch(
                        case,
                        trial,
                        control,
                        g["id"],
                        g["proposal"],
                        Path(td) / f"{g['id']}-{control}",
                    )
                    if wire(fresh) != wire(row):
                        raise ValueError("fresh_replay_mismatch")
    if inventory != set(files):
        raise ValueError("snapshot_inventory")


def verify_workflows(cap, files, replay=True):
    if [r["case"] for r in cap["rows"]] != list(WORKFLOWS):
        raise ValueError("workflow_inventory")
    inventory = set()
    calls = []
    with tempfile.TemporaryDirectory(prefix="workflow-verify-") as td:
        for row in cap["rows"]:
            case = row["case"]
            first = row["first"]
            second = row["second"]
            check_call(
                first,
                request(workflow_inputs(case), read=True),
                "workflow-" + case + "-read",
            )
            calls.append(first)
            valid = (
                first["status"] == "received"
                and decode(first["response"], read=True)["status"] == "read"
            )
            if valid != (second is not None):
                raise ValueError("roundtrip_inventory")
            if second:
                check_call(
                    second,
                    request(workflow_second(case, first["response"])),
                    "workflow-" + case + "-decision",
                )
                calls.append(second)
            proposal = (
                decode(second["response"])
                if second and second["status"] == "received"
                else {"status": "generation_error"}
            )
            if wire(row["proposal"]) != wire(proposal):
                raise ValueError("workflow_proposal")
            inventory.update(
                check_raw(row, files, f"snapshots/{case}-", Path(td) / "raw")
            )
            if replay:
                fresh, _ = workflow_replay(case, proposal, Path(td) / case)
                if wire(fresh) != wire(
                    {k: v for k, v in row.items() if k not in ("first", "second")}
                ):
                    raise ValueError("workflow_replay")
    if inventory != set(files):
        raise ValueError("workflow_snapshot_inventory")
    return calls


def report(caps, workflows, soak_cap, calls):
    tasks = loads((DOCS / "tasks.json").read_bytes())
    usages = [c["response"]["usage"] for c in calls if c["status"] == "received"]
    input_tokens = sum(u["input_tokens"] for u in usages)
    output_tokens = sum(u["output_tokens"] for u in usages)
    return {
        "schema": "simurgh-transfer-report-v1",
        "models": {k: summary(v, tasks) for k, v in caps.items()},
        "workflow": [
            {
                "case": r["case"],
                "proposal": r["proposal"]["status"],
                "status": r["status"],
                "new_effects": len(r["new_effects"]),
                "prior_effects": len(r["before_effects"]),
            }
            for r in workflows["rows"]
        ],
        "api": {
            "attempts": len(calls),
            "received": len(usages),
            "reserved_usd": str(RESERVE * len(calls)),
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "conservative_estimated_usd": (input_tokens * 0.20 + output_tokens * 0.75)
            / 1e6,
            "latency_seconds_median": statistics.median(c["seconds"] for c in calls),
            "latency_seconds_max": max(c["seconds"] for c in calls),
        },
        "capture_wall_seconds": {k: v["wall_seconds"] for k, v in caps.items()},
        "soak": {
            "epochs": [reliability_summary(e["rows"]) for e in soak_cap["epochs"]],
            "wall_seconds": soak_cap["wall_seconds"],
            "max_queue_seconds": max(
                t["queue_seconds"] for e in soak_cap["epochs"] for t in e["timings"]
            ),
        },
    }


def read_pack(path, root):
    if not re.fullmatch("[0-9a-f]{64}", root):
        raise ValueError("expected_root")
    with zipfile.ZipFile(path) as z:
        info = z.infolist()
        names = [i.filename for i in info]
        if (
            not 4 <= len(info) <= 10000
            or len(set(names)) != len(names)
            or sum(i.file_size for i in info) > 512 * 1024 * 1024
        ):
            raise ValueError("archive_inventory")
        if any(
            PurePosixPath(n).is_absolute()
            or ".." in PurePosixPath(n).parts
            or "\\" in n
            or n.endswith("/")
            for n in names
        ):
            raise ValueError("archive_path")
        raw = z.read("manifest.json")
        if sha(raw) != root:
            raise ValueError("manifest_root")
        m = loads(raw)
        if m["schema"] != "simurgh-phase4-pack-v1" or set(names) != {
            "manifest.json",
            *m["files"],
        }:
            raise ValueError("archive_inventory")
        files = {n: z.read(n) for n in m["files"]}
        if any(sha(v) != m["files"][n] for n, v in files.items()):
            raise ValueError("member_hash")
        return files


def verify_files(files, *, replay):
    files = dict(files)
    caps = {k: loads(files.pop(k + ".json")) for k in MODELS}
    workflows = loads(files.pop("workflows.json"))
    soak_cap = loads(files.pop("soak.json"))
    saved_report = loads(files.pop("report.json"))
    ledger = [loads(x) for x in files.pop("budget.jsonl").splitlines()]
    for cap in [*caps.values(), workflows, soak_cap]:
        check_protocol(cap["metadata"]["freeze_commit"])
        if cap["metadata"]["protocol_sha256"] != sha(
            (DOCS / "protocol.json").read_bytes()
        ):
            raise ValueError("protocol_binding")
    for model, cap in caps.items():
        if cap["model"] != model:
            raise ValueError("model_identity")
        raw = {
            n[len(model) + 1 :]: files.pop(n)
            for n in list(files)
            if n.startswith(model + "/")
        }
        verify_comparison(cap, raw, replay=replay)
    raw = {n[9:]: files.pop(n) for n in list(files) if n.startswith("workflow/")}
    calls = verify_workflows(workflows, raw, replay=replay) + [
        g["call"] for g in caps["luna"]["generations"]
    ]
    if (
        not 48 <= len(calls) <= 64
        or ledger != [c["attempt"] for c in calls]
        or ledger
        != [
            {"attempt": i + 1, "id": c["id"], "reserved_usd": str(RESERVE)}
            for i, c in enumerate(calls)
        ]
    ):
        raise ValueError("budget_ledger")
    if (
        soak_cap["complete"] is not True
        or len(soak_cap["epochs"]) != 2
        or soak_cap["wall_seconds"] < 59.5
    ):
        raise ValueError("soak_inventory")
    for i, epoch in enumerate(soak_cap["epochs"]):
        prefix = f"epoch-{i}/"
        raw = {
            n[len(prefix) :]: files.pop(n) for n in list(files) if n.startswith(prefix)
        }
        check_rows(epoch["rows"], raw)
        if len(epoch["timings"]) != 60 or any(
            not 0 <= t[k] < 3600
            for t in epoch["timings"]
            for k in ("queue_seconds", "run_seconds")
        ):
            raise ValueError("soak_timings")
    if files:
        raise ValueError("unexpected_archive_members")
    actual = report(caps, workflows, soak_cap, calls)
    if wire(saved_report) != wire(actual):
        raise ValueError("report_mismatch")
    return actual


def publish(base, out):
    base = Path(base)
    files = {}
    caps = {m: loads((base / m / "comparison.json").read_bytes()) for m in MODELS}
    workflows = loads((base / "luna/workflows.json").read_bytes())
    s = loads((base / "soak/soak.json").read_bytes())
    for d in ("luna", "llama", "soak"):
        for p in (base / d / "raw").rglob("*.sqlite"):
            files[str(p.relative_to(base / d / "raw"))] = p.read_bytes()
    calls = [
        c for r in workflows["rows"] for c in (r["first"], r["second"]) if c is not None
    ] + [g["call"] for g in caps["luna"]["generations"]]
    result = report(caps, workflows, s, calls)
    files.update({m + ".json": wire(c) for m, c in caps.items()})
    files.update(
        {
            "workflows.json": wire(workflows),
            "soak.json": wire(s),
            "report.json": wire(result),
            "budget.jsonl": (base / "luna/api/budget.jsonl").read_bytes(),
        }
    )
    verify_files(files, replay=True)
    out = Path(out)
    root = write_pack(out, files)
    (out.parent / "ROOT.sha256").write_text(root + "\n")
    save(out.parent / "report.json", result)
    print("verified archive", root, flush=True)


def main():
    p = argparse.ArgumentParser()
    p.add_argument(
        "command",
        choices=["freeze", "openai", "meta", "soak", "publish", "verify", "demo"],
    )
    p.add_argument("--out", type=Path)
    p.add_argument("--base", type=Path)
    p.add_argument("--key-file", type=Path)
    p.add_argument("--model-dir", type=Path)
    p.add_argument("--model-python")
    p.add_argument("--expected-root")
    p.add_argument("--archive", type=Path)
    a = p.parse_args()
    if a.command == "freeze":
        freeze()
    elif a.command == "openai":
        capture_openai(a.out, a.key_file)
    elif a.command == "meta":
        capture_meta(a.out, a.model_dir, a.model_python)
    elif a.command == "soak":
        soak(a.out)
    elif a.command == "publish":
        publish(a.base, a.out)
    elif a.command == "verify":
        print(
            json.dumps(
                verify_files(read_pack(a.archive, a.expected_root), replay=True),
                indent=2,
            )
        )
    elif a.command == "demo":
        files = read_pack(a.archive, a.expected_root)
        cap = loads(files["workflows.json"])
        check_protocol(cap["metadata"]["freeze_commit"])
        verify_workflows(
            cap,
            {n[9:]: v for n, v in files.items() if n.startswith("workflow/")},
            replay=True,
        )
        for r in cap["rows"]:
            print(
                r["case"],
                r["status"],
                "new effects:",
                len(r["new_effects"]),
                "prior:",
                len(r["before_effects"]),
            )


if __name__ == "__main__":
    main()
