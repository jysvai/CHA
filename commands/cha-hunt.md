---
description: First-eye pass over a slice of source. Produces suspicions with file:line — never verdicts, never fixes.
---

# /cha-hunt `<path>`

The first eye. Read the slice and write down what looks wrong. This step **does not fix anything and does not decide anything** — it feeds the briefing and the adjudication that follow.

## What to read

`$ARGUMENTS` is a file, a directory, or a glob. If it is a directory, take the files in it one at a time; do not try to hold a whole subsystem in your head at once.

Read the **whole** file, including the comments and the header. In CHA the comments are not decoration — they are the promises the code is measured against. A header that says "this never counts an unknown as a success" is a testable claim.

## What to write down

For each suspicion:

```
S<n>  <file>:<line>
  약속 / promise: <what the comment, header, or doc says happens>
  코드 / code:    <what the line actually does>
  그러면 / so:     <the concrete consequence for a person or the model>
  재는 법 / how to measure: <the exact command or input that would settle it>
```

The last line is the important one. A suspicion you cannot describe how to measure is not ready — either find the input that separates the two behaviours, or drop it.

## The five classes to look for

1. **A rule that never matches real input** — a regex, a threshold, or a name check that does not fire on the values people actually pass.
2. **Silent failure** — a `catch` that swallows, a `continue` that drops, a fallback that hides the fact that something did not happen.
3. **A test that does not guard** — a test whose name promises more than its assertion checks.
4. **Comment contradicts code** — the header says one thing, the line below does another. Both cannot be right; decide which one is wrong.
5. **Trust-boundary leak** — a key, a path, a network call, or a permission that crosses a line the code claims it does not cross.

A **false warning counts as a defect**. Code that reports a problem that is not there costs the same as code that stays silent about one that is.

## Rules

- **Do not fix anything.** Not even an obvious typo. Fixes go through `/cha-fix`, which puts the red test first.
- **Do not write a verdict.** "This is a bug" is not yours to say yet — `/cha-judge` says it, after running it.
- Prefer few, sharp suspicions over many vague ones. A suspicion with no measurement is noise the next step has to pay for.
- Record what you read and what you did **not** read. A slice that was skipped and a slice that was clean must not look the same later.

## Output

Append the suspicions to `.cha/briefings/hunt-<slug>.md` and report the count, the classes they fall into, and the next command (`/cha-brief <path>`).
