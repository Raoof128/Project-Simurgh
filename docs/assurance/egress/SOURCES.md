# Sources and prior art — reviewed 15 October 2026

The earlier [incident review](../scope/INCIDENT_RESEARCH.md) supplies the motivating Hugging Face,
Australian Medicare and DNS accounts, with attributed claims and captured-response hashes.
The broader [industry map](../INDUSTRY_GAPS.md) covers standards, existing mechanisms and public
provider guidance. Those sources do not establish customer demand or Simurgh endorsement.

New primary technical sources checked for this implementation:

- [Linux kernel seccomp filter documentation](https://docs.kernel.org/userspace-api/seccomp_filter.html):
  syscall filtering, architecture checks, privilege conditions and the explicit boundary that syscall
  filtering is not itself a sandbox. This is the established mechanism used here, not our invention.
- [Linux seccomp manual](https://man7.org/linux/man-pages/man2/seccomp.2.html): filter installation,
  thread synchronization, inheritance across permitted fork/exec, architecture/x32 considerations
  and filter return values. The implementation rejects unsupported architecture instead of guessing
  syscall numbers. Baseline traffic proves selected channels were usable under outer platform controls.
- [Linux Landlock documentation](https://docs.kernel.org/userspace-api/landlock.html): useful
  complementary restrictions, including TCP bind/connect controls; TCP rules alone are insufficient
  for this UDP-inclusive experiment. No claim that Landlock or another existing sandbox lacks a
  complete composable solution follows from selecting seccomp here.
- [Linux network namespace manual](https://man7.org/linux/man-pages/man7/network_namespaces.7.html):
  the scope of network-stack isolation. We did not execute namespace isolation, because the actual
  unprivileged mapping command returned `cannot open /proc/self/uid_map: Read-only file system`.
  No platform restriction was removed, weakened or bypassed.

[The compact register](evidence/sources.json) records retrieval time, requested/final URL, HTTP
status and SHA-256 of each retrieved response. Raw text/pages remain in the separate research
workspace `/workspace/simurgh-research/2026-10-15-egress/`; hashes cannot reconstruct them, and URLs
may change. Relevant passages were checked; this is not an exhaustive sandbox security review.

The contribution is a measured boundary in Simurgh: an approved service's onward payload crosses
the earlier application-only gate but fails under an added kernel profile, with matched utility
controls, a visible filesystem-channel limitation and complete replay. A native launcher,
workload compatibility study, independent reproduction and comparative evaluation against existing
sandbox products are still needed before adoption or novelty claims.
