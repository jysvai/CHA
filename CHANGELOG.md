# Changelog

## 1.1.0 — 2026-09-18

CHA run against CHA. The loop had been packaged and shipped without ever being
pointed at the repository that ships it, and the first round found eight defects
in its own tools — four of them the repository's own defect classes, living in
the tools built to find them. Every one was confirmed by **running it** before
anything was edited, fixed red-test-first, and given a mutant.

The round, with the command next to every number, is `.cha/record.md`.
Measured: 23 suspicions → 10 참 / 1 거짓 / 12 못 잼 · 8 fixes · 8 mutants ·
full sweep `8 잡음 · 0 샜음 · 0 못 잼` in 8m58s.

### Fixed

- **`tools/mutate.mjs` scored an unmeasurable mutant as caught.** A test killed
  by the timeout — or one that never started — returns a null status, which is
  not zero, so the sweep called it 잡음. The line was never measured and sat on
  the healthy side of the table, and the sweep exited 0. It is now 못 잼, with
  the reason, and the sweep fails on it.
- **`tools/add-mutant.mjs` silently halved a mutant list.** Against the
  `{ "mutants": [] }` root that `docs/en/10-faq.md` offers, it created a second
  list under `어긋들` and the sweep read that one. Every mutant written before
  that moment stopped being swept while staying visible in the file.
- **`tools/queue.mjs` could send nothing and report success.**
  `secondEye.maxRetries: "six"` became `NaN`, `NaN >= 0` is false, and the send
  loop never ran once: `0 answered · 0 already · 0 lost`, exit 0. The three
  numeric config keys are now checked, and a word where a number belongs stops
  the run.
- **`tools/queue.mjs` died on a reviewer that did not read its briefing.** EPIPE
  arrived on a stream with no listener and took the whole run down with it,
  losing every answer still queued behind. Measured at 1 run in 8 with a small
  briefing, every run with a large one.
- **`tools/brief.mjs --max 20kb` removed the cap.** `Number('20kb')` is `NaN`,
  every `> NaN` is false, so nothing was cut and nothing was flagged: one 41.9KB
  briefing, under the line `cap NaNKB`, exit 0.
- **`tools/brief.mjs` exited 0 on a briefing over the cap**, so only a human
  reading the screen could tell. It now exits non-zero.
- **`tools/brief.mjs` handed out a stack trace** for a directory argument, and
  could not read an absolute path — the form Windows tab-completion and every
  `file:line` quote produce.

### Added

- **`tools/argv.mjs`** — argument reading that stops instead of guessing. An
  unknown option is a stop, a flag where a value belongs is a stop, a number
  that is not a number is a stop. `--only --redo` used to send every briefing
  at quota cost while the screen said one tag had been asked; `--brieffings x`
  ran the default directory and said nothing.
  It is a module and not four copies of an `indexOf` because rules with no seam
  get no tests.
- **`test/tools.test.js`** — twelve checks, the first tests this repository has
  had for its own tools. Each one is a defect that was confirmed by running the
  tool, and each was watched fail before the tool was touched.
- **`.cha/`** — this repository now runs its own loop: `config.json`,
  eight mutants in `mutants.json`, and the cumulative record.

### Found by the mutants, not by reading

- One of the new tests could not tell two reasons apart: deleting the `--max`
  number check left it green, because the guard below says `--max must be
  greater than 0` and the assertion only looked for `--max`. Defect class 3,
  inside the test written to prove class 3 matters.
- The control test was flaky one run in four — node's own start-up passing a
  four-second fixture timeout. Before the timeout fix that slowness scored as
  잡음, so it could not have been seen.

## 1.0.0 — 2026-09-16

First public release. Everything here was extracted from a 39-round release
review of a separate project, not designed in advance; the numbers quoted
throughout the repository are from that review and are reported as measured.

### Commands

`/cha-init`, `/cha-hunt`, `/cha-brief`, `/cha-review2`, `/cha-judge`,
`/cha-fix`, `/cha-mutate`, `/cha-gate`, `/cha-record`, `/cha-status`.

### Skills

`cha-loop`, `cha-briefing`, `cha-adjudication`, `cha-mutation`, `cha-red-test`,
`cha-record`. They load when the work matches; they can also be named directly.

### Agents

`cha-hunter` (read-only first eye), `cha-adjudicator` (runs the claim, returns
the command and its output), `cha-mutant-smith` (lifts the source line, builds
the mutant, confirms it is caught).

### Tools

Zero-dependency Node 20+ ESM. No install step, no `node_modules`.

- `tools/brief.mjs` — cuts a source file into briefings of at most 20480 bytes,
  measured in bytes because CJK is three bytes a character, cut at function
  boundaries, with the original line numbers kept.
- `tools/queue.mjs` — sends briefings to the second eye one at a time, backs off
  on quota errors and re-asks the same briefing rather than skipping it, and
  resumes from whatever answers are already on disk.
- `tools/mutate.mjs` — runs the mutation sweep in a temp copy, never in place,
  restoring in a `finally`. Reports 잡음 / 샜음 / 못 잼, and exits non-zero on
  either of the last two.
- `tools/add-mutant.mjs` — lifts the anchor off the disk instead of letting
  anyone retype it, widens it until it matches exactly once, and refuses a
  `--test` that is not a real path.
- `tools/repair-anchors.mjs` — finds anchors that have drifted, `--write` fixes
  them.
- `tools/record.mjs` — appends a round to `.cha/record.md` and bumps the status
  table in place. **Refuses any write that would not make the file longer**,
  in memory and again on disk.
- `tools/hook-guard.mjs` — the `PostToolUse` hook. Never blocks, always exits 0,
  silent on any parse failure.

### Hook

`hooks/hooks.json` registers a `PostToolUse` hook on `Edit|Write`. When a source
file (not a test) is edited in a repository that has a `.cha/` directory, it
adds one note: this fix still owes a red test and a mutant. It checks nothing
and blocks nothing. A hook that breaks someone's session is worse than no hook.

### Templates

`templates/config.json` (every key the tools actually read),
`templates/record.md` (status table plus one worked round),
`templates/mutants.json` (the empty shell), `templates/mutants.example.json`
(two worked entries, one in Korean field names and one in English, because both
spellings parse and mixing them is allowed), `templates/briefing.md`.

### Documentation

Eleven documents in Korean and eleven in English, `docs/ko/` and `docs/en/`.
`03-하네스조정` / `03-harness-tuning` is the long one: every rule in this repo
with the accident it came from.

### Example

`examples/` is a worked round over a twenty-seven-line module with a real class-1
defect. `examples/WALKTHROUGH.md` walks all nine steps, and every block of output
in it was produced by the tool named above it.

### Site

`site/index.html` — one self-contained page, KO/EN toggle, no external requests.

### License

Apache-2.0. See `LICENSE` and `NOTICE`.
