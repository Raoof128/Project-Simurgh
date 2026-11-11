# Phase 19 manuscript (draft)

[PAPER.md](PAPER.md) is a workshop-length write-up of four Phase 19 lanes: the framing capture
(19h), the two injection-style studies (19i exploratory, 19k confirmatory) and the two gate replays
(19j, 19l). It adds no evidence. Every number in it comes from a committed pack's `report.json` or
`receipt.json`, and `tools/assurance-provenance/tests/test_paper19.py` checks the pack roots in
Appendix A and the Study 3 and Study 4 counts against those packs, so the manuscript cannot drift
from them unnoticed.

Status, stated plainly:

- A draft. It has not been submitted anywhere and has not been peer reviewed.
- The author line and the section "Use of AI assistance" carry bracketed notes for the author to
  complete. The engineering and the first draft were produced by an AI coding agent under the
  author's direction; the section says so and the author must confirm its wording.
- The 36 references were resolved against arXiv (or, for the two statistics papers, the journal
  record) when the related-work section was written. Venues are omitted unless confirmed.
- It is Markdown so that numbers stay traceable. Appendix B lists what a LaTeX conversion for a
  venue needs.

Release tag `phase-19-paper-v1.0` marks the commit the manuscript's verify commands refer to; the
release page carries the tagged commit and a permanent archive link.
