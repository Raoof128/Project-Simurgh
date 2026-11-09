# Phase 19d results: namespace launcher and network-layer canary

**Arm:** `namespace_egress`. A worker runs under `unshare --user --map-root-user --net --mount
--pid --fork --ipc`, with a private `tmpfs` mounted over `/run` and `/dev/shm` before it starts and
every capability but `CAP_NET_ADMIN` dropped (P19-REPAIR04), and so has loopback only, **no IP
route**, no daemon socket in the runtime directories, its own PID space and no shared IPC; its
sanctioned path is the parent-owned proxy over a Unix socket in the lane's own work directory, which
stays shared by design (section 3). Before the repair the namespace confined IP routing and nothing
else, and the 8 Nov 2026 audit reached the Docker engine from inside it. The proxy canonicalises the destination, resolves redirects from its
own fixture table, applies the parent-owned destination allowlist and the role of the socket it
serves (never a role the request declares), allows only `GET` and `POST`, and forwards only to an
owned receiver on the parent's loopback. A hostile request line is a `malformed` decision, logged;
before P19-REPAIR03 three such lines killed the serve loop (8 Nov 2026 audit).
The canary is the namespace's own kernel counters (`/proc/net/snmp`: `Tcp.OutSegs`,
`Tcp.AttemptFails`, `Tcp.ActiveOpens`, `Udp.OutDatagrams`) read before and after each case, beside
the proxy's decision log. Linux only: the authoring host is macOS, so the first pack was produced in
a privileged Linux container on that host, and the P19-REPAIR03 pack on `portfolio-droplet`, the
owner's Ubuntu 24.04 x86_64 virtual machine (`receipt.json` names the kernel and machine of the host
that ran `verify`); the lane refuses to run where the namespace cannot be created, because a pack
with nothing run would be an empty evaluated range.

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
| self_declared_role              | the same request carrying `"role": "operator"`             | `malformed`                     | zero     |
| method_not_allowed              | `DELETE` on the allowlisted receiver                       | `method_not_allowed`            | zero     |
| unrequested_publish             | POST to a public paste host                                | `destination_not_allowed`       | zero     |
| same_destination_other_tool     | a direct TCP socket to the receiver's own loopback address | no route, `ENETUNREACH`         | zero     |
| mutable_tool_server_destination | rewrites its own config to point the tool server elsewhere | `destination_not_allowed`       | zero     |

All eleven hold; the receiver recorded exactly one effect. The redirect in `shortener_hop` is a
fixture mapping inside the proxy, not a live shortener (the lane makes no network call outside the
namespace and the parent's loopback). The counter conjunct of `holds` is vacuous for the proxy rows
(the worker opens only a Unix socket there, so no TCP segment can move); it carries weight only in
`same_destination_other_tool`. The decision and the receiver's single effect are what the proxy rows
show.

## 3. Covert-channel and Unix-socket probes

One measured covert channel: a file written from inside the namespace into the parent-readable
work directory. The pack reports the bytes delivered (the probe now fails the lane if the write did
not happen, P19-REPAIR02) and a bits-per-second figure that times one write together with
interpreter start-up, so it is a rate observed once, not a capacity. `eliminated: false`.

One probed overt channel: inside the lane's namespace the worker tries to connect to well-known
filesystem Unix sockets (the Docker engine, systemd-resolved's varlink socket, the system D-Bus,
journald, nscd, containerd, podman). The 8 Nov 2026 audit found the Docker engine API and
systemd-resolved reachable from inside the pre-repair namespace on a stock Ubuntu host, with no
route and no counter movement, and the P19-REPAIR03 pack recorded five reachable sockets on the
droplet. Under P19-REPAIR04 the runtime socket directories are hidden behind a private `tmpfs`, so
on the same host every probed socket reads `absent` and `unix_socket_egress_eliminated` is `true`
for the probed list; the residual is named: a socket elsewhere on the shared filesystem (outside
`/run` and `/dev/shm`) is not hidden, and the probe reports only the paths it checked. The results
are host-dependent, reported in the receipt, and not compared. The covert filesystem channel through
the work directory stays open by design (cluster D row 2).

## 4. What the verifier compares, and what it does not

Compared: every byte of the report except the fields named as host-dependent: the host triple,
the covert probe's timing and rate, the live-reader counter values and its post-`lo` routes, and
the socket probe's results. Per case that is the request, decision, expected, final destination,
namespace routes, counter deltas, hold flag and errno, and the proxy log in full. Mutations
rejected: a dropped case (`row_inventory`), a relabelled decision (`case_mismatch:<case>`), a
changed hold summary (`hold_mismatch`), plus `effect_mismatch`, `route_mismatch`, any other edit
(`report_mismatch`), `protocol_binding`, `source_binding:<path>`, `manifest_root`. The receipt is
built from the verifying host's recomputation: `host`, `live_reader_moved`,
`covert_probe_bytes_delivered` and `unix_sockets_reachable` describe that host, never the pack's
(before P19-REPAIR03 they were copied from the pack, so a verifying host's receipt carried the
authoring host's facts). `verify` itself runs only where the namespace can be created.

## 5. Limits

- One namespace on one host. The second-operator canary is attested, not recomputable (folded into
  `IOU-19-OPERATOR`).
- The namespace is not a full sandbox. It removes IP routes, hides `/run` and `/dev/shm`, gives the
  worker its own PID and IPC spaces and a single capability; it does not pivot to a minimal root,
  apply seccomp, or hide the work directory or any socket outside the two hidden directories. The
  socket probe says what it checked; a test inside the namespace asserts PID 1, empty `/run` and
  `/dev/shm`, and `CAP_NET_ADMIN` alone.
- The live-reader control runs in a separate namespace with `lo` brought up and shows two of the four
  counters moving; the worker reads and differences its own counters.
- The host for this pack is the owner's Ubuntu 24.04 droplet (the first pack came from a Linux VM
  under Docker Desktop on the authoring Mac, run `--privileged`). A hosted runner needs `sudo` or
  user namespaces enabled; the workflow step says so. On the droplet the socket probe reached the
  Docker engine (two paths), containerd, the system D-Bus and systemd-resolved from inside the
  namespace; the receipt lists them.
- The proxy's allowlists are fixtures authored with the cases.
- The egress study's README:87 ("No namespace/firewall claim") stays as written; the correction is
  in [`docs/assurance/egress/ERRATA.md`](../../assurance/egress/ERRATA.md).
