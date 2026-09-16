---
name: cha-adjudication
description: Decide whether a review claim is true by running it — true, false with counter-evidence, or unmeasurable. Use when triaging findings from a reviewer, a linter, a static analyser, or another agent, and you need to know which ones are real before editing anything.
---

# 판정 / Adjudication

The step that decides what is real. It has exactly one rule.

> **A claim is true when you have run something that would behave differently if it were false.**

Everything else — the reviewer's confidence, the plausibility of the story, your own reading of the code — is not evidence.

## Why this is the load-bearing step

Measured over this project: **57 claims came back, 22 were true.** Sixty-one percent were plausible and wrong. They were not stupid claims; they were the kind you nod at.

If you fix on plausibility you make 57 edits, 35 of them to working code, and each edit is an independent chance to introduce something. The review then has a *negative* expected value, and you will not find out for months.

Adjudication is what converts a review from a source of opinions into a source of facts.

## How to run a claim

Pick the cheapest experiment that separates the two behaviours.

| Claim shape | How to settle it |
|---|---|
| "this regex never matches X" | run the regex against X, print the match |
| "this returns undefined when …" | call it with that input, print the result |
| "this test does not actually guard" | break the line the test names, run the test — if it stays green the claim is true |
| "this counts an unknown as a success" | feed it an unknown, print the counter |
| "this leaks a key over the network" | stub the transport, print what was about to be sent |
| "this loses items past N" | feed N+1, count what comes out |
| "this hangs when the child writes nothing" | spawn a real child that writes nothing, with a timeout |

For anything needing a live process, a port, or a real file — build the smallest one. A claim settled against a real socket is worth ten settled by reading.

When you cannot isolate it, **instrument instead of arguing**: add a temporary counter, run the real path, print, remove.

## Three verdicts

### 참 / true
You ran it and the wrong behaviour appeared. Record the exact command and its exact output. That output becomes the red test in the next step, so copy it now.

### 거짓 / false
You ran it and the claimed behaviour did not appear. **Record the counter-evidence**, not the word "no".

This is the part people skip, and it is the most expensive skip in the method. The same claim comes back — a different reviewer, two rounds later, different wording, high confidence. With the counter-evidence on file you close it in thirty seconds. Without it you re-investigate, and there is a real chance you reach the opposite conclusion the second time and ship a regression to fix a bug that was never there.

### 못 잼 / unmeasurable
You cannot run it here, or no input separates the two readings. Write it down as 못 잼. **Never as false.**

Legitimate 못 잼 from this project:
- a Unix-only child-process reaping path, on a Windows machine
- two paths requiring software that is not installed here
- a command-line argument-substitution convention that genuinely reads both ways

Four of them. Calling those false would have produced a cleaner-looking sheet and a less true one. The count of 못 잼 is a measure of the harness, not of the code — it tells you what your environment cannot see, which is the thing you most need written down.

## The half-applied fix

Watch for a claim that is true **and** whose file header already describes the correct behaviour.

That is a fix that landed halfway: the intent got documented, one of two call sites got edited, and the code has been lying ever since. Three showed up in the measured rounds — an auth path, a process-liveness check, and a context-length source. These are the highest-value findings in the whole loop, because the comment has been actively misleading every reader since the day it was written.

## Batch discipline

- Adjudicate **one claim at a time**, all the way to a verdict, before reading the next. Reading ten claims first contaminates each with the others.
- Do not adjudicate your own hunt suspicions and second-eye claims in the same pass. Different provenance, different priors.
- Put the verdict, the command, and the output in the record **as you go**. A verdict you remember but did not write is a verdict you will re-derive.

## Output

```
<n> claims → <t> 참 / <f> 거짓 / <u> 못 잼
```

with a table of command and output per claim, and the file:line list for the true ones, handed to the fix step.
