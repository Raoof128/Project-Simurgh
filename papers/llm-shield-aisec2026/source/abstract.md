# Abstract Source

The abstract in `main.tex` must remain bounded:

- input guardrails are evaluated at input;
- agentic failures can happen downstream;
- the prototype produces metadata-only signed evidence;
- evaluation uses frozen corpora and signed evidence;
- results are bounded to evaluated corpora;
- explicit non-claims are present.

Forbidden wording:

- proves safety;
- prevents all jailbreaks;
- solves prompt injection;
- deployment readiness.
