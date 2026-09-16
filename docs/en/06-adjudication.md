# 06 — Adjudication

**한국어: [06-판정.md](../ko/06-판정.md)**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../diagrams/verdicts-dark.svg">
  <img alt="57 second-eye claims split by execution: 22 true leading to 19 fixes landed; the false ones recorded with counter-evidence and no code edited; 4 unmeasurable recorded as unmeasurable, never as false." src="../diagrams/verdicts.svg" width="100%">
</picture>

Take the second eye's claims one at a time, **run each one**, and decide: true, false, or unmeasurable.

This step is what CHA is. The other eight steps exist to keep this one honest.

---

## The rule

> **A claim is true when you have run something that would behave differently if it were false.**

Reading the code and concluding "yes, that looks wrong" is not adjudication. That is a second opinion, and opinions are not the scarce thing here.

```bash
cat .cha/answers/<tag>.md
```

---

## What 57 → 22 means

In the measured rounds, **57 claims** came back and **22** survived execution. Roughly six in ten were plausible and wrong.

The important part is not the 61%. It is that **reading could not tell them apart**. The 22 true ones and the 35 false ones were equally specific, equally furnished with `file:line`, and equally confident.

Acting on plausibility would have meant **35 edits to working code**. Each of those edits is an opportunity to introduce a real defect. This is the exact path by which a review round produces 40 fixes and 12 regressions.

The cost of settling a claim is usually one line of `node -e`. That one line is what stands between you and 35 unnecessary edits.

---

## How to run a claim

Pick the **cheapest** thing that separates the two behaviours.

| Claim shape | How to settle it |
|---|---|
| "this regex never matches X" | `node -e` the regex against X and print the match |
| "this returns undefined when …" | call the function with that input, print the result |
| "this test does not actually guard" | break the line the test names and run the test — if it still passes, **the claim is true** |
| "this leaks a key to the network" | run it with the network stubbed and print what it was about to send |
| "this counts an unknown as a success" | feed it an unknown, print the counter |
| "this threshold never fires on real values" | put the real values in an array and push all of them through |
| "this `catch` swallows the failure" | throw inside it deliberately, see whether the outer result still says success |
| "the comment contradicts the code" | feed the input the comment promises, see whether the code behaves as promised |

When a claim needs a live process, a port, or a real file, **build the smallest one that works**. One claim settled against a real socket is worth ten settled by reading.

---

## Three verdicts, and the third is the point

### 참 / true

You ran it and the wrong behaviour appeared.

Record: **the command, the input, the output, and the `file:line` to fix.** "Confirmed" is not evidence. What the person reading this in two months needs is the command and its output.

Goes to [`/cha-fix`](02-loop.md).

### 거짓 / false

You ran it and the claimed behaviour did not appear.

Record: **the counter-evidence.** Not "no".

Why "no" is insufficient is the most practical paragraph in this document.

**The same claim comes back.** A claim disproved on round 9 reappears on round 27, **in different words and with more confidence**. Different briefing, same code, same thing that trips a reviewer.

With the counter-evidence on file you close it in **thirty seconds**. Deleted because "it was wrong anyway", you buy the investigation **twice** — and the second time you may land on the opposite conclusion, which means shipping a regression to fix a bug that never existed.

Evidence for a false verdict is worth as much as evidence for a true one. It gets used for longer.

### 못 잼 / unmeasurable

You cannot run it here, or the claim reads both ways.

**Never file this as false.** Not once.

The temptation is real, because filing it as false makes the ledger clean: 22 true, 35 false, done. That cleanliness is **a lie**.

못 잼 is **the map of what your harness cannot see**. Four claims in the measured rounds were genuinely unmeasurable:

1. **A Unix-only child-process reaping path.** The host was Windows. You can read the code and guess; you cannot run it.
2. **Two paths requiring software that is not installed on the machine.**
3. **One CLI argument-substitution convention** that reads both ways. No input separates the two interpretations.

Filed as false, the next person reads those four as verified ground. Filed as 못 잼, they read them as places this machine cannot see. Those are **completely different pieces of information**, and only the second one is true.

An accumulating 못 잼 list also tells you what to buy: one Linux box, that piece of software, a documented convention. Buried as false, the list never forms.

The same principle runs through [mutation](07-mutation.md), where 못 잼 counts as an outright **failure**.

---

## The half-applied fix

Sometimes a claim is true **and a header already describes the correct behaviour**.

That is the signature of a fix that landed halfway: somebody wrote down the intent and edited **one of two call sites**. Three of these turned up in the measured rounds.

The priority goes up when you see it. If the comment is right and the code does not follow, that code has been **lying for a whole release cycle**, and people made decisions by reading it.

When you fix it, **find both call sites**. Fixing one is how you produce the same shape again.

---

## The record format

Under the current round in `.cha/record.md`:

```markdown
### 판정 / adjudication
| claim | verdict | command run | output |
|---|---|---|---|
| ranking favours multi-variant words | 참 | `node -e "…"` | `28.00 vs 51.00` |
| offline flag ignored on diagnose | 참 | `node -e "…"` | `contacted 1` |
| retry loop double-counts | 거짓 | `node -e "…"` | `count 3, expected 3` |
| zombie reaping on exit | 못 잼 | — | Unix-only path, Windows host |
```

True claims carry the `file:line` to fix. The "output" column of a false claim **is** the counter-evidence.

Then report the counts: `<n> claims → <t> true, <f> false, <u> unmeasurable`.

The record is **append-only**, per [08 — Gate and record](08-gate-and-record.md). The false ones stay. The unmeasurable ones stay.

---

## What this step does not do

- **It does not fix.** A true verdict does not get fixed here. The [red test](02-loop.md) comes first.
- **It does not read confidence scores.** If the second eye attached one, ignore it. Execution is the only ruler.
- **It does not batch.** One command per claim. Settle three claims with one command and you will not remember later which one was settled by what.
- **It does not guess at the unmeasurable.** Inventing a fix for an unrun claim is the exact failure CHA exists to stop.

---

| | |
|---|---|
| ← [05 — Second eye](05-second-eye.md) | [07 — Mutation](07-mutation.md) → |
