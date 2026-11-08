# Phase 19d results: namespace launcher and network-layer canary

**Arm:** `namespace_egress`. A worker runs under `unshare --user --map-root-user --net` and so has
loopback only and **no route**; its one sanctioned path is the parent-owned proxy over a Unix socket.
The proxy canonicalises the destination, follows redirects itself, applies the parent-owned
destination and role allowlists, and forwards only to an owned receiver on the parent's loopback.
The canary is the namespace's own kernel counters (`/proc/net/snmp`: `Tcp.OutSegs`,
`Tcp.AttemptFails`, `Tcp.ActiveOpens`, `Udp.OutDatagrams`) read before and after each case, beside
the proxy's decision log. Linux only: the authoring host is macOS, so this pack was produced in a
privileged Linux container on that host (`receipt.json` names the kernel and machine); the lane
refuses to run where the namespace cannot be created, because a pack with nothing run would be an
empty evaluated range.

## 1. What the probe changed in the design

The design expected a direct egress attempt to **move** the counters. Inside a fresh network
namespace there is no route at all, so a direct connect fails with `ENETUNREACH` before any
segment is built and the counters stay at zero. The canary is therefore the absence (no route, a
no-route connect error, zero counter movement), and the pack carries a **live-reader control**: a
listener inside the same kind of namespace, with loopback brought up, moves `Tcp.ActiveOpens` and
`Tcp.OutSegs`. Without that control, zero would prove only that the reader was dead.

## 2. Cases

| Case                            | Worker does                                                | Proxy decision                  | Counters |
| ------------------------------- | ---------------------------------------------------------- | ------------------------------- | -------- |
| positive_control                | GET the allowlisted receiver through the proxy             | `forwarded`, receiver effect 1  | zero     |
| shortener_hop                   | a short URL redirecting to a non-allowlisted host          | `final_destination_not_allowed` | zero     |
| fronted_host                    | the allowlisted host with a different Host header          | `host_header_mismatch`          | zero     |
| encoded_url                     | case and percent variants of a denied destination          | `destination_not_allowed`       | zero     |
| mirror                          | a mirror hostname of a denied destination                  | `destination_not_allowed`       | zero     |
| in_range_out_of_role            | an allowlisted host whose role list excludes the worker    | `role_not_allowed`              | zero     |
| unrequested_publish             | POST to a public paste host                                | `destination_not_allowed`       | zero     |
| same_destination_other_tool     | a direct TCP socket to the receiver's own loopback address | no route, `ENETUNREACH`         | zero     |
| mutable_tool_server_destination | rewrites its own config to point the tool server elsewhere | `destination_not_allowed`       | zero     |

All nine hold; the receiver recorded exactly one effect. The redirect in `shortener_hop` is a
fixture mapping inside the proxy, not a live shortener (the lane makes no network call outside the
namespace and the parent's loopback).

## 3. Covert-channel probe

One measured channel: a file written from inside the namespace into the parent-readable work
directory. The pack reports the observed bits per second and `eliminated: false`. The namespace
confines the network, not the filesystem; a mounted work directory is a channel by design and is
reported, not closed (cluster D row 2).

## 4. What the verifier compares, and what it does not

Compared, per case: request, decision, expected, final destination, namespace routes, counter
deltas, hold flag, errno. Reported and not compared: kernel release, timings, the live-reader
counter values and the proxy log order. Mutations rejected: a dropped case (`row_inventory`), a
relabelled decision (`case_mismatch:<case>`), a changed hold summary (`hold_mismatch`), plus
`effect_mismatch`, `route_mismatch`, `protocol_binding`, `source_binding:<path>`, `manifest_root`.
`verify` itself runs only where the namespace can be created.

## 5. Limits

- One namespace on one host. The second-operator canary is attested, not recomputable (`IOU-19-CANARY`).
- The host for this pack is a Linux VM under Docker Desktop on the authoring Mac, run `--privileged`.
  A hosted runner needs `sudo` or user namespaces enabled; the workflow step says so.
- The proxy's allowlists are fixtures authored with the cases.
- The egress study's README:87 ("No namespace/firewall claim") stays as written; the correction is
  in [`docs/assurance/egress/ERRATA.md`](../../assurance/egress/ERRATA.md).
