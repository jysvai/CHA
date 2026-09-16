# 02 — The loop

**한국어: [02-루프.md](../ko/02-루프.md)**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../diagrams/loop-dark.svg">
  <img alt="The nine-step CHA loop: hunt, brief, second eye, adjudicate, red test, fix, mutant, gate, record — then back to hunt while issues remain." src="../diagrams/loop.svg" width="100%">
</picture>

---

```
  ┌────────────────────────────────────────────────────────────────┐
  │                                                                │
  │   1. HUNT       first eye reads a slice, notes suspicions      │
  │   2. BRIEF      cut source into ≤20KB chunks + the promises    │
  │   3. SECOND EYE another platform, read-only, defects only      │
  │   4. ADJUDICATE run it. true / false / unmeasurable            │
  │   5. RED TEST   prove the failure before touching source       │
  │   6. FIX        one writer only                                │
  │   7. MUTANT     break the fix on purpose, confirm it's caught  │
  │   8. GATE       tests + lint + docs, all green                 │
  │   9. RECORD     append forever, never delete                   │
  │                                                                │
  └────────────────────────────────┬───────────────────────────────┘
                                   │  issues > 0 ?
                                   └──────────► back to 1
```

---

## The order is not a suggestion

Skipping a step does not make the loop faster. **It moves the cost somewhere harder to see.**

Each step below gets four things: its entry condition, its exit condition, the command that runs it, and where the cost goes if you skip it.

---

## 1. Hunt

**What it is.** Read a slice of source whole, comments included. Write suspicions as `file:line`, four lines each:

- what the code **promises**
- what it **does**
- what that means **for a person**
- **how you would measure it**

Comments are not decoration. They are the promises the code gets measured against. "This function never counts an unknown line as a success" is a testable claim, and the test is usually one `node -e` away.

**Entry.** Gate green. A slice chosen.

**Exit.** A list of suspicions. **No verdicts.** No fixes — not even a typo you can see. A suspicion you cannot say how to measure is not finished, and an unfinished one does not go into the next step.

**Command.** `/cha-hunt <path>`

**Skip it and.** You end up throwing arbitrary files at the second eye. Answers come back, but nobody knows whether they are about anything that **matters** in this repo. Hunting is not the step that produces findings; it is the step that decides where to look.

---

## 2. Brief

**What it is.** Cut the slice into something a reviewer on another platform can review. **20KB cap.**

Three things break above the cap, all quietly:

- the answer gets **truncated** mid-finding
- recall drops in the middle, so findings **cluster at the ends**
- a 400-line answer is **unjudgeable** in one sitting, so it rots before you run it

Split at function boundaries. Never mid-function — a reviewer that cannot see the early return will **invent one**.

**Never put in a briefing:** the conversation, your own hunt suspicions, secrets, or the fix you already have in mind. A second eye that inherits the first eye's conclusions is an echo you paid for.

**Entry.** A hunt list exists.

**Exit.** Chunks in `.cha/briefings/`, each at most 20480 bytes, each carrying the five defect classes.

**Command.** `/cha-brief <path>`, or `node tools/brief.mjs <file> [--out .cha/briefings] [--max 20480]`

**Skip it and.** Pasting a whole file gets you a truncated answer — and **the truncation is invisible**, because the answer ends on a complete sentence. You receive six of ten findings and believe you received ten.

See [04 — Briefing](04-briefing.md).

---

## 3. Second eye

**What it is.** Send each briefing to a model **on a different platform**, with a **pinned model id**, holding **no write tools**. One at a time.

**Entry.** `secondEye.command` is not `null`. `secondEye.model` is an exact id.

**Exit.** One answer per tag in `.cha/answers/`. Zero lost. A lost review is **re-asked**, not skipped — skipping leaves a chunk nobody reviewed while the count still adds up.

**Command.** `/cha-review2`, or `node tools/queue.mjs [--briefings .cha/briefings] [--answers .cha/answers]`

**Skip it and.** What is left is self-review: the correlated-error failure from [00 — Why](00-why.md), now with extra procedure around it.

**Run it in parallel and.** This was tried once. A personal quota emptied **in about four minutes and all three answers were lost**, because each review ran its own retry loop.

See [05 — Second eye](05-second-eye.md).

---

## 4. Adjudicate

**What it is.** Take the claims one at a time and **run them.**

> A claim is true when you have run something that would have behaved differently if it were false.

Measured: **57 claims → 22 true.** Six in ten were plausible and wrong. Fixing on the reading would have meant touching 35 pieces of working code, each edit a chance to break something that was fine.

Three verdicts, and the third one is the point:

- **true** — you ran it and the wrong behaviour appeared. Record the command and the output.
- **false** — you ran it and it did not appear. Record the **counter-evidence**. The same claim comes back two rounds later in different words.
- **unmeasurable** — you cannot run it here, or the claim reads both ways. **Never file this as false.**

**Entry.** Unjudged answers exist.

**Exit.** Every claim has one verdict, one command, one output. "Plausible" is not a verdict.

**Command.** `/cha-judge <tag>`

**Skip it and.** This is the most expensive skip available. Fixing claims as they arrive means three in five edits land on working code, and those edits sail through a green suite — **because there was never anything wrong there.** The regression shows up two rounds later.

See [06 — Adjudication](06-adjudication.md).

---

## 5. Red test

**What it is.** Write the test that fails **for the reason you are about to fix**. Run it. **Watch it go red. Keep the output.**

**Entry.** One claim adjudicated true.

**Exit.** One test is red. The red output is in the record. **Source is still untouched.**

**Command.** The first stage of `/cha-fix <id>`. It refuses to reorder.

**Skip it and.** A test written after the fix passes **for reasons nobody checked** — because of the fix, because it asserts something always true, or because it never reaches the assertion. Afterwards there is no way to tell those three apart.

Two traps cost real hours here: a new test block placed after the teardown, and a fixture the code correctly rejects. Both are written up in [03 — Harness tuning](03-harness-tuning.md).

---

## 6. Fix

**What it is.** The **smallest** change that turns the test green.

**One writer.** The second eye reviews and never edits. This is not about trust: two writers produce edits whose interaction **nobody has read** — one moves a guard, the other moves the thing it guarded, both test suites pass separately, and the defect lives in between.

Not the refactor you can see from here. Neighbouring suspicions go back on the hunt list and get their own briefing, verdict, and red test.

**One defect per commit**, so a revert takes back exactly one thing.

**Entry.** The red test is red.

**Exit.** That test is green, **and the whole gate is green.** A change that turns one test green and another red is not a fix.

**Command.** `/cha-fix <id>`

**Cannot be skipped.** It is not a step, it is the point.

---

## 7. Mutant

**What it is.** Break the fixed line on purpose and check that the test claiming to guard it notices. Every fix gets a mutant, written **immediately**, while you still know which character carried the meaning.

- **caught** — the named test went red. Good.
- **leaked** — everything stayed green. That is a hole in the tests, and it is a finding.
- **unmeasurable** — the anchor no longer matches, or the named test does not exist. **Counts as a failure.**

Why unmeasurable counts as failure: a silently non-matching anchor is **exactly the defect class this loop hunts**, living inside the tool built to find it. It is in the list, it is named, it is counted as present, and it measures nothing.

**Entry.** The fix is green.

**Exit.** The mutant is in `.cha/mutants.json` and has been run once, reporting **caught**.

**Commands.**
`node tools/add-mutant.mjs <file> <line> --test <testfile> --what "…" --then "…" [--replace "…"]`
`node tools/mutate.mjs --id <id>` — just that one
`/cha-mutate [filter]`, or `node tools/mutate.mjs src/foo.js` — filtered
`node tools/mutate.mjs` — full sweep, `--json` for a machine-readable summary

If anchors have drifted: `node tools/repair-anchors.mjs [--write]`.

**Skip it and.** The fix stays in the file and **nothing guards it.** Someone tidying that line deletes it, every test is green, and the same defect comes back. This is precisely what the full sweep found: **2 mutants no test caught, and 22 whose anchors had drifted and were measuring nothing.**

See [07 — Mutation](07-mutation.md).

---

## 8. Gate

**What it is.** Every gate command, every time, with the real counts: pass, fail, skip, **and how many test files exited cleanly.**

Leave out the last one and the gate runs backwards. If 6 of 156 files crash before asserting anything, the pass count goes *up*. Which is why the last measured round is written like this — **12,596 pass / 0 fail / 1 skip, 156 of 156 files exited cleanly.**

**A skip is not a pass.** It is counted separately.

**Entry.** A fix is complete.

**Exit.** Every command green. If anything is red, **the loop stops** — no hunting, no briefing, no next fix. A red gate means the last thing written is either wrong or exposed something that was already wrong, and both are the top item on the board.

**Command.** `/cha-gate`

**Skip it and.** You find out **next round** that the fix broke something else, and by then several things have changed between the two points and you get to go looking for which.

See [08 — Gate and record](08-gate-and-record.md).

---

## 9. Record

**What it is.** Append the round to `.cha/record.md`. **Append only.**

Claims that turned out false, fixes that were reverted, mutants that leaked, the four things nobody could measure — all of it stays.

The reason is not sentimentality. **The same claim comes back.** A reviewer on round 27 raises, confidently and in different words, the thing disproved on round 9. With the counter-evidence on file you close it in thirty seconds. Deleted because "it was wrong anyway", you pay for the whole investigation a second time — and there is a real chance you reach the opposite conclusion and **ship a regression to fix a bug that never existed.**

The record here is **2,745 lines over 39 rounds** and has never been edited downward.

**Entry.** Gate green.

**Exit.** The round section is appended, the status table at the top is updated, and **next-round candidates** are written with `file:line`.

**Command.** `/cha-record`, or `node tools/record.mjs`

`tools/record.mjs` measures the file length before and after writing, and **if the result is not strictly longer it restores the file and exits non-zero.** Append-only is the one property of the record that matters, so the tool is prevented from violating it.

**Next-round candidates** are everything you saw and did not take. Not a `TODO` in the code — those rot in place and nobody greps for them. A named candidate list is the difference between round 40 starting in ten seconds and starting with an hour of re-reading.

**Skip it and.** The next round starts from nothing. And re-investigates a claim you already disproved.

See [08 — Gate and record](08-gate-and-record.md).

---

## Where am I

```
/cha-status
```

Pending briefings, unjudged answers, fixes with no mutant, the last gate — and the single next command.

---

## When does it stop

When all five are zero or green:

- open claims **0**
- leaked mutants **0**
- unmeasurable mutants **0**
- gate **green**
- record **appended**

That is not "no known bugs". It is **"no unanswered questions"**. Those are different, and only the second one is checkable.

And even with all five satisfied, the tag and the push happen only after a human has been told the review scope and has said go.
