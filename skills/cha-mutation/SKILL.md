---
name: cha-mutation
description: Write and run mutants — break a line on purpose and check the tests notice. Use when you need to know whether a test suite actually guards the code, after landing a fix, or before a release that claims a coverage number.
---

# 어긋내기 / Mutation

The only step that measures **the tests**. Everything else asks whether the code is right. This asks: *if it were wrong, would anything have told us?*

Coverage does not answer that. A line can be executed by twelve tests and asserted by none.

## A mutant

One entry in `mutants.json`:

```json
{
  "id": "recall-042",
  "곳":     "src/agent/recall.js",
  "무엇":   "only the longest matching variant scores, not every variant",
  "그러면": "a 3-variant word outscores a 1-variant word, and recall surfaces the wrong past turn",
  "찾을것": "const 다맞음 = 맞은낱말 === 묶음.length ? 12 : 0;",
  "바꿀것": "const 다맞음 = 맞은낱말 >= 1 ? 12 : 0;",
  "검사":   "test/recall.test.js"
}
```

| field | meaning | the trap |
|---|---|---|
| `곳` / where | file path | — |
| `무엇` / what | the meaning this line carries, one sentence | if you cannot write it, you do not know what you are mutating |
| `그러면` / then | what a **person** experiences when it is wrong | if you cannot write this, the mutant is not worth having |
| `찾을것` / find | the source line, **lifted verbatim from the file** | retyping it is how anchors die |
| `바꿀것` / replace | the break | must change behaviour, not spelling |
| `검사` / test | the test file that should catch it | **a path, never a nickname** |

## How a run works

For each mutant: read the file, find `찾을것` (must appear **exactly once**), replace with `바꿀것`, run the named test file, restore the original **in a `finally`**, record the verdict.

Restoring in a `finally` is not optional. A crash mid-mutant that leaves a broken file behind will have you debugging a defect you wrote on purpose an hour ago.

## Three verdicts

- **잡음 / caught** — the named test went red. The test guards this line.
- **샜음 / leaked** — everything stayed green. **A hole in the tests, and a finding.** Write the test that catches it, then re-run the mutant.
- **못 잼 / unmeasurable** — the anchor matched zero times or more than once, the named test file does not exist, or the mutant is a no-op. **Counts as a failure.**

### Why 못 잼 counts as failure

An anchor that silently stops matching turns a mutant into a line of JSON that runs, measures nothing, and reports nothing. The sweep total stays reassuringly large. That is *exactly* defect class 1 — a rule that never matches real input — living inside the tool built to find defect class 1.

If 못 잼 were merely "skipped", a mutant list would decay into decoration over about three refactors, and you would never see it happen.

## The four mistakes, each of which happened here

**1. A nickname in `검사`.** `"검사": "recall"` instead of `"검사": "test/recall.test.js"`. Two mutants reported 못 잼 for an entire sweep. They ran. Nothing was measured.

**2. The no-op mutant.** Reordering two independent statements, renaming a local, flipping a comparison whose operands are equal. It goes in, nothing breaks, it reports 샜음, and you go hunting for a test hole that does not exist. Before adding, answer: *what input now behaves differently?*

**3. Mutating the helper instead of the path.** One leaked because the test exercised a helper directly while the real defect lived at the call site. Mutate what the production path executes.

**4. Retyping the anchor.** One character of whitespace off and the anchor never matches again. Always lift the line out of the file programmatically — `add-mutant.mjs` exists for exactly this.

## Ambiguous anchors

If `찾을것` appears more than once, the mutant is unmeasurable — the tool cannot know which one you meant, and silently taking the first is how you get a mutant that measures a different line than its `무엇` claims. Extend the anchor with the line above or below until it is unique.

## Cost and cadence

Serial by nature: apply, run suite, restore. **The last full sweep here was 1,149 mutants in 2h46m — 1,125 caught, 2 leaked, 22 unmeasurable.**

- After each fix: run **that one mutant**.
- Before a release: run the **full sweep**, in the background.
- While a sweep runs, do not run anything else timing-sensitive on the same machine. Sweeps that share a box with a load test produce leaked verdicts that are really scheduling noise, and chasing one of those costs an afternoon.

## What the numbers mean

`caught / total` is the only honest coverage number available, and it is still only as good as the mutant list. A 98% caught rate over 40 mutants says nothing; over 1,179 mutants covering 138 source files it says the suite would notice most single-line lies.

Leaked and unmeasurable are **open findings**, not footnotes. A sweep that ends with 22 unmeasurable has 22 things to fix before the next release, same as any other finding.
