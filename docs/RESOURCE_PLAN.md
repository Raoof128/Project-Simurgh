# Stage 2 Resource Plan

> **Status (v0.4.3, 2026-05-15):** Stage 2.1 (signed proofs) and 2.2 (macOS node pairing) shipped as solo R&D using the resources available. Stage 2.3 (localhost daemon), 2.4 (browser SDK), and 2.5 (ScreenCaptureKit) still require the institutional resources outlined below.

Stage 2 requires institutional validation, not only solo development.

| Resource                           | Why needed                                                                       | Stage 2 impact                           | Priority |
| ---------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------- | -------- |
| Red-team testing                   | Validate overlay, replay, helper spoofing, dashboard, and API paths              | Calibrates real security claims          | Critical |
| Privacy/legal review               | Confirm data minimisation, consent, retention, and student-rights posture        | Required before institutional pilot      | Critical |
| Hardware/device testing            | Exercise managed and BYOD devices across OS versions                             | Reduces platform blind spots             | Critical |
| Pilot environment                  | Run controlled exam simulations with consenting participants                     | Produces real validation evidence        | Critical |
| Senior security mentorship         | Review threat model, key management, node proof design, and disclosure process   | Raises architecture quality              | High     |
| AI-agent testing access            | Test Computer Use and UI-redressing scenarios against agent workflows            | Expands beyond academic use case         | High     |
| Institutional LMS/test integration | Validate Canvas/Moodle/Blackboard or custom exam portal workflows                | Makes pilot realistic                    | High     |
| Windows helper development         | Detect Windows display-affinity behavior                                         | Required for cross-platform coverage     | High     |
| Linux helper development           | Validate X11/Wayland realities                                                   | Required for lab and BYOD Linux coverage | Medium   |
| macOS notarisation/signing         | Make helper deployable in managed macOS environments                             | Required for real pilot distribution     | High     |
| Secure deployment pipeline         | Sign releases, publish checksums, protect CI secrets                             | Prevents supply-chain weakness           | High     |
| CI/CD hardening                    | Add branch protection, artifact retention, dependency review, and release checks | Improves reviewer confidence             | High     |
| Threat-intelligence monitoring     | Track new overlay, proctoring bypass, and agent-control techniques               | Keeps model current                      | Medium   |
| Accessibility review               | Ensure scoring and workflows do not penalize assistive technologies              | Required for ethical deployment          | Critical |
| Documentation review               | Make claims clear for technical, legal, and academic reviewers                   | Lowers review friction                   | Medium   |
| Responsible disclosure support     | Manage future findings safely                                                    | Supports security maturity               | Medium   |
