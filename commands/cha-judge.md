---
description: Adjudicate second-eye claims by running them. Every verdict needs a command, an input, and an output — never an opinion.
---

# /cha-judge `<tag>`

Take the answer file for `<tag>` and decide, claim by claim, whether each one is true. **The only thing that decides is execution.** Not plausibility, not the reviewer's confidence score, not your own reading of the code.

```bash
cat .cha/answers/<tag>.md
```

## The rule

> A claim is true when you have run something that would behave differently if it were false.

Reading the code and concluding "yes, that looks wrong" is how a review round produces 40 fixes and 12 regressions. In the measured rounds of this loop, **57 claims came back and 22 were true** — 61% were plausible and wrong. If you had not run them you would have "fixed" 57 things, 35 of which were not broken, and every one of those 35 edits is a chance to break something that worked.

## How to run a claim

Pick the cheapest thing that separates the two behaviours:

| Claim shape | How to settle it |
|---|---|
| "this regex never matches X" | `node -e` the regex against X — print the match |
| "this returns undefined when …" | call the function with that input, print the result |
| "this test does not actually guard" | break the line the test names, run the test — if it still passes, the claim is true |
| "this leaks a key to the network" | run it with the network stubbed and print what was about to be sent |
| "this counts an unknown as a success" | feed an unknown, print the counter |

For anything needing a live process, a port, or a real file — build the smallest one. A claim settled against a real socket is worth ten settled by reading.

## Three verdicts, and the third one is mandatory

- **참 / true** — you ran it, the wrong behaviour appeared. Record the command and the output. Goes to `/cha-fix`.
- **거짓 / false** — you ran it, the claimed behaviour did not appear. Record the **counter-evidence**, not just "no". A disproved claim that comes back next round and gets re-argued costs more than the first one did.
- **못 잼 / unmeasurable** — you cannot run it on this machine (a Unix-only path on Windows, hardware you do not have, a vendor API you cannot reach), or the claim reads both ways and no input separates them. **Record it as 못 잼. Never as false.**

못 잼 is the verdict that keeps the loop honest. The temptation is to call an unmeasurable claim false and move on with a clean sheet. Four claims in the measured rounds were genuinely unmeasurable — Unix-only process reaping, two paths needing software not installed on this machine, and one argument-substitution convention that reads both ways — and writing them down as 못 잼 is what makes the numbers mean anything.

## Watch for the half-applied fix

Sometimes a claim is true **and** a previous round already wrote the header describing the bug. That means a fix landed halfway: someone documented the intent and edited one of the two call sites. Three of the fixes in the measured rounds were exactly this. When the comment already describes the correct behaviour and the code does not, the claim is true and the fix is urgent — that code has been lying for a whole release cycle.

## Output

Append to `.cha/record.md` a table: claim, verdict, the command you ran, the output, and for true claims the file:line to fix. Report the counts — `<n> claims → <t> true, <f> false, <u> unmeasurable` — and the next command (`/cha-fix`).
