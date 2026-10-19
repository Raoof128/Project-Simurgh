# Ethics Statement

Project Simurgh is built on the principle that **integrity verification must not become surveillance**.

This statement primarily describes the historical academic/device workflow. The current research
track also studies agent authorization and evidence; its synthetic evaluation, optional live API
transport and publication limits are documented in [PRIVACY.md](../PRIVACY.md) and the
[current reviewer index](REVIEWER_INDEX.md).

---

## Core Commitments

### 1. No Automatic Misconduct Findings

Simurgh produces risk scores and event timelines. It emits review flags, but does not make automatic misconduct findings or impose penalties. Every anomaly recommendation requires a human reviewer who applies institutional judgment and due process.

The scoring module emits “Manual review recommended. No automatic misconduct finding.” for
Warning and “Manual review required. No automatic misconduct finding.” for Critical. These
messages are implemented in [`src/academic/riskScoring.js`](../src/academic/riskScoring.js).

### 2. Metadata Only

The academic/device collection policy excludes answer and media content. Its intended exclusions
are listed below; the [privacy policy](../PRIVACY.md) separately records the confirmed legacy-helper
identifier exception. The policy excludes:

- What a student typed
- What a student pasted
- What was on their screen
- Their face, voice, or body

This data-minimisation choice limits collection but does not make client metadata trustworthy.
The underlying display-fidelity research identifies ways screen capture can omit what an operator
sees. Metadata signals also have blind spots and can be forged by a compromised endpoint.

### 3. Transparency to Examinees

The student exam page displays a privacy notice on load that must be acknowledged before the session begins. This notice explains:

- What is monitored (behavioural metadata)
- What is not monitored (screen, camera, audio, content)
- How risk scores are used (human review trigger, not automatic finding)

Students must actively consent before the session starts.

### 4. Explainable Scores

Risk scores are produced by local deterministic heuristics with documented weights and thresholds. Every score can be traced to specific signals (paste length, focus losses, WPM cadence, helper status). There is no black-box model making undisclosed decisions about exam integrity.

When Claude provides narrative reasoning, its source is explicitly labelled in the audit trail.

### 5. Tamper-Evident Audit Chain

The HMAC-SHA256 audit chain detects changes relative to a trusted key and retained chain state.
An operator holding the HMAC key can recompute a modified chain, so this mechanism alone does not
prove an immutable history against that operator. Independent custody or externally retained
commitments are needed for a stronger claim. Institutions should provide an accessible review
and contest process for affected students.

### 6. Proportionality

Simurgh is designed for high-stakes, time-limited assessment contexts. It is not appropriate for:

- Continuous workplace monitoring
- Passive, ambient surveillance
- Any context where the monitored person has not been informed

Deploying Simurgh in contexts beyond its designed purpose is a misuse.

---

## Known Ethical Tensions

### False Positives

Heuristic scoring will produce false positives. A student who pastes a long block quote from a permitted source, or who has an unstable internet connection causing reconnects, may score Warning or Critical. The human review requirement exists precisely to catch these cases.

Institutions using Simurgh should establish a clear appeals process before deployment.

### Accessibility

Students using assistive technology, dictation software, or non-standard input methods may exhibit telemetry patterns that resemble anomalies. Any deployment should include an accommodation workflow that excludes or adjusts scoring for students with documented accessibility needs.

### Power Asymmetry

Any proctoring system creates a power imbalance. The commitments in this document aim to limit that imbalance, but they do not eliminate it. Institutions should treat Simurgh's output as one input among many in an academic integrity process, not as a final authority.

---

## Research Context

This project implements Countermeasure C from _The Invisible Window: A Taxonomy of Display-Fidelity Violations and Proposed Mitigations_ (Abedini, 2026). The paper discloses both the attack surface and its limitations. Publishing the countermeasure alongside the attack is a deliberate choice — security through obscurity does not protect students or institutions.
