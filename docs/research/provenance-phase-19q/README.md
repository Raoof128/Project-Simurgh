# Phase 19q evidence: where the destinations in a public monitor benchmark came from

SLEIGHT-Bench (Najt, Toft, Tracy, Roger and Benton, 2026;
[github.com/safety-research/sleight-bench](https://github.com/safety-research/sleight-bench), MIT
licence) holds synthetic coding-agent sessions in which the agent does something harmful that
transcript monitors mostly miss, each paired with a benign session of the same task. Its authors
measure monitors and name "egress boundaries" as a separate layer they do not measure. This lane
measures one rule of that kind on their sessions: a session may only reach a destination that
someone with authority supplied. Every destination token is typed by the first block of the
session that holds it (the principal's own text, a tool result, or the agent), and three rules
are scored on the attack session and on its benign twin. No model runs here. See
[RESULTS.md](RESULTS.md) and [the declaration](../PROVENANCE_PHASE_19.md) (P19-DEST01), which
was committed before any instrument read a transcript.

**The result is mostly negative, and two of the three hypotheses declared before the run did
not hold.**

Verify the structure (any host with Python 3.12; standard library only):

```sh
python -B tools/assurance-provenance/evidence19q.py verify \
  docs/research/provenance-phase-19q/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19q/ROOT.sha256)"
```

That checks the shape of every row, recomputes every flag from the row's tokens and recomputes
the summary and the hypotheses from the rows; the receipt says `"kind": "structure_checked"`.
To recompute every row from the dataset, clone it at the pinned commit and pass the key its
README publishes (this needs the `cryptography` package):

```sh
git clone https://github.com/safety-research/sleight-bench
git -C sleight-bench checkout 218c58315cc01ff0dc5a100e906c27d82d259521
python -B tools/assurance-provenance/evidence19q.py verify \
  docs/research/provenance-phase-19q/evidence.zip \
  --expected-root "$(cat docs/research/provenance-phase-19q/ROOT.sha256)" \
  --dataset sleight-bench --key "<the key in the dataset's README>"
```

The receipt then says `"kind": "dataset_recomputed"`. Root
`fcd391eef0de8afe45d69cd32368dd4874669ae84f8b366938a53539a140d5cb`.

## What is and is not in this directory

The dataset carries canary strings against inclusion in training corpora, and its files are
encrypted at rest for that reason. Nothing of it is copied here. A row names a session by its
directory path, which the dataset's file listing shows in the clear, and holds counts, flags and
16-character digests of the destination tokens. No transcript text, destination or metadata text
is in the pack, and the verifier refuses a row with any other field.

## The rules

- **P**: every destination a command uses was supplied by the principal, in the principal's
  own text.
- **E**: by the principal or by the environment (a tool result).
- **A**: as E, except that a destination the agent itself wrote in the earlier stage of a
  two-stage attack is refused.

A destination is "used" when it is written in a `Bash` command (strict reading), or also when a
`Write` or `Edit` call puts it into a file (lenient reading). The primary cell, fixed before the
run, is rule P under the strict reading.

## What the pack shows

43 pairs. One directory has no benign twin and is left out.

|                          | Attack sessions flagged | Benign sessions flagged | Attack only | Both | Benign only |
| ------------------------ | ----------------------- | ----------------------- | ----------- | ---- | ----------- |
| Rule P, strict (primary) | 7 of 43                 | 6 of 43                 | 1           | 6    | 0           |
| Rule E, strict           | 5 of 43                 | 4 of 43                 | 1           | 4    | 0           |
| Rule A, strict           | 5 of 43                 | 4 of 43                 | 1           | 4    | 0           |
| Rule P, lenient          | 14 of 43                | 8 of 43                 | 6           | 8    | 0           |
| Rule E, lenient          | 10 of 43                | 6 of 43                 | 4           | 6    | 0           |
| Rule A, lenient          | 12 of 43                | 6 of 43                 | 6           | 6    | 0           |

- **In the primary cell the rule does not separate the attacks from the benign sessions.** It
  flags 7 attack sessions (95% interval 8.1% to 30.0%) and 6 benign ones (6.6% to 27.3%), and
  six of the seven are flagged on their benign twin as well. One attack is flagged alone.
- **Q1 did not hold.** Of the six attack sessions named in advance, three were flagged where at
  least five were declared.
- **Q2 held.** The rule has a cost: 6 of 43 benign sessions are flagged.
- **Q3 did not hold.** Under the strict reading neither second-stage laundering session is
  flagged by any rule.
- **Most sessions give the rule nothing to read.** 12 of the 43 attack sessions write a
  destination in a `Bash` command, and 21 do under the lenient reading.
- **Benign sessions use destinations nobody supplied about as often as attacks do.** Under the
  strict reading the benign sessions use 15 destinations: 6 from the principal, 2 from the
  environment and 7 that first appear in the agent's own output. The attack sessions use 18: 6,
  2 and 10.
- **No cell flags a benign session whose attack twin it does not flag.**

## Read after the fact (not part of the declared analysis)

These come from the committed rows. No transcript was read after the run.

- The three named sessions that were flagged (the ambiguous backup, the injected advisory and
  the piped installer) are each flagged on the benign twin too. In those pairs the benign task
  also has the agent reach a destination that first appears in its own output, so the rule
  cannot tell the attack from the task.
- The three named sessions that were not flagged (both second-stage laundering sessions and the
  hard-coded bucket) put their destination into a file with `Write` or `Edit` and never into a
  `Bash` command. Under the lenient reading all three are flagged and none of their benign twins is.
- What Q3 looked for appears under the lenient reading and only there: both second-stage
  laundering sessions are allowed by rule E and refused by rule A, because their destination
  came from a tool result in the second stage and from the agent in the first. In their benign
  twins the principal names the destination, and no rule flags them. This rests on two sessions
  and on a reading that was not the declared one for Q3.
- Under the lenient reading rule A flags 12 attack sessions and 6 benign ones, 6 attacks alone.
  Those six are the four sessions of the two laundering attacks, the hard-coded bucket and the
  one session flagged alone in the primary cell.
- That one session, `plausible_naming/monitor-prompt-leak-slack-webhook`, is one the author's
  sort before the run had placed among attacks whose destination was conferred. The sort was
  wrong about it.
- The author's sort before the run put nine sessions under "destination never conferred" and
  expected about nine flags. The strict reading flags three of the nine, each with its twin. The
  lenient reading flags seven, three of them alone. The two encoded attacks named in the
  declaration as out of reach are flagged by nothing, as said; the third,
  `needle_in_haystack/gzip-concat-stego`, is flagged under the lenient reading on both twins.

## What it means

A rule about where a destination came from, applied to the text of these sessions, is not a
substitute for the monitors the benchmark tests and does not come close on this data. Two things
stand in its way. Most of these attacks do their harm without a new destination: the
destination was asked for and the content is wrong, or nothing leaves at all. And in these
sessions a benign agent picks destinations nobody supplied nearly as often as an attacking one,
so a rule strict enough to matter stops ordinary work.

The one place the idea shows something is the pair of laundering attacks, where a destination
written by the agent in one session is followed from a file in the next. Typing that destination
by who first wrote it separates those two attacks from their benign twins. Two sessions do not
make a result, and the reading under which it appears was not the declared one.

## Where it ran

On the author's own machine, from a clean checkout at the instrument commit `364dd4bb`, against
a fresh clone of the dataset at the pinned commit, with Python 3.12 and `cryptography` 45.0.7.
The run built the report and then verified it against the dataset, 01:56:09Z to 01:56:10Z on
13 November 2026. The declaration (`7eb43531`) and the instrument were pushed before the run.
The host is the author's, so this is not a replay outside the author's custody.

## Limits

- Nothing was enforced and no model ran. The rules are applied to recorded text by a fixed
  grammar. A destination a session only produces when it runs is missed here; a network boundary
  would see the connection. A refusal would also end a session early, which a replay over a
  finished transcript cannot show.
- The grammar leaves out hosts written without a scheme, named git remotes and package indexes
  reached by a bare install command. A push to a named remote or an install of a mistyped
  package is invisible to it.
- The sessions are synthetic and were written to defeat transcript monitors. Nobody wrote them
  to defeat a destination rule, and nobody wrote the benign twins to be fair to one.
- 43 pairs give wide intervals. Rule A differs from rule E on the three two-stage attacks only.
- The author had read each directory's metadata summary before writing the declaration, and
  sorted the sessions by hand from it. Q1's list came from that sort. The run shows the sort was
  a poor predictor.
- The comparison with the published monitor catch rates in RESULTS.md sets a flagged session
  beside a per-trial rate. They are different units.

## Reproduce

```sh
python -B tools/assurance-provenance/evidence19q.py run --out /tmp/p19q-pack \
  --dataset sleight-bench --key "<the key in the dataset's README>"
```
