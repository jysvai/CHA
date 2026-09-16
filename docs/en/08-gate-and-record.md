# 08 — Gate and record

**한국어: [08-관문과기록.md](../ko/08-관문과기록.md)**

The gate decides whether this round is allowed to end. The record decides where the next round starts. They are documented together because either one alone turns into a lie within a few rounds.

---

# 관문 / gate

## What it covers

Three kinds. The commands differ per repository; the kinds do not.

| Kind | The question it asks |
|---|---|
| test | Does the suite currently disagree with the code? |
| check | Is the shape — style, line endings, formatting — shippable? |
| docs | Does everything the documentation points at actually exist? |

They are named in `.cha/config.json` under `gate`:

```json
{
  "gate": {
    "test": "npm test",
    "check": "npm run check",
    "docs": "npm run docs"
  }
}
```

All three, in order, every time.

## "Pass" is not a gate result

**Report the numbers. Never the word.**

"Tests pass" is not a gate result. This is:

```
관문 / gate 39

  test    12,596 pass / 0 fail / 1 skip — 156 of 156 files exited cleanly
  check   OK · 167 files · 170 shipped files all LF
  docs    62 pages · 0 broken links
```

All three lines are needed. Each one hides something the other two show.

## Why the clean-exit count is on the same line

This is a burn, not a preference.

When a test file **dies before it reaches its assertions**, the failures it would have produced disappear. So do its passes. What remains on screen is "n pass / 0 fail". Compared to the previous run there are now *fewer* failures — which reads as an improvement.

So the failure count sticks at zero while the pass count quietly drops. Of those two numbers, the one a person looks at first is the failure count. Call a run green on "0 fail" alone and you will read a suite that is dying as a suite that is getting better.

There is exactly one way to stop this: **count how many test files exited cleanly, out of how many there are.**

```
156 of 156 files exited cleanly
```

The moment that line reads anything other than `156 of 156`, the gate is red regardless of the pass count.

## A skip is not a pass

The `1 skip` from the last gate is still reported as `1 skip`. It is not rounded into the pass column.

A skip is something **not yet measured** — the same family as 못 잼 in [06 — Adjudication](06-adjudication.md) and [07 — Mutation](07-mutation.md). Fold it into passes and you lose the ability to tell "nothing is wrong there" from "nobody looked there".

And a **creeping skip count is itself a finding**. It is only visible if every round writes the number down. One extra skip per round is invisible; ten rounds later there are ten of them and nobody can say when they arrived.

## A red gate stops the loop

When the gate goes red, **you stop there.** No hunting, no briefing, no next fix.

The reason is about attribution. Keep the loop running on a red build and the next thing that breaks cannot be assigned — was it what you just wrote, or was it already broken? Lose that distinction once and every verdict in that round goes soft with it, because verdicts are settled by execution and the execution environment is already contaminated.

So the order is:

1. Find the smallest input that reproduces it.
2. `/cha-fix` — red test first, same as always.
3. Resume the loop once it is green.

## Green before the loop starts, not only after a fix

The gate does not only run after a fix. It runs **before the loop begins**.

A loop that starts on a red build cannot separate its own breakage from inherited breakage on round one, and never recovers that separation afterwards. This is why `/cha-init` runs each detected gate command once and reports the numbers it actually saw.

## If a gate command does not exist

**Say so.**

- **Do not substitute a similar command.** If `npm run lint` is not there and you run `npx eslint .` instead, from that round on the gate is measuring something nobody defined.
- **Do not report a gate as passing on two of three commands.** Two ran and one did not: that round's gate is incomplete, not green.

`/cha-init` is supposed to have run every one of them. If a command has disappeared since, that is a **finding about the repository** — write it in the record rather than quietly dropping it from the list.

---

# 기록 / record

## Append only

**Nothing is ever deleted from `.cha/record.md`.**

Not the claims that turned out false. Not the fixes that were reverted. Not the mutants that leaked. Not the four things nobody could measure. The record here is **2,745 lines over 39 rounds** and it has never been edited downward.

## What deleting costs

### The same claim comes back

A second eye on round 27 will raise, with high confidence and different wording, the thing that was disproved on round 9. It does not remember; there is no reason it would.

With the counter-evidence on file, you close it in thirty seconds: round 9, this command, this output, false. Done.

If the counter-evidence was deleted because "it was wrong anyway", **you pay for the entire investigation a second time.** And the second time you may land on the opposite conclusion — at which point you ship a regression to fix a bug that never existed. That is what a deleted record line costs.

### A reverted fix is more informative than one that stuck

A reverted fix tells you which *shape* of change this code refuses. That is the first thing the next round needs when it touches the same area, and it is the first thing that disappears, because nobody enjoys writing down the thing that did not work.

### 못 잼 is a map of the harness

The 22 unmeasurable mutants and the 4 unmeasurable claims are a precise drawing of what this machine **cannot see**:

- a Unix-only child-process reaping path, on a Windows host;
- two paths that need software not installed on this machine;
- one CLI argument-substitution convention that reads both ways.

Delete them and the next person rediscovers the boundary by walking into it, paying the discovery cost twice.

## The shape of one round

```markdown
## 회차 39 / round 39 — 2026-09-16

### 사냥 / hunt
files read: … · files skipped: … (say which, and why)

### 브리핑 / briefings
<tag> 18.2KB · <tag> 19.7KB · …

### 2차 눈 / second eye
model: <pinned id> · sent 12 · answered 12 · lost 0

### 판정 / adjudication
| claim | verdict | command | output |
|---|---|---|---|
| … | 참 | `node -e "…"` | `28.00 vs 51.00` |
| … | 거짓 | `node -e "…"` | counter-evidence |
| … | 못 잼 | — | Unix-only path, Windows host |

### 고침 / fixes
src/…:88 — red `28.00 vs 51.00` → green `40.00 vs 40.00` — mutant recall-042

### 어긋 / mutants
added 6 (recall-042 … scanui-017) · sweep 1,149 → 1,125 caught / 2 leaked / 22 unmeasurable · 2h46m

### 관문 / gate 39
test 12,596 / 0 / 1 — 156 of 156 files · check OK 167 files · docs 62 pages 0 broken

### 다음 회차 후보 / next round candidates
src/…:214 — header stripped before the log line, may hide the cause
test/….test.js:90 — asserts the call returned, not what it returned
```

## The status table

This is the **only** part of the record that is edited in place, and only by bumping counts.

| | |
|---|---|
| 관문 / gates | 39 |
| 브리핑 / briefings | 39 |
| 주장 / claims | 57 |
| 참 / true | 22 |
| 고침 / fixes | 19 |
| 어긋 / mutants | 1,179 |
| 마지막 전수 / last sweep | 1,149 → 1,125 / 2 / 22 |

Nobody reads 2,745 lines from the top. They read this table. Which means **every number in it must be traceable to a section below it.** A number you cannot trace does not belong in the table.

## 다음 회차 후보 — the row that keeps the loop alive

Everything you saw this round and did not take, with `file:line`.

Not a `TODO` comment in the code. `TODO`s **rot in place**, because nobody greps for them. You see one six months later by accident, while opening that file for another reason, and by then you no longer remember what it meant.

A named candidate list is the difference between round 40 starting in ten seconds and round 40 starting with an hour of re-reading.

## `node tools/record.mjs`

Appends one round section to `.cha/record.md` in the shape of `templates/record.md`, and updates the status table at the top in place.

```bash
node tools/record.mjs
```

The tool has one rule wired into it:

> **It refuses to shrink the file.**

It measures the byte length before and after. If the result is not **strictly longer**, it restores the original and exits non-zero, saying that the record got shorter.

That check exists because there is exactly one realistic path by which the whole record disappears, and it is **the edit that updates the table at the top**. Updating the table means opening the file and writing it back out. Drop the body while writing it back and the tool **finishes looking successful**: same output, exit code 0, new numbers in the table. Unless somebody reads the `git diff`, 2,745 lines are gone that day.

Comparing byte lengths prevents that one accident. Of everything this tool does, it is the property that is not negotiable.

---

| | |
|---|---|
| ← [07 — Mutation](07-mutation.md) | [09 — Results](09-results.md) → |
