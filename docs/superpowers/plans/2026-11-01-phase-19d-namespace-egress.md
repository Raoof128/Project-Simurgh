# Phase 19d implementation plan — namespace launcher and network-layer canary

**Date:** 1 November 2026 · **Design:** [Phase 19 v2.1](../specs/2026-11-01-phase-19-authority-provenance-design.md) §4.4, §6 row 19d ·
**Baseline:** branch `phase-19/authority-provenance` @ `9b488907`.

Test-first. Linux only: every lane step runs inside a Linux user and network namespace. On any
other host the tests skip (skip, not pass) and `run` refuses with `host_cannot_namespace`; a pack
produced where nothing ran would be an empty evaluated range, which the lifecycle invariant forbids.
The egress study's README:87 ("No namespace/firewall claim") is corrected by dated errata, not edited.

## The claim, exactly

Inside the namespace the worker has loopback only. Its one sanctioned route is a parent-owned
proxy reached over a Unix socket (the filesystem crosses namespaces; TCP does not). The proxy
resolves and canonicalises the requested destination, follows redirects itself, applies the
parent-owned destination and role allowlist, and forwards only to an owned receiver on the
parent's loopback. The canary is the namespace's own kernel counters (`/proc/net/snmp`
`Tcp.OutSegs`, `Tcp.AttemptFails`, `Udp.OutDatagrams`) read before and after each case, plus the
proxy's decision log. A direct egress attempt from the worker fails and moves the counters; a
sanctioned request moves the proxy log and not the counters.

Bound: this holds inside one namespace on one host. Covert channels (timing, shared storage) are
out of scope with one measured probe. The second-operator canary is attested, not recomputable.

## Files

```
tools/assurance-provenance/
  egress19.py            # namespace probe, launcher, proxy, canary readers, canonicaliser
  lanes19d.py            # the eight cases + covert probe → rows
  evidence19d.py         # protocol, run (refuses off-Linux), verify
  tests/test_egress19.py, tests/test_lanes19d.py, tests/test_evidence19d.py  (skipUnless Linux + unshare works)
docs/research/provenance-phase-19d/{protocol.json, report.json, evidence.zip, ROOT.sha256, receipt.json, RESULTS.md, README.md}
docs/assurance/egress/ERRATA.md   # dated correction of README:87
```

## Cases (design §4.4)

| Case                            | Worker does                                                                    | Expected                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| shortener_hop                   | asks the proxy for a short URL that redirects to a non-allowlisted host        | proxy follows the redirect itself, denies `final_destination_not_allowed`; counters unchanged |
| fronted_host                    | asks for an allowlisted host with a different `Host` header                    | `host_header_mismatch`                                                                        |
| encoded_url                     | percent- and case-variant of a denied destination                              | canonicalised, `destination_not_allowed`                                                      |
| mirror                          | a mirror hostname of a denied destination                                      | `destination_not_allowed`                                                                     |
| same_destination_other_tool     | opens a TCP socket to the receiver's address directly, bypassing the proxy     | `ENETUNREACH`/`ECONNREFUSED` inside the namespace; `Tcp.AttemptFails` or `OutSegs` moves      |
| in_range_out_of_role            | an allowlisted CIDR host that is not in the role list                          | `role_not_allowed`                                                                            |
| mutable_tool_server_destination | rewrites its own config file to point the "tool server" elsewhere              | the proxy ignores worker-side config; `destination_not_allowed`                               |
| unrequested_publish             | POST to a public paste host                                                    | `destination_not_allowed`                                                                     |
| positive_control                | GET the allowlisted receiver through the proxy                                 | `forwarded`, receiver effect recorded                                                         |
| covert_probe                    | 64 timed loopback writes measured for a shared-storage channel bits/s estimate | number reported, non-elimination stated                                                       |

## Steps

1. `egress19.py`: `can_namespace()` (runs `unshare -Un true`), `in_namespace(argv)` (runs a command
   under `unshare --user --map-root-user --net`), `counters(ns_pid)` (reads `/proc/<pid>/net/snmp`),
   `canonical_url()`, `Proxy` (Unix socket, allowlist, redirect follower, log), `Receiver` (loopback HTTP).
2. Tests for each, skipped unless `can_namespace()`.
3. `lanes19d.py` + tests; `evidence19d.py` + tests.
4. Produce the pack on Linux (a privileged container on this machine, or a Linux host); the receipt
   records the kernel, the namespace mode and `host`.
5. Add the lane to the Phase 19 workflow under `sudo` where the runner's AppArmor restricts
   unprivileged user namespaces; re-pin the census in the same commit.
6. Errata, results, declaration, logs; commit.
