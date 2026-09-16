# Changelog

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
