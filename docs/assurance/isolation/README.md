# Descriptor-scoped isolation experiment

This extension tests a narrower execution contract for an approved task: open exact files and
connect approved TCP peers in trusted bootstrap, then forbid acquiring new file or network access.
It addresses the [earlier filesystem mailbox failure](../egress/README.md) without rewriting that
result. It also preserves useful selective network access through preconnected sockets.

The [saved report](evidence/report.json) has **19 cases × 3 controls = 57 rows**. All twelve named
attack baselines deliver; the capability profile denies them. File transformation and approved
IPv4/IPv6 exchanges still succeed. Descriptor sanitation closes two inherited-capability leaks in
both running controls. Two negative controls still succeed: unwanted content can travel through an
approved output file or approved socket. Deny-all loses every useful task.

## Reproduce locally

Linux x86_64, Python 3.12, unprivileged seccomp filter installation, `/proc`, IPv4/IPv6 loopback and
Unix sockets are required. No key, model, extra Python dependency or external target is used.
Missing platform capabilities or usable baselines cause refusal rather than skipped success.

```bash
export PYTHONDONTWRITEBYTECODE=1
export PYTHONPATH=tools/assurance-isolation:tools/assurance-scope
python -m unittest discover -s tools/assurance-isolation/tests -v
python -m simurgh_isolation.study run --out /tmp/simurgh-isolation/report.json
python -m simurgh_isolation.study verify /tmp/simurgh-isolation/report.json
python -m simurgh_isolation.study verify docs/assurance/isolation/evidence/report.json
python -m simurgh_isolation.study case file_write capability
```

Run from the repository root with a fresh output path. Verification checks exact matrix identities,
source hashes and every fresh result. Output overwrite and duplicate JSON keys refuse. Each run
creates temporary local fixtures and removes them afterwards. CI runs the same commands; a workflow
definition does not establish a hosted CI result. See [validation](VALIDATION.md) and [sources](SOURCES.md).

## Mechanism and observation

The unchanged exact-scope broker admits a fixed synthetic task before its transport launches the
child. This transport invokes a local capsule rather than the previous HTTP service. Trusted parent
provisioning opens read-only input and write-only output, and optionally connects an exact loopback
peer. The worker imports its code, validates file modes and peer identity against host configuration,
requires a single thread, rejects unexpected standard streams, and closes other descriptors.
All controls provision the local fixtures, including parent-owned TCP connections. Deny-all
prevents task execution, not fixture setup; the reported network effects are payload deliveries,
not connection handshakes.

The new x86_64 seccomp filter checks audit architecture and complete FD argument values. `read` and
`write` are restricted by descriptor and direction. New opens, sockets, connects, Unix IPC,
descriptor imports/duplication, signals, SysV IPC, exec, ptrace, io_uring and file-backed/shared mmap
are denied. Private anonymous allocation remains available. Raw `fork` inherits the profile;
glibc/Python's `os.fork` uses `clone`, which this profile intentionally denies. Unsupported setup
exits before task execution. This is additive to the platform's existing filter.

The parent reads files back, receives bytes through separate collectors, and observes signals in a
separate target process. A synthetic protected-file read is measured by its returned canary bytes;
there is no general audit of attempted reads. Collector timeouts during active I/O, incomplete
frames and malformed worker results invalidate the experiment. No worker assertion of "blocked"
alone establishes containment. The baseline still has the host platform's existing restrictions.

| Group              | Cases                                                              | Capability-profile result                        |
| ------------------ | ------------------------------------------------------------------ | ------------------------------------------------ |
| Useful work        | Transform, approved IPv4 TCP, approved IPv6 TCP                    | All complete                                     |
| File access        | Read, write, symlink, hardlink, `/proc/self/fd` reopen             | All deny                                         |
| IPC and network    | Pathname Unix, abstract Unix, UDP datagram, unapproved TCP, signal | All deny                                         |
| Child execution    | Raw-fork mailbox, exec mailbox                                     | Inherited denial; exec itself denies             |
| Descriptor hygiene | Unlisted file, unlisted connected socket                           | Closed before filtering in both running controls |
| Known limits       | Canary through approved output, canary through approved TCP        | Both deliver                                     |

## What the experiment does not establish

Landlock returned ENOSYS here; namespace provisioning was already unavailable. This profile uses
preopened capabilities instead of granting dynamic directory or destination permissions. Selective
access means existing connected peers, not DNS/domain allowlisting, TLS authentication, a firewall
or reconnect support. Open descriptors identify objects; renaming a path does not revoke an
already-granted descriptor. Provisioned objects must be suitable for the task. A deferred review limitation is that bootstrap
checks socket family/type/peer rather than querying its protocol; current trusted provisioning
creates TCP. Other IP stream protocols are outside the measured contract.

Bootstrap, loaded code, parent, kernel and observers share a trust boundary. No hostile preload,
native mandatory launcher, compromised host, arbitrary SDK workload, shared-memory inherited from
hostile setup, resource exhaustion, covert channel or cross-tenant isolation is covered. Reporting
pipes and approved outputs remain communication channels. The approved peer or host can relay data
onward. There is no content-release policy or incident-prevention guarantee.

This is ready for a bounded reproduction experiment, with the limitations above. The next evidence
needed is independently authored probes and an outside operator run, then a native launcher and a
real workload compatibility/overhead comparison. No independent operator or production readiness is
claimed. Existing [incident attribution](../scope/INCIDENT_RESEARCH.md) remains unchanged.
