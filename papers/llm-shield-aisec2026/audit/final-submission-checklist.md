# Final Submission Checklist

Audit date: 2026-06-24

| Item                        | Status | Evidence                                                                   |
| --------------------------- | ------ | -------------------------------------------------------------------------- |
| Venue requirements verified | PASS   | `audit/venue-requirements.md`                                              |
| PDF builds                  | PASS   | `make` in `Papers/llm-shield-aisec2026` completed successfully.            |
| Page limit satisfied        | PASS   | `pdfinfo main.pdf` reports 5 pages; AISec allows up to 10 content pages.   |
| Anonymisation checked       | PASS   | PDF metadata and `pdftotext` identity scan passed on 2026-06-24.           |
| Artifact package ready      | PASS   | `artifact/build-anonymous-submission.sh` built the anonymous tarball.      |
| Citations checked           | PASS   | Related work expanded; `audit/citation-audit.md` updated.                  |
| Claims checked              | PASS   | `audit/repo-claim-audit.md`                                                |
| Non-claims checked          | PASS   | `audit/nonclaim-audit.md`                                                  |
| Ethics included             | PASS   | `source/ethics.md` and `main.tex`                                          |
| GenAI disclosure included   | PASS   | `source/genai-disclosure.md` and `main.tex` after references               |
| Reproducibility tested      | PASS   | `artifact/reproduce-paper-claims.sh` and `scripts/reproduce-vca-chain.sh`. |
| Repository tests            | PASS   | `npm test`: 989 passed, 0 failed.                                          |
| Repository check script     | PASS   | `scripts/check.sh`: 151 passed, 0 failed.                                  |
| Known limitations listed    | PASS   | `source/limitations.md` and `main.tex`                                     |

Final status: **READY FOR AISec HOTCRP UPLOAD**

Reason: venue requirements, anonymous PDF, anonymous artifact package, reproducibility commands, tests, and repository gate all passed in the current worktree.

## Current Blockers

- None found in the current audit.
- Manual step remains: upload the anonymous PDF and anonymous artifact archive to HotCRP. Enter author name, affiliation, and email only in the submission system metadata, not in `main.pdf`.
