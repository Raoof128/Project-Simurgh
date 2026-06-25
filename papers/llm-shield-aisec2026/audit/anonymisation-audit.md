# Anonymisation Audit

Audit date: 2026-06-24

## Checks

| Check                                     | Status                   | Evidence                                                                                                                                                       |
| ----------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blind title avoids public project name    | PASS                     | `main.tex` title is "Verifiable Containment Attestation After LLM Guardrail Failure".                                                                          |
| Author metadata anonymous                 | PASS                     | `main.tex` uses `Anonymous Author(s)` and `Anonymous Institution`; no email is declared.                                                                       |
| Public repository URL absent from paper   | PASS                     | no public repo URL in `main.tex`.                                                                                                                              |
| Author name/email/ORCID absent from paper | PASS                     | `pdftotext main.pdf -` scan found no author name, email, ORCID, public handle, public repo URL, local filesystem path, or public project-name leakage.         |
| Public Zenodo DOI absent from paper       | PASS                     | no DOI self-citation in `main.tex`.                                                                                                                            |
| Local filesystem paths absent from paper  | PASS                     | paper uses relative repository evidence paths only in tables; no `/Users/...` paths.                                                                           |
| Generated PDF metadata checked            | PASS                     | `pdfinfo main.pdf` reports title only; no PDF `Author` field is present. PDF has 5 pages.                                                                      |
| Support docs mention public project name  | ACCEPTABLE INTERNAL ONLY | README notes that blind review must avoid identifying metadata. Do not ship internal support docs verbatim as artifact if they contain identifying references. |

## Current Status

PASS. The source and generated PDF are in anonymous review mode. Do not submit any camera-ready or author-identifying variant to HotCRP during blind review.
