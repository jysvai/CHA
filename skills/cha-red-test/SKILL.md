---
name: cha-red-test
description: Write the failing test before the fix, watch it fail, and keep the failure output as evidence. Use before any bug fix, and whenever a test needs to prove it is attached to the behaviour it names.
---

# 빨간 검사 / Red test

Before the fix: a test that fails **for the reason you are about to fix**, run, watched, and its output kept.

## Why "watched" is part of the definition

A test written after the fix passes. You do not know why.

It could be passing because your fix works. It could be passing because it asserts something that was always true. It could be passing because it never reaches the assertion — an early return, a swallowed error, a stub that satisfies the call. All three look identical in a green suite, and they stay identical forever: the next person to read it sees a passing test named after your bug and concludes the bug is guarded.

Running it red once, before the fix exists, is the only moment at which you can tell the difference. That moment does not come back.

## The procedure

1. **Write the assertion from the adjudication output.** You already have the command and the wrong value — `28.00 vs 51.00`, `undefined`, `0 contacted`. That number is the assertion.
2. **Run it. Read the failure.** The failure must name the defect. If it fails with `TypeError: undefined is not a function` when the claim was about ranking, your test is broken, not the code.
3. **Paste the red output into the record.** Verbatim.
4. **Then** write the fix.
5. **Run it green.** Paste that too.
6. **Run the whole gate.**

## What a good red test asserts

Assert the **consequence a person experiences**, not the shape of the internals.

```
bad   expect(typeof 낱말묶기(q)).toBe('object')
good  expect(Math.abs(scoreA - scoreB)).toBeLessThanOrEqual(0.5)
```

The first passes forever and guards nothing. The second is the actual claim — two phrasings of the same question should rank the same — and it went from `28.00 vs 51.00` to `40.00 vs 40.00` across the fix.

## Tests that do not guard

This is defect class 3, and it is the one most often found in *existing* test suites. Symptoms:

- A name that promises more than the assertion checks — `"rejects an offline host"` that only asserts the function returned.
- An assertion on a value that cannot vary — comparing a constant to itself.
- A `try/catch` around the assertion, swallowing its failure.
- A test whose file never exits cleanly, so its later assertions never run and the suite reports *more* passes as a result.

The way to check any of them is the mutant: break the line the test claims to guard and see whether it notices. If it stays green, the test is a comment.

## Environment traps

Two from this project, both of which produced hours of confusion:

- **A test placed after the teardown.** A new block landed below `srv.close()` and reported "could not reach" — not a defect, a location error. When a brand-new test fails in a way unrelated to its claim, check where in the file it is before you trust the failure.
- **A fixture that the code correctly rejects.** A test used a non-ASCII API key; the code is *supposed* to reject non-ASCII keys, so the probe never ran. The test failed for the right reason about the wrong thing.

When a red test goes red, confirm it went red for **your** reason. A red test that fails for a second reason is not evidence of anything.
