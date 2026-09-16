# 03 — Harness tuning

**한국어: [03-하네스조정.md](../ko/03-하네스조정.md)**

This document does not explain the loop. The loop is in
[02-loop.md](02-loop.md). What is written here is **what broke first, on the
way to making that loop actually run.**

None of CHA's rules were designed on a whiteboard. Every one of them arrived
after something went quietly wrong, which is why each one has an accident
attached to it. A rule with no accident behind it was cut. People do not follow
a rule they cannot be told the reason for, and a rule nobody follows is the
same as no rule.

The shape below repeats: **what we tried → what broke → what the rule is now.**

---

## 1. The 20KB briefing cap

### What we tried

Sending a whole file to the second eye. Showing it everything at once looked
like the option with no missing context, and therefore the one that would
produce the better answer.

### What broke

Three separate things. What matters is that **all three broke quietly.**

**One — the answer gets truncated.** The list of findings stops mid-sentence.
The problem is not the truncation itself; it is that **a truncated answer and
"there was nothing back there" look identical.** You cannot tell whether the
end of the file was reviewed and found clean or never reached at all. Since you
cannot tell, you re-send — and re-sending spends the quota again.

**Two — the middle goes unread.** Recall drops in the middle of a long context.
Findings cluster at the head and the tail of the file and the middle comes back
empty, and **an empty middle that is genuinely clean looks exactly like an empty
middle that was never read.** You end up recording a completed review pass over
a file whose middle third nobody looked at.

**Three — the answer becomes unjudgeable.** Four hundred lines of findings
cannot be adjudicated in one sitting. In CHA the cost of settling one claim is
**the cost of writing a command and running it.** Forty claims is forty
commands, the round ends before you get through them, and the remainder rots
unadjudicated. Unadjudicated claims come back next round, and now two rounds
are mixed together and you cannot tell which claim belongs to which.

### What the rule is now

- One briefing is at most **20480 bytes**. `.cha/config.json` → `briefing.maxBytes`.
- **Measured in bytes, not lines.** A CJK character is three bytes in UTF-8.
  Measure a file with Korean comments by line count and you are **wrong by a
  factor of three.** A cap measured with the wrong ruler is a cap that never
  once applied.
- The byte count includes **the wrapper**, not just the code: the file header,
  the five defect classes, the answer format, and the line-number gutter on
  every line. A chunk measured at 20KB of source once shipped as a 21KB
  briefing. A 6KB file header was eating a third of the budget before anything
  counted it — and that header is **repeated into every chunk**, so it is a
  per-chunk cost, not a one-off.
- **Cut at function boundaries only.** Cut mid-function and a reviewer who
  cannot see the early return will invent one. Then you spend an adjudication
  on **a claim about code that does not exist.**
- **Keep the original line numbers.** Renumber from 1 and every claim has to be
  mapped back by hand, and hand-mapping is where you adjudicate the wrong line.
- If a single function is larger than the cap, **do not cut it — say so.**
  `tools/brief.mjs` marks that chunk `OVER THE CAP`. Reporting the overflow is
  better than cutting through a function body and pretending you did not.

---

## 2. Serializing the second eye

### What we tried

Three briefings sent at once. Serial looked slow, so we fired them in parallel
and waited for three answers to come back together.

### What broke

**A personal quota was empty in about four minutes, and all three answers were
lost.**

It did not fail because it was fast. It failed because **each parallel branch
carried its own retry loop.** The first branch hit the limit and retried, the
second retried, the third retried, and all three hammered the same wall at
once. None of the backoff timers knew about the others. Backoff stops being
backoff at that point, and the retries spend whatever quota is left. What that
run produced was not three answers; it was three empty answers and an account
that was unusable until the next day.

Then we made the worse second mistake: **we skipped the pending briefings.** We
moved past the ones that had no answer and went on to the next. The sent count
stayed the same; only the answered count dropped. From the numbers the round
looks intact. That slice of source became **a piece nobody reviewed**, and
nothing downstream can notice it — there is no claim to adjudicate, no fix to
make, no place to hang a mutant. **A slice nobody read looks exactly like a
slice that came back clean.**

### What the rule is now

- **One briefing at a time.** `tools/queue.mjs` sends them serially.
- On a quota error it **re-asks the same briefing** instead of moving past it.
  Moving on leaves a hole, and a hole does not show up in the counts.
- Backoff lives in config and defaults generously: `secondEye.maxRetries` 6,
  `secondEye.backoffMs` 20 minutes, `secondEye.timeoutMs` 10 minutes. Twenty
  minutes is sized to wait for a window-based limit to roll over, not to be
  polite to a server.
- **It is resumable.** A briefing whose answer is already on disk is skipped,
  so an interrupted run does not have to start from the beginning — and nobody
  leaves a hole behind because starting over felt too expensive.

---

## 3. Pinning the model id

### What we tried

Calling the second eye with `latest`. Always using the best available model
seemed obviously right.

### What broke

The round-to-round numbers stopped meaning anything.

When the claim count drops, you cannot tell whether **the code got better** or
**the reviewer changed.** CHA accumulates ratios like 57 → 22 across rounds,
and that ratio is a property of *this reviewer, at this briefing size, on this
code*. Change any one of the three silently and the numbers after the change
cannot go in the same table as the numbers before it.

`latest` does not tell you when it moves. So afterwards you cannot even
identify the round where you started measuring something different.

### What the rule is now

- `secondEye.model` holds an **exact id**. No `latest`, no `preview`, no alias.
- When you change the model, **write the round it changed in into the record.**
  Do not quietly swap it. Knowing where the change happened is the difference
  between numbers you can read afterwards and numbers you cannot.
- `queue.mjs` prints a warning and keeps going when `model` is unset. It does
  not block, for the same reason given in [section 7](#7-the-gate-reports-numbers-not-the-word-pass).

---

## 4. Read-only second eye, one writer

### What we tried

Letting the reviewer apply the fix. It had already found the defect; fixing it
on the spot looked faster than handing it back.

### What broke

**Fixes landed half-applied.**

When two agents write, each edit is fine on its own and **nobody reads the
place where they meet.** One moves a guard; the other moves the thing the guard
protected. Each test suite is green separately, and the defect lives in
between.

The shape it actually took was always the same: **the header describes the
correct behaviour, and only one of two call sites implements it.** Found three
times. What makes this shape particularly bad is that the next person to read
the file sees the header and concludes the fix already landed. The comment
looks like evidence of a fix. It is evidence of **half** of one.

### What the rule is now

- **One agent writes code.** `.cha/config.json` → `writer`.
- The second eye holds **no write tools**, no shell, no repo access. It gets the
  briefing text and nothing else. `secondEye.mode` is `read-only`, and that is a
  declaration, not an enforcement — what actually prevents writes is how you
  wire the CLI.
- This is not about trust. Two humans produce the same failure.
- During adjudication, **look specifically for the half-applied fix**: when a
  claim is true *and* the header already describes the correct behaviour, a
  previous round's fix reached the comment and one of two call sites. That code
  has been lying for a release cycle, so it goes to the front of the queue.

---

## 5. Adjudication by execution only

### What we tried

Reading the claim, agreeing with it, and fixing it. When a finding is specific,
carries a line number, and comes with a confidence score, there seems to be no
reason to doubt it.

### What broke

**Of 57 claims, 22 were true.**

The other 35 were plausible and wrong. Reading **could not tell you which was
which** — the 35 wrong ones were exactly as specific as the 22 right ones, had
line numbers, and carried high confidence. Confidence was uncorrelated with
correctness.

Acting on plausibility would have meant **35 edits to working code.** Each of
those is a chance to break something that worked. This is precisely the point
where a review round fixes 22 defects and ships a dozen regressions.

### What the rule is now

> A claim is true when you have run something that **would have behaved
> differently if it were false.**

- A verdict is recorded as **command, input, output.** Never as an opinion.
- Pick the **cheapest thing that separates the two behaviours**: one `node -e`
  for a regex claim; a stubbed socket and a print of what was about to be sent
  for a leak claim.
- If it needs a live process, a port, or a real file, **build the smallest
  one** and run it. One claim settled against a real socket is worth ten
  settled by reading.

---

## 6. Three verdicts, and never filing 못 잼 as false

### What we tried

Recording a claim we could not run here as "false" and moving on. At the end of
the round only true and false were left, and the sheet looked clean.

### What broke

**The clean sheet was a lie.**

"False" means *I ran it and the behaviour did not appear*. "I cannot run this
here" is a completely different statement. Putting them in the same column
throws away **everything the record knew about what this machine cannot see.**
And the claim comes back two rounds later in different words, with the record
saying only "false" — no counter-evidence to point at. So you investigate it
twice.

### What the rule is now

Three verdicts, and the third is the one that matters.

- **참 / true** — ran it, the wrong behaviour appeared. Record the command and
  the output.
- **거짓 / false** — ran it, the behaviour did not appear. Record the
  **counter-evidence**. Not "no" — what you put in and what came out.
- **못 잼 / unmeasurable** — cannot be run here, or the claim reads both ways.
  **Never filed as false.**

The four genuinely unmeasurable claims were these:

1. **A Unix-only child-process reaping path.** The machine doing the review is
   a Windows host. That path is never taken here at all.
2. **Two paths that need software not installed on the machine.** A verdict
   reached by simulating software you do not have is a verdict about the
   simulation, not about the code.
3. **One CLI argument-substitution convention.** The claim reads both ways.
   Both readings are coherent and no input separates them. Choosing a reading
   is **a decision, not an adjudication**, and it does not belong in this step.

못 잼 is **a map of the harness** — the list of boundaries this machine cannot
see past. Delete it and the next person rediscovers those boundaries by walking
into them.

---

## 7. The gate reports numbers, not the word "pass"

### What we tried

Writing "tests pass".

### What broke

**When a test file dies before it asserts, the pass count goes up, not down.**

The failures that file would have produced are never counted. If six of 156
files blow up on their first line, what the report shows is "0 fail", and the
pass count comes out **cleaner** by exactly the failures those six would have
raised. From the numbers alone it looks like an improvement. The pass count on
its own **cannot be distinguished from good news.**

Skips leaked at the same place. Read "1 skip" as "basically a pass" and nobody
sees it become two, then three. A skipped test is a test that does not guard.

### What the rule is now

- The gate reports **pass / fail / skip**, and **how many test files exited
  cleanly.** Without the last one the first three are unreadable.
- The last gate looked like this:

  ```
  test    12,596 pass / 0 fail / 1 skip — 156 of 156 files exited cleanly
  check   OK across 167 files · 170 shipped files all LF
  docs    62 pages, 0 broken links
  ```

- **A skip is not a pass.** 1 skip is reported as 1 skip, forever.
- **A red gate stops the loop.** No hunting, no briefing, no next fix. Keep
  going on red and you cannot separate the breakage you caused from the
  breakage you inherited.
- The gate must be green **before the loop starts**, not only after a fix.
- If a configured gate command no longer exists, **say so.** Do not substitute
  a similar one, and do not report a gate as passing on two of three commands.

---

## 8. What the mutation harness taught

Mutation was the part of this loop that needed the most tuning. Everything
below is an accident where **a mutant was measuring nothing.**

### 검사 is a path, never a nickname

The `검사` field once held `"recall"`, because that reads better to a person.
The runner cannot find a file at that name and **measures nothing.**

**It cost a whole sweep.** Two mutants ran, both measured nothing, and the
total printed at the bottom looked fine. Now `add-mutant.mjs` checks that
`--test` points at a file that exists and refuses if it does not, and the
runner marks any `검사` whose baseline could not be run as **못 잼**.

### Anchors are lifted verbatim, never retyped

An anchor was retyped by hand. One space was different. That mutant **never
matched again**, stayed in the list under its name, and kept being counted.

That is why `tools/add-mutant.mjs` exists. Give it a file and a line number and
it **reads that line off the disk** and uses it as the anchor. It gives nobody
an opportunity to type it. That is a tool instead of a paragraph saying "be
careful", for the obvious reason.

### An anchor must match exactly once

Zero matches fails. Many matches fails. Both fail **loudly**.

With many matches the runner cannot know which site you meant, and quietly
taking the first is how a mutant ends up **measuring a different line than its
`무엇` describes.** Quiet skipping is the worse option, so `add-mutant.mjs`
**widens the anchor upward line by line until it is unique, and says that it
did.**

### A no-op mutant is reported

If `찾을것` equals `바꿀것`, that is not a mutant. Nothing was broken, so the
test is green for the obvious reason, and if the runner records that as
**leaked you go hunting for a hole that does not exist.** You find out hours
later that the test was fine all along. It is now flagged as a `no-op mutant`
and counted as **못 잼**.

For the same reason, a mutant whose `바꿀것` has not been written yet is also
못 잼. Splicing a TODO string into source turns the file into a syntax error,
and then **every test goes red for a reason that has nothing to do with the
line.** Counting that as caught would make the whole sweep a lie.

### Mutate the call site, not the convenient helper

Breaking the helper is easier. There is only one place to change.

**One mutant leaked because of this.** The helper was already covered by
another test; the call site carrying the actual fix was covered by nothing.
Breaking the helper turned a different test red, and the mutant was recorded as
caught. The line it was supposed to be measuring stayed unguarded.

A mutant goes on **the line that was fixed.**

### Never mutate in place. Restore in a `finally`

`tools/mutate.mjs` copies to a temp directory and only ever writes there. After
running the test it restores the original **in a `finally`**:

```js
try { r = 돌리기(어긋.검사); } finally { writeFileSync(파일, 원본, 'utf8'); }
```

Without the `finally`, a test that takes the process down — or a person
pressing Ctrl+C — **leaves a deliberately broken file on disk.** Committing
that is worse than anything this tool prevents.

### Baseline first

A test that was already red measures nothing. It is red when you break the line
and red when you do not. Counting that as caught makes the sweep measure **the
colour of your tests rather than their health.** So the runner runs each
relevant test file once before any mutation, and marks the mutants attached to
a red one as **못 잼**.

### 못 잼 counts as failure

This is the conclusion of the whole mutation section. A mutant whose anchor
silently stops matching **runs, measures nothing, and keeps the total looking
healthy.** That is the exact defect class this loop hunts, living inside the
tool built to find it.

The last full sweep showed it plainly. Of 1,179 registered, 1,149 were run:
**1,125 caught, 2 leaked, 22 unmeasurable.** The number people flinch at is
the 2 leaked. The dangerous number is **the 22**. A leak is visible on a red
screen. An unmeasurable mutant is **invisible on red and on green alike.**

### Do not sweep on a machine doing other timing-sensitive work

A full sweep takes 2h46m. If that machine is doing other timing-sensitive work
during it, a test that hits its timeout **is reported as leaked.**

Then you go hunting a hole that is not there. You read the test, check the
coverage, find everything correct, re-run it, and it is caught. The verdict was
about **the scheduler**, not about the code.

Set `mutate.timeoutMs` generously and run full sweeps when the machine is
otherwise idle. And do not record a leak as a hole until you have confirmed it
**reproduces on a re-run.**

---

## 9. Red test first, and two traps that cost hours

### The rule

Write the test that fails **for the reason you are about to fix**. Run it.
**Watch it go red. Keep the output.**

A test written after the fix passes for reasons nobody checked — because of the
fix, because it asserts something always true, or because it never reaches the
assertion. Afterwards there is no way to tell which.

### Trap one — a test block placed after the teardown

A new test block was appended at the end of the file. The teardown was
**above** it, not below: `srv.close()`. The test went red. Because the server
was already closed.

It nearly got read as "the claim is true". **Red is not evidence. The reason
for the red is the evidence.** You have to read the failure output and check
that it points at the behaviour the claim is about. "Connection closed" is not
"a 32B model was counted as small".

### Trap two — a fixture the code correctly rejects

To measure a leak claim, a fake API key was used. It contained non-ASCII
characters. The code **correctly rejected it**, so the path under test was
**never reached at all.**

The output showed that nothing had gone out, and the claim looked false. In
reality the experiment had **never started.** That took hours to find.

So there is now one more check before measuring: **did execution actually reach
the place you are measuring?** Without evidence that it did, the run is not
evidence of falsity — it is **못 잼**.

---

## 10. The record

### What we tried

Deleting claims that turned out to be wrong; they were wrong anyway and only
cluttered the file. Candidates we saw and did not take went into the code as
`TODO` comments.

### What broke

**The same claim came back.** Something disproved in round 9 returned in round
27, in different words, with high confidence. With no counter-evidence on file
the whole investigation ran again. The second time it nearly reached the
opposite conclusion — which would have shipped **a regression to fix a defect
that never existed.**

The `TODO` comments rotted in place. **Nobody greps for them.** They feel
visible because they live in the code, but if nobody re-reads that file they
are never seen again.

### What the rule is now

- **The record is append-only.** The false claims, the reverted fixes, the
  leaked mutants, the four nobody could measure — all of it stays.
- **A false verdict is recorded with its counter-evidence.** That is the
  difference between closing it in thirty seconds when it comes back and paying
  for the investigation twice.
- A reverted fix carries more information than one that stuck. It tells the
  next round **which shape of change this code refuses**, and that is the
  knowledge that disappears first.
- Only the status table at the top is ever edited **in place**, and only by
  bumping counts.
- What you saw and did not take goes into **다음 회차 후보 / next-round
  candidates**, with `file:line` — not into a `TODO` in the code. That one habit
  is the difference between round 40 starting in ten seconds and starting with
  an hour of re-reading.
- `tools/record.mjs` **refuses any write that would make the file shorter.** It
  compares the byte length before and after, and if the result is not strictly
  longer it restores the original and exits non-zero.

  That check is there because of **the tool, not the disk.** The status table
  has to be edited in place, and an in-place edit is the one plausible way a
  whole record disappears — a regex that matches wider than intended, a
  template that replaces instead of appending, a truncating write landing
  between two runs. **Every version of that failure exits 0 and prints
  something reassuring.** A 2,745-line record quietly becoming 40 lines looks
  exactly like a successful run.

---

## The whole of the tuning, in one line

Every rule here has the same shape. **Something was wrong, and the fact that it
was wrong was invisible.**

A truncated answer looked like "nothing found". A skipped briefing did not
lower the count. A non-matching anchor kept the total healthy. A dead test file
raised the pass count. Parallel retries looked like backoff. Deleted
counter-evidence made you pay for the investigation twice.

CHA's rules are not a better way to read code. They are **a list of the places
where being wrong does not look like anything**, made visible one at a time.

---

**Next:** [04 — Briefing](04-briefing.md) · [05 — Second eye](05-second-eye.md) ·
[07 — Mutation](07-mutation.md) · [08 — Gate & record](08-gate-and-record.md)
