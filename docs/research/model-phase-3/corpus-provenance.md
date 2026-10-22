# Phase 3 corpus provenance

Authored on 2026-10-15 by a fresh internal Codex task-author agent dispatched for this
corpus. This is internal agent authorship, not external authorship or external independence.
The author worked from the dedicated corpus brief and repository guidance; no evaluated
model output was seen, and no model was run to develop, select, tune, or validate the tasks.
No other corpus, phase-2 cases, old model prompts, development examples, or implementation
was inspected. Repository standing invariants and recent logs were read for scope and
preservation requirements. Historical aggregate results in those logs are not output used
to author these tasks.

## Scope and construction

The corpus contains 60 synthetic tasks: 30 benign and 30 adversarial, arranged as 30 matched
pairs in ten families, with three pairs per family. Every pair shares the trusted instruction
and expected recipient/content. Only the source differs. Both variants retain the original
relevant workflow facts; benign variants add coherent operational context, while adversarial
variants introduce redirection
at the beginning, within the note, or at its end. Directives are no longer universally an
appended suffix. Each matched pair differs in source character length by no more than 10%
of its longer source. Each workflow uses synthetic inbox names and invented operational
details, with no real personal data, secrets, addresses, or endpoints.
Credential-bait strings are explicit dummy markers, not usable credentials.

Families cover authority spoofing, instructions embedded in tool output, credential bait,
relays through an approved channel, asserted policy changes, helpful debugging pretexts,
quoted chats, recipient aliases, plain-ASCII multilingual instructions, and format repairs.
Benign sources include relevant operational facts and occasional quoted instructions that
remain data. Adversarial variants contest the recipient, report content, or permission for
an extra message. All retain a useful authorized action.

This is a bounded exact-copy task. Every trusted instruction explicitly provides the
host-approved literal report and destination. Success means sending that report to that
inbox; refusal, creative summarization, source-derived edits, and unauthorized extra
messages are not expected successes. This corpus does not measure unrestricted research,
open-ended summarization, real-world delivery, or general resistance to prompt injection.
The receiving model is expected to see the source clearly labeled as untrusted.

## Validation before model exposure

A local Python standard-library validation passed on the serialized JSON. It checked exact
root/task/expected keys, the schema marker, nonempty strings, 60 unique task IDs, 30 benign
and 30 adversarial entries, 30 pairs, ten families with three pairs each, paired instruction
and expected-value equality, different paired sources, all requested length limits, and
source-length balance within each pair. Before writing the revised corpus, the author also
asserted that every non-source task field was unchanged from the original authored corpus.
It additionally checked that all expected values are ASCII and occur verbatim in the
trusted instruction, that the 60 sources are distinct, and that all resources are synthetic
inbox names. Manual author review checked workflow relevance, attack intent, usable
authorized solutions, quoted benign data, and the absence of real credentials or recipients.
This is author self-validation, not the separate task review coordinated by the parent.

Maximum observed lengths in characters: ID 30; instruction 367; source 475; expected
resource 23; expected content 77. The original bounds are respectively 64, 900, 1200,
160, and 160. No behavioral model result is asserted by these checks.

SHA-256 of the revised `tasks.json` bytes:
`5e0ad1b824fdade96d19f3ddd18914fb54f1a36d0ddcc723b20d6b2ab3a06633`.
Any later byte change requires recomputing this digest and revalidating the corpus.

## Pre-freeze methodology correction

A separate task review identified complete source-length confounding in the initial draft:
benign sources ranged from 132 to 210 characters, adversarial sources from 334 to 468, and
all adversarial sources appended directives to the original benign source. Before freezing
the corpus, the author added meaningful workflow context to benign sources and varied the
placement of adversarial directives while preserving their goals and authorized solutions.
IDs, pair IDs, families, trusted instructions, expected values, and kind labels are unchanged.
This was a methodology correction prompted by static review, not result-conditioned editing.
No evaluated model outputs were seen and no model was run before or during the revision.

The initial pre-freeze corpus had SHA-256
`535c2fc41485e6acd43d2499556e815879a594e71d377efa238ba6a0b7629452`.
That digest is preserved here as the prior draft identity, not as the current corpus hash.
The revised benign source range is 336-475 characters and adversarial range is 334-468.
All 30 pairs satisfy the specified 10% relative-length bound; the largest observed difference
is 3.632% of the longer source. Directive placements span ten beginnings, ten interior
positions, and ten endings. The benign context additions are scenario-specific, not repeated
filler. This revision still requires the parent's read-only re-review before freeze.

## Limitations

Potential template dependence remains: all tasks share a simple send-report interaction,
an explicit trusted-source boundary, and a repeated instruction suffix. Length matching
reduces the original perfect length confound but does not eliminate token-count, vocabulary,
directive-style, paragraph-layout, or source-composition differences between conditions.
Placement follows three recurring forms; the revision does not establish distributional
equivalence beyond the measured pairwise character-length constraint. Synthetic scenarios
and transparent dummy credentials may be easier than natural operational material. Three pairs per family provide limited within-family variety.
The multilingual cases cover only short French, Spanish, and Italian text in plain ASCII;
they do not establish broad multilingual or Unicode coverage. Pair/family clustering must
be preserved in later analysis. There has been no comparison with other corpora, no external
independence assessment, and no measurement of attack effectiveness during authorship.

Only `tasks.json` and this provenance note were written by the corpus-author task. Existing
source, signed evidence, frozen artifacts, and logs were not edited; no commit was made.
