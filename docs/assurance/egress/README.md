# Kernel enforcement around an approved service

The [task-scope experiment](../scope/README.md) retained a concrete failure: an approved service
could make an onward request invisible to the broker. This extension runs the unchanged scope
broker against a real HTTP service, then applies a Linux seccomp profile inside that service.
A separate parent-owned observer measures deliveries. **All eight tested network channels deliver
without this profile and are blocked with it; both useful request controls still complete.**

This is an ingress-only, scripted research fixture. It is not installed protection for an existing
application or a general sandbox. The [design](../../superpowers/specs/2026-10-15-assurance-egress.md)
defines the boundary, alternatives and gate lifecycle.

## Reproduce

Use Linux x86_64, Python 3.12, `/proc`, unprivileged seccomp filtering, local IPv4/IPv6 and Unix sockets.
No Python packages, API keys, external network services, root permissions or namespace setup needed.
The tested host is Linux 6.18.44 x86_64. Other architectures explicitly refuse installation.

```bash
export PYTHONDONTWRITEBYTECODE=1
export PYTHONPATH=tools/assurance-egress:tools/assurance-scope
python -m unittest discover -s tools/assurance-egress/tests -v
python -m simurgh_egress.study case tcp_ipv4 kernel
python -m simurgh_egress.study run --out /tmp/simurgh-egress-new/report.json
python -m simurgh_egress.study verify /tmp/simurgh-egress-new/report.json
python -m simurgh_egress.study verify docs/assurance/egress/evidence/report.json
```

Use a fresh output path; overwrite is refused. The report contains **12 named cases × 3 controls =
36 rows**. Verification checks complete ordered identities, source hashes (including the unchanged
broker), and fresh execution of every row. It refuses missing baseline deliveries, source drift,
observation drift and unavailable prerequisites. No skipped channel is counted as blocked.
An incompatible host cannot verify this entire report; a successful import alone is insufficient.

## Results and control costs

| Cases                              | Unfiltered fixture                 | Kernel-filtered fixture                | Deny-all                         |
| ---------------------------------- | ---------------------------------- | -------------------------------------- | -------------------------------- |
| Public read; approved write        | Both complete                      | Both complete; approved file read back | Neither service request executes |
| IPv4 TCP; IPv6 TCP                 | Outside payload observed           | EPERM, no outside payload              | No service execution             |
| IPv4/IPv6 UDP DNS-format packet    | Packet observed and acknowledged   | EPERM, no packet                       | No service execution             |
| Unix relay; TCP proxy relay        | Onward payload observed            | EPERM, no onward payload               | No service execution             |
| Forked relay; fork plus exec relay | Outside payload observed           | Child retains filter; EPERM            | No service execution             |
| Inherited connected socket         | Closed by trusted bootstrap; EBADF | Same closure before serving            | No service execution             |
| **Filesystem mailbox**             | **File written**                   | **File still written**                 | No service execution             |

“Unfiltered” means without this added profile; the platform's existing controls remain in force.
Both running controls use the same descriptor sanitation. Descriptor closure is therefore not
credited as a seccomp advantage. Deny-all shows useful work lost through blanket rejection.
Every named network baseline must reach its observer, so an already blocked host cannot produce
a misleading all-blocked result. These authored cases are not independent attacks or a general
attack-success estimate. See [validation](VALIDATION.md) for tests and review findings.

## Enforcement and observation contract

The trusted parent creates one Unix listening socket. The worker rejects socket standard streams
and non-listening/non-Unix ingress, closes other inherited descriptors, requires a single thread,
sets `no_new_privs`, and appends the filter with thread synchronization. Readiness is announced only
after installation and a real socket-denial probe. Subprocesses receive a minimal environment with
no inherited credentials. The worker runs one approved request and exits.

The profile defaults to EPERM and permits an explicit x86_64 syscall set for Python, files and
inbound replies. New sockets, connect, socketpair, descriptor import, io_uring, ptrace and filter
replacement are unavailable. `sendto` is permitted only with a null destination pointer, allowing
replies on existing connected ingress sockets. Other audit architectures and x32 syscall numbers
are killed. Fork/exec inherit the filter. The initial standard-library imports and bootstrap are
trusted; this Python fixture is not a native launcher for arbitrary untrusted startup code.

The same exact-scope broker authorizes the service request in both running controls. A blocked
onward attempt returns HTTP 503; the broker stops as unavailable. The observation comes from the
separate observer's received payload or mailbox read-back, not the service's claimed outcome. The
observer acknowledges valid payloads, drains after worker exit, and refuses errors. This measures
delivered fixture payloads, not every SYN, connection attempt, transient packet or covert channel.

## Boundaries and next work

- **Filesystem and process effects remain possible.** The mailbox negative result is intentional.
  This filter permits local file operations and process signals; it does not isolate the host,
  authenticate peers, protect the observer from a hostile host or prevent all indirect communication.
- **Ingress replies remain possible.** A service can return arbitrary data to its caller. This is
  not a confidentiality filter. Files, response bodies and inherited pipes need their own policy.
- **Selective outbound access is unavailable.** The service cannot fetch even a legitimate remote
  dependency. Useful controls here need only ingress and local files; this is a limited compatibility
  result, not a claim that arbitrary research workflows remain useful.
- **Only the service worker is filtered.** Parent broker/observers stay outside the profile. This
  fixture does not turn an arbitrary agent with other tools into a contained system.
- **No namespace/firewall claim.** Namespace setup was unavailable in this executor. The alternative
  adds kernel restrictions without changing platform policy. DNS tests send a synthetic DNS-format
  UDP packet to a local collector; they do not contact a resolver or prove filtering by domain name.
- **Same host, scripted probes, shared implementation.** No live exploit, incident reproduction,
  real credential, model evaluation, independent operator or production deployment was tested.

The next deployment increment is a reviewed native launcher plus selective network namespaces and
destination policy on a suitable host, followed by held-out probes and outside reproduction. The
filesystem mailbox finding needs separate filesystem isolation/IPC policy. Neither is silently
closed by these network results. See [sources and prior art](SOURCES.md).
