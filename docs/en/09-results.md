# 09 — Results

**한국어: [09-결과.md](../ko/09-결과.md)**

Every number here was measured on one repository — `deel`, a zero-dependency Node CLI coding agent — over 39 rounds.

**Said up front:** this is not a benchmark. One codebase, one second-eye pairing, one person. What these numbers show is that the loop finds real things. What they do not show is a percentage you should expect on your repository. That is why every number below is followed by what it does **not** mean.

---

## What was measured

### The subject

| | |
|---|---|
| Source | **171 files · 77,607 lines** |
| Tests | **154 files · 75,499 lines** |
| Commits | **434** |

The test line count is nearly the source line count. **That is not a good sign on its own.** It says there are a lot of tests, not that the tests guard anything. Only the mutation sweep separates those two, and it is below.

### The last gate

```
test    12,596 pass / 0 fail / 1 skip — 156 of 156 files exited cleanly
check   OK · 167 files · 170 shipped files all LF
docs    62 pages · 0 broken links
```

**What 12,596 passing means:** nothing currently written in the suite disagrees with the code.

**What it does not mean:** that the code is correct. The two are unrelated. An assertion that asks nothing also passes. The measurement of whether a test guards anything is the mutation sweep, not the pass count.

**What 156 of 156 means:** the pass count did not drop because test files died before asserting. Without this line you cannot trust the line above it — the reason is in [08 — Gate and record](08-gate-and-record.md).

**What 1 skip means:** one thing is not measured yet. It is not zero, and it does not go in the pass column.

### Mutants

| | |
|---|---|
| Registered | **1,179** · across 138 source files / 119 test files |
| Last full sweep | **1,149 mutants · 2h46m** |
| Result | **1,125** caught · **2** leaked · **22** unmeasurable |

**What 1,125 caught means:** at 1,125 specific places, breaking the line on purpose turned the paired test red.

**What it does not mean:** that 97.9% of the code is guarded. It is not that kind of ratio. What was measured is **1,149 specific breakages I wrote down**. Breakages I did not write down were not measured. The mutant list *is* the scope of the measurement, and outside that scope this number says nothing at all.

**1,179 − 1,149 = 30.** Mutants added after the last full sweep and not yet swept. That is written down too, because "ran all of them" and "ran all the ones that existed at the time" are different sentences.

**The 2 leaked and the 22 unmeasurable are the finding.**

- **2 leaked**: the line was broken on purpose and nothing went red. Those two lines are currently unguarded, and the next person can delete them without turning anything red.
- **22 unmeasurable**: mutants whose anchors had drifted and were **measuring nothing**. They were in the list, named, counted in the total, and making the sweep look healthy.

**The second group is the dangerous one.** A leaked mutant shows up as a red mark on the screen. An unmeasurable one is invisible in a red run *and* in a green run. This is the defect class CHA hunts, found living inside CHA's own tool — which is why `tools/mutate.mjs` counts 못 잼 as a **failure** rather than a skip.

### The second eye

| | |
|---|---|
| Gates run | **39** |
| Briefings sent | **39** |
| Claims received | **57** |
| Confirmed true by execution | **22** |
| Fixes landed | **19** |
| Recorded unmeasurable | **4** |

**What 57 → 22 means:** roughly six in ten confident findings were wrong, and reading alone would not have told you which six.

**What it does not mean:** that this model is 39% accurate in general. It is not. This is a number for **this second eye, on this codebase, at this briefing size**. A different repository produces a different number.

**One more thing it means:** acting on plausibility would have been **35 edits to working code**. Each of those 35 is a chance to break something that was fine.

Of the 22 true claims, 19 became fixes. The rest were already covered by another fix or pointed at the same line.

### The record

| | |
|---|---|
| Cumulative record | **2,745 lines** |

Append-only. Never edited downward across 39 rounds. The claims that turned out false, the fixes that were reverted, the mutants that leaked, and the four nobody could measure are all still in it. The reasoning is in [08 — Gate and record](08-gate-and-record.md).

---

## The five defect classes, as they actually appeared

The five classes attached to every briefing were not chosen at a desk. They are the ones that **survived six rounds** — the ones a linter cannot see and a same-model review does not name.

The snippets below are **reconstructions of the shape**, not verbatim diffs. The real files and line numbers are in the subject repository's record.

### 1. A rule that never matches real input

**Promised:** filter out small models.

**Did:** marked `qwen2.5-coder:32b` — a 32B model — as "too small".

```js
// shape, reconstructed
const isSmall = /(1b|2b|3b)/.test(name);
```

`32b` contains `2b`. The rule looked at **any position** in the name; it needed to look at the end.

**What it cost a person:** the largest usable model silently vanished from the list. No error, no warning — it simply was not there.

**How it was measured:** ran the regex against the real model name in one line and printed the match.

### 2. Silent failure

**Promised:** read every sheet.

**Did:** skipped the sheet it could not read, and still reported "read everything".

```js
// shape, reconstructed
for (const sheet of sheets) {
  try { read(sheet); } catch { continue; }
}
```

The `continue` swallowed the failure. The count did not drop and nothing was logged.

**What it cost a person:** missing data was read as absent data. Not a wrong answer — a wrong answer **with no way to know it was wrong**.

**How it was measured:** fed in a sheet that cannot be read, and checked whether the result still claimed everything had been read.

### 3. A test that does not guard

**Promised:** the test name — "rejects non-numeric counts".

**Did:** asked only about `'many'`. `'3'`, `null`, `true` and `[]` went straight through.

**What it cost a person:** that line counted as **a place with a test**. Nobody looked again. This is why the class is the most expensive of the five — there is not a hole, there is a hole with a sign on it that says "guarded".

**How it was measured:** broke the line the test names and ran the test. It still passed. That is exactly what [mutation](07-mutation.md) does.

### 4. Comment contradicts code

**Promised:** the header — "a line with no `ok` is not counted as a success".

**Did:** counted it as one.

**What it cost a person:** the **failure rate came out lower than reality**. Somebody looked at the number, concluded things were fine, and moved on. They were not fine. A wrong number is bad; a wrong number that is wrong in the reassuring direction is worse.

**How it was measured:** fed in a line with no `ok` and printed the counter. One of the comment and the code is the bug; execution decides which.

### 5. Trust-boundary leak

**Promised:** with `--offline`, nothing leaves the machine.

**Did:** checked `--offline` **after** the connection had already knocked on the external address three times, with the key attached.

**What it cost a person:** somebody who had explicitly turned on offline mode sent their key out three times. The screen said offline.

**How it was measured:** stubbed the connection and printed **what was about to be sent** at the moment before sending. No amount of reading the code produces that conclusion.

---

## The four that could not be measured

Four of the claims in the last round **could not be run on this machine**.

| Claim | Why it is unmeasurable |
|---|---|
| Unix-only child-process reaping path | the host is Windows |
| Path A | needs software not installed on this machine |
| Path B | needs software not installed on this machine |
| CLI argument-substitution convention | reads both ways — no input separates the two readings |

**All four were recorded as 못 잼 / unmeasurable, not as false.**

Recording them as false would have produced a clean scorecard, and that cleanliness would have been a lie. Writing them down as unmeasurable is what makes the rest of the numbers mean something: a round reported as 22 true and 4 unmeasurable is **exactly four claims more honest** than a round reported as 22 true out of 57 and everything else settled.

---

| | |
|---|---|
| ← [08 — Gate and record](08-gate-and-record.md) | [10 — FAQ](10-faq.md) → |
