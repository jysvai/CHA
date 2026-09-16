---
description: Write the failing test first, then the smallest fix that turns it green. One writer, one defect, one commit.
---

# /cha-fix `<file:line>`

Fix one adjudicated defect. Nothing here starts until a claim has a **true** verdict with a command and an output behind it.

## The order is not negotiable

**1. Red test first.**

Write a test that fails *for the reason you are about to fix*, and run it, and watch it fail. Copy the failure output into the record.

A test written after the fix passes for reasons nobody checked. It might be passing because of the fix, or because it asserts something that was always true, or because it never reaches the assertion. You cannot tell the difference afterwards — and neither can the person who deletes your fix in six months and sees a green suite.

The red output is the evidence that the test is attached to the defect. Without it you have a test-shaped comment.

**2. The smallest fix that turns it green.**

Not the refactor you can see from here. Not the three neighbouring lines that also look wrong. One defect, one fix. The neighbours go back into the hunt list, where they get their own briefing, their own verdict, and their own red test.

Two defects in one commit means that when the revert comes you cannot take back the one that was wrong.

**3. Re-run the whole gate, not just the new test.**

`/cha-gate`. A fix that turns one test green and another red is not a fix.

## One writer

**Only one agent writes code.** In this loop that is Claude; the second eye reviews and never edits, and neither does the user mid-round.

This is not about trust. Two writers produce edits whose interaction nobody has read — one moves a guard, the other moves the thing it guards, both tests pass separately, and the defect lives between them. Everything found in the measured rounds that had this shape — the half-applied fixes where a header described a behaviour the code never got — came from a change that was written in two places at two times.

## Then the mutant

Every fix gets a mutant immediately (`/cha-mutate add <file:line>`), while you still remember exactly which character carried the meaning. A fix with no mutant is a fix you are trusting, and CHA does not trust fixes.

## The commit

One defect per commit. The message says what was wrong in plain language — what a person saw, not what the diff did:

```
fix: 켠다고 적은 자물쇠가 아무것도 안 잠그고 있던 자리
fix: a lock the comment says is on, that locks nothing
```

Then append to `.cha/record.md`: the claim, the red output, the diff, the green output, the mutant id. Never delete a record entry — a fix that got reverted is more informative than one that stuck.
