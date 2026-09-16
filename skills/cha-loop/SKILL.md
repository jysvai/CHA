---
name: cha-loop
description: The nine-step CHA review loop — hunt, brief, second eye, adjudicate, red test, fix, mutant, gate, record. Use when reviewing a codebase for real defects over many rounds, when a release is gated on "zero open issues", or when a review keeps producing plausible findings that turn out to be wrong.
---

# CHA — Cyclic Hostile Adversarial Harnessing

## 순환형 적대적 하네싱

A review loop for finding defects that survive being run. It is hostile on purpose: every step assumes the previous step is wrong, including the steps you performed yourself.

Nine steps. They run in order. Skipping one does not speed the loop up — it moves the cost to a place where it is harder to see.

```
  ①사냥 hunt ─→ ②브리핑 brief ─→ ③2차 눈 second eye ─→ ④판정 adjudicate
      ↑                                                        │
      │                                                        ↓
  ⑨기록 record ←─ ⑧관문 gate ←─ ⑦어긋 mutant ←─ ⑥고침 fix ←─ ⑤빨간 검사 red test
```

---

## ① 사냥 / hunt — the first eye

Read a slice of source, whole files, comments included. Write down suspicions as `file:line` with four lines each: what the code **promises**, what it **does**, what that means **for a person**, and **how you would measure it**.

The comments are not decoration. They are the promises the code is measured against — "this never counts an unknown as a success" is a testable claim, and the test is often one `node -e` away.

**No fixes. No verdicts.** Not even an obvious typo. A suspicion you cannot say how to measure is not ready.

## ② 브리핑 / brief — cut it to 20KB

Turn the slice into something a reviewer on another platform can review, capped at **20KB**.

Three things break above the cap, all quietly: the answer gets truncated mid-finding; recall drops in the middle so findings cluster at the ends; and a 400-line answer is unjudgeable, so it rots before you can run it.

Split at function boundaries. Never mid-function — a reviewer that cannot see the early return will invent one.

**Never put in the briefing:** the conversation, your hunt suspicions, secrets, or the fix you already have in mind. A second eye that inherits the first eye's conclusions is an echo you paid for.

## ③ 2차 눈 / second eye — another platform, read-only

Send each briefing to a model **on a different platform**, with a **pinned model id**, holding **no write tools**.

- *Different platform* because two instances of the same model share the same blind spots. You are not buying more compute, you are buying a different set of things that look normal.
- *Pinned id* because "latest" silently changes what you measured, and then round-to-round numbers mean nothing.
- *Read-only* because a reviewer that can edit is a second writer, and two writers is how a fix ends up half-applied.

Serial, one at a time, quota-aware. Three parallel reviews once burned an entire quota in four minutes and lost all three answers.

## ④ 판정 / adjudicate — by execution only

> A claim is true when you have run something that would behave differently if it were false.

Measured here: **57 claims → 22 true.** Sixty-one percent were plausible and wrong. Fixing on plausibility would have meant 35 unnecessary edits, each one a chance to break something that worked.

Three verdicts, and the third is mandatory:

- **참 / true** — ran it, saw the wrong behaviour. Record command and output.
- **거짓 / false** — ran it, did not see it. Record the **counter-evidence** — the same claim comes back in different words two rounds later.
- **못 잼 / unmeasurable** — cannot run it here, or the claim reads both ways. **Never file this as false.**

Watch for the **half-applied fix**: the claim is true *and* a header already describes the correct behaviour. That is a fix that landed in the comment and one of two call sites. Three of these showed up in the measured rounds.

## ⑤ 빨간 검사 / red test — first, and you watch it fail

Write the test that fails *for the reason you are about to fix*. Run it. **Watch it go red. Keep the output.**

A test written after the fix passes for reasons nobody checked — because of the fix, because it asserts something always true, or because it never reaches the assertion. Afterwards, nobody can tell which.

## ⑥ 고침 / fix — one writer, one defect

**One agent writes code.** The second eye reviews and never edits. This is not about trust: two writers produce edits whose interaction nobody has read — one moves a guard, the other moves the thing it guarded, both test suites pass separately, and the defect lives in between.

Smallest fix that turns the test green. Not the refactor you can see from here. Neighbouring suspicions go back on the hunt list and get their own briefing, verdict, and red test. One defect per commit, so the revert can take back exactly one thing.

## ⑦ 어긋 / mutant — measure the tests, not the code

Break the fixed line on purpose and check that the test notices. Every fix gets a mutant, written immediately, while you still know which character carried the meaning.

- **잡음 / caught** — the named test went red. Good.
- **샜음 / leaked** — everything stayed green. That is a hole in the tests and a finding.
- **못 잼 / unmeasurable** — the anchor no longer matches, or the named test does not exist. **Counts as a failure**, because a silently non-matching anchor is exactly the defect class this loop hunts, living inside the tool meant to find it.

## ⑧ 관문 / gate — numbers, not the word "pass"

Every gate command, every time, with the real counts: pass / fail / skip, **and how many test files exited cleanly**. A suite where six of 156 files crash before asserting reports *more* passes, not fewer. A skip is not a pass.

Red gate stops the loop. No hunting, no briefing, no next fix.

## ⑨ 기록 / record — append only

Every round appended to one file. Claims that were false, fixes that were reverted, mutants that leaked, the four things nobody could measure — all of it stays.

The same claim comes back. With the counter-evidence on file you close it in thirty seconds; without it you pay for the investigation twice and may reach the opposite conclusion the second time.

Then the next round starts from the **다음 회차 후보** list — what you saw and did not take — so round 40 begins in ten seconds instead of an hour.

---

## The five defect classes

Every briefing asks for exactly these, and nothing else:

1. **A rule that never matches real input** — a regex, threshold, or name check that does not fire on the values people actually pass.
2. **Silent failure** — a `catch` that swallows, a `continue` that drops, a fallback that hides the fact that something did not happen.
3. **A test that does not guard** — the name promises more than the assertion checks.
4. **Comment contradicts code** — both cannot be right; decide which one is the bug.
5. **Trust-boundary leak** — a key, a path, a network call, or a permission crossing a line the code says it does not cross.

**A false warning is a defect.** Code that reports a problem that is not there costs exactly what silence about a real one costs.

## What CHA refuses to do

- Accept a finding it did not run.
- Let the reviewer write code.
- Delete anything from the record.
- Call an unmeasurable thing false.
- Count a skip as a pass.
- Put two defects in one commit.
- Write a fix before a red test.

## Measured

171 source files / 77,607 lines · 154 test files / 75,499 lines · 12,596 pass / 0 fail / 1 skip across 156 of 156 files · 1,179 mutants over 138 source and 119 test files · last full sweep 1,149 mutants in 2h46m → 1,125 caught, 2 leaked, 22 unmeasurable · 39 gates · 39 briefings · 57 claims → 22 true → 19 fixes · 2,745-line record · 434 commits.
