# 기록 / record — CHA

Append only. Nothing is ever deleted from this file: not the claims that turned
out false, not the fixes that were reverted, not the mutants that leaked, not
the things nobody could measure.

This repository packages a loop it had never been run against. Round 1 is CHA
turned on CHA — its own tools, hunted, adjudicated by execution, fixed red-first
and guarded by mutants. Everything below was produced by running something, and
the command is written next to the number it produced.

The status table below is the only part of this file that is ever edited in
place, and only by bumping counts. `node tools/record.mjs` appends rounds and
refuses to write anything that would make this file shorter.

---

## 상태 / status

| | |
|---|---|
| 관문 / gates | 1 |
| 브리핑 / briefings | 0 |
| 주장 / claims | 23 |
| 참 / true | 10 |
| 거짓 / false | 1 |
| 못 잼 / unmeasurable | 12 |
| 고침 / fixes | 8 |
| 어긋 / mutants | 8 |
| 마지막 전수 / last sweep | 8개 · 8분 58초 · 잡음 8 · 샜음 0 · 못 잼 0 (2026-09-18) |

Every number in this table must be traceable to a section below it. If it is
not, the table is wrong and the sections are right.

---

## 회차 1 / round 1 — 2026-09-18

### 사냥 / hunt

files read: `tools/brief.mjs`, `tools/queue.mjs`, `tools/mutate.mjs`,
`tools/add-mutant.mjs`, `tools/record.mjs`, `tools/repair-anchors.mjs`,
`tools/hook-guard.mjs`, all of `commands/`, `skills/`, `agents/`,
`templates/`, `examples/`, `docs/en/`

files skipped: `tools/gen-diagrams.mjs`, `tools/gen-loop-gif.mjs` — build
scripts for the pictures, not part of the loop

The first eye was three read-only passes run in parallel, one over the runtime
tools, one over the command/skill/agent surface, one over the examples and
templates. They produced suspicions with `file:line` and a way to measure each
one. No fixes, no verdicts.

### 브리핑 / briefings

none. `secondEye.command` is `null` in this repository: there is no second
platform wired up here yet, so round 1 ran without step 3 and says so rather
than calling a same-platform pass a second eye.

That is also why 주장 below are **suspicions promoted by execution**, not
second-eye claims. When a second eye is wired, the count starts separating.

### 2차 눈 / second eye

not run — see above.

### 판정 / adjudication

23 suspicions, each settled by running it. 10 참 / 1 거짓 / 12 못 잼.

| 주장 / claim | 판정 | 돌린 것 / command | 나온 것 / output |
|---|---|---|---|
| a mutation whose test is killed at the timeout is scored 잡음 | 참 | fixture with `바꿀것: "while (true) {}"`, `timeoutMs: 3000`, then `node tools/mutate.mjs` | `✓ a-001 … caught it · 3.1s` · `1 잡음/caught` · exit 0 — the test never reached an assertion |
| `{"mutants": []}`, the root `docs/en/10-faq.md:73` offers, loses its entries | 참 | wrote that root, ran `add-mutant.mjs`, then `mutate.mjs --json` | file ends with both `mutants` and `어긋들`; the sweep ran `1 deliberate breakages` of 2 |
| `secondEye.maxRetries: "six"` skips every briefing and reports success | 참 | `node tools/queue.mjs` with that config | `0 answered · 0 already had answers · 0 lost`, exit 0. Control with `6`: `2 answered` |
| `--only --redo` widens the queue instead of scoping it | 참 | `node tools/queue.mjs --only --redo` on 2 briefings | `2 answered` — `--redo` was taken as the value of `--only`. Control `--only alpha`: `1 answered` |
| a typo'd option is dropped and the default runs | 참 | `node tools/queue.mjs --brieffings elsewhere` | `2 answered` from `.cha/briefings`, the named directory never read |
| a reviewer that exits without reading its briefing kills the queue | 참 | `node tools/queue.mjs` with `command: node -e "process.exit(0)"`, 8 runs | 1 run in 8 died with an EPIPE stack; with a 400KB briefing, every run |
| `--max 20kb` removes the cap instead of refusing | 참 | `node tools/brief.mjs near.js --max 20kb` | `1 briefing(s), cap NaNKB`, one 41.9KB briefing written, exit 0 |
| a briefing over the cap exits 0 | 참 | `node tools/brief.mjs big.js` | `OVER THE CAP` on screen, `exit 0` — invisible to anything but a human |
| a directory argument produces a stack trace | 참 | `node tools/brief.mjs src` | `Error: EISDIR: illegal operation on a directory, read` |
| an absolute path is joined onto the working directory | 참 | `node tools/brief.mjs C:/…/src/a.js` | `no such file:` for a file that is there |
| the briefing wrapper constant (1200) is too small, as it was in the loop this came from | 거짓 | briefed a 34-byte file and measured the result | 920 bytes written, so the fixed wrapper is ~890 — the constant still has slack. The other repository's 2400 belongs to its own wrapper and was **not** copied |
| 12 further suspicions from the same passes | 못 잼 | — | `record.mjs` table scoping, CRLF multi-line anchors, `hook-guard.mjs` plugin paths, the template's round-1 numbering, `mutate.copy` without `node_modules`, `/cha-mutate`'s documented CLI, and others. Read but not yet run here. Recorded as 못 잼, **not** as false, and listed under 다음 회차 후보 |

### 빨간 검사 / red test

`test/tools.test.js` was written first and watched fail: **10 fail / 2 pass**,
the two passes being the controls. Each failure was checked against the reason
it was supposed to fail for — `verdict was 잡음`, `0 !== 2`, `the queue crashed
instead of reporting the loss`. This is the repository's first test of its own
tools.

### 고침 / fixes

`tools/mutate.mjs:209` — a killed or unstartable test is 못 잼, not 잡음 — mutant `mutate-001`
`tools/add-mutant.mjs:87` — whichever mutant list is already there is the list — mutant `add-mutant-001`
`tools/queue.mjs:144` — an error listener on the stdin pipe — mutant `queue-001`
`tools/queue.mjs:81` — non-numeric `maxRetries`/`backoffMs`/`timeoutMs` stop the run — mutant `queue-002`
`tools/argv.mjs:42` — an unknown option stops the tool — mutant `argv-001`
`tools/argv.mjs:54` — a flag where a value belongs stops the tool — mutant `argv-002`
`tools/brief.mjs:208` — an over-cap briefing exits non-zero — mutant `brief-001`
`tools/brief.mjs:40` — a `--max` that is not a number stops the tool — mutant `brief-002`

`tools/argv.mjs` is new, and it is a module rather than four copies of an
`indexOf` on purpose: rules with no seam get no tests. The loop this method came
from lost its retry rules to a refactor while every test stayed green, because
they lived inside their caller.

### 어긋 / mutants

added 8, anchors lifted off disk by `tools/add-mutant.mjs`, never retyped.

```
node tools/mutate.mjs
  8 잡음/caught · 0 샜음/leaked        8m58s
```

Two things were found by breaking the fixes rather than by reading them:

- **`brief-002` leaked on its first run.** Deleting the `--max` number check
  left the suite green, because the next guard down says "--max must be greater
  than 0" and the test asserted only `/--max/`. A test that cannot tell two
  reasons apart is defect class 3, and it was in the test written to prove
  class 3 mattered. The assertion now names the reason.
- **the control test was flaky, 1 run in 4.** `node`'s own start-up occasionally
  passed the fixture's 4-second timeout. Before `mutate-001` that slowness
  scored as 잡음 and nobody could have seen it; the fix did not create the
  flake, it made it visible. The fixture now allows 20 seconds and the hang
  test keeps its short one, where the timeout is the point.

### 관문 / gate 1

```
tools     12 pass / 0 fail / 0 skip — 12 checks in 1 file, 5 runs in a row
example   5 pass / 0 fail / 0 skip — 1 of 1 files exited cleanly
mutants   8 잡음 / 0 샜음 / 0 못 잼 — 8m58s
example   2 잡음 / 0 샜음 (examples/.cha/mutants.json)
syntax    node --check on all 9 tools — clean
```

Numbers, never the word "pass". The tool suite was run five times, not once,
because one green run cannot tell a stable test from a lucky one — and in this
round it was luck the first time.

### 다음 회차 후보 / next round candidates

`tools/record.mjs:151` — `표고치기` scans every `|`-prefixed line in the file,
with no notion of "the table at the top"; a `--set` name that is a substring of
one old claim row rewrites that round's verdict cell
`tools/record.mjs:200` — the growth guard compares whole-file bytes after
appending ~700 bytes, so it cannot see a smaller in-place deletion, which is the
failure its own header says it exists to catch
`tools/add-mutant.mjs:57` — a widened anchor is re-joined with `\n` while
`mutate.mjs:174` counts against the raw file; on a CRLF checkout every
multi-line anchor is 못 잼 forever
`tools/hook-guard.mjs:116` — tells every user to run `node tools/add-mutant.mjs`,
a path that does not exist in a repository where CHA is installed as a plugin
`templates/record.md:39` — ships a sample round 1, so a fresh repo's first real
round is numbered 2 and `--round 1` is refused as a duplicate
`templates/config.json:20` — `mutate.copy` has no `node_modules`, so any repo
whose `testCommand` is `npx vitest run {file}` reports every mutant 못 잼 with a
message pointing at the test instead of at the copy list
`commands/cha-mutate.md:5` — documents `add`/`run` subcommands that do not
exist, and an `add-mutant.mjs` invocation missing the required `--what`/`--then`
`commands/cha-record.md` — never names `tools/record.mjs`, so the append-only
guard is opt-in by memory
`queue.mjs:78` — `hunt-` is what keeps the first eye's suspicions away from the
second eye, and it is documented nowhere
`brief.mjs:125` — two files with the same basename overwrite each other's
briefing silently
`examples/` — one worked example for one defect class; no answer file, no 거짓
verdict, no leaked mutant, no second round
`docs/en/*` — every `node tools/…` line is unrunnable after a plugin install
