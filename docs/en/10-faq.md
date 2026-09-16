# 10 — FAQ

**한국어: [10-자주묻는것.md](../ko/10-자주묻는것.md)**

---

## Is this just code review?

No. **Code review ends at an opinion. CHA ends at an execution.**

A review finishes with "this looks wrong here". Whether anything happens next is a human reading it and deciding. In CHA, "this looks wrong" is **not yet anything**. A claim is only closed once you have run the command that separates the two behaviours and written down the command and its output next to the verdict.

The size of that difference is **57 → 22**. Fifty-seven confident findings came back; 22 survived execution. The other 35 were plausible and wrong. Running the review the usual way — read it, if it seems right, fix it — would have meant **35 edits to working code**.

To be precise about what that costs: 35 edits do not mean 35 breakages. They mean **35 opportunities** to break something that was fine.

## Why not two Claude instances?

**Because the errors are correlated.**

Two instances of the same model agree with each other. The problem is that a large share of that agreement comes from **both being wrong for the same reason**. Same training data, same blind spots, the same shape of fluent confident answer when neither is sure. What a second instance buys you is not confirmation, it is repetition.

Spending on a second eye is not buying more compute. It is buying **an observer whose list of things that look normal is different from yours**. The less those lists overlap, the more the second eye is worth. That is the whole reason the platform is split — a different vendor, different training, different failure modes.

More in [05 — Second eye](05-second-eye.md).

## How much does a round cost in time?

Honestly: **the shape can be described, the minutes cannot.**

Exactly one wall-clock number here was measured with a clock: **the full mutation sweep, 1,149 mutants in 2h46m.** Everything else depends on the repository — how long one test file takes, how many files there are, how many claims come back — and numbers I did not measure are not going in this document.

What does dominate is clear:

1. **Adjudication.** One command per claim. It scales directly with the number of claims and it is the longest hands-on part of a round.
2. **The full sweep.** One test-file run per mutant. Mutant count multiplied by that test's runtime.

Everything else — hunt, brief, red test, fix, gate, record — is short next to those two.

This is why a slice sweep exists:

```bash
node tools/mutate.mjs src/foo.js
node tools/mutate.mjs --id recall-042
```

If the only way to check whether the line you just moved is guarded is to wait for the entire sweep, **you will stop checking** — and then the tool may as well not exist. So a slice can be run, and the screen always prints **how many of the total were filtered out**, because seeing green without knowing how much you skipped is the worst outcome available.

## What if I have no second platform?

In descending order of usefulness:

1. **Another vendor's free tier.** Best option. A different vendor means different training, and different training is the thing you were trying to buy. Rate limits are absorbed by `secondEye.backoffMs` — the queue sleeps and re-asks **the same briefing** rather than skipping past it.
2. **A local model via Ollama.** Weaker. But **genuinely differently trained.** It misses more, and the things it misses are not the same things the first eye misses. The premise of the method is that *decorrelation* matters more than raw capability.
3. **A human.** Slow, and the least correlated of all. The 20KB briefing cap earns its keep here in particular — that is a size a person can actually be handed.
4. **Last resort — run the loop without step 3.** Keep steps 4 through 9: red test first, one writer, a mutant per fix, numeric gates, the append-only record. That is a real amount of value and it still holds.

But about option 4, plainly: **this is CHA with its main organ removed.** The other eight steps are the procedure for handling what you found. Step 3 is the step that **finds** it. That a first eye cannot see its own blind spot is the entire content of [00 — Why](00-why.md).

## Does this need my repo to be in Korean?

**No.** The tools accept Korean **and** English field names, and the two may be mixed in one file.

| Korean | English |
|---|---|
| `곳` | `where` · `file` |
| `무엇` | `what` |
| `그러면` | `then` |
| `찾을것` | `find` |
| `바꿀것` | `replace` |
| `검사` | `test` |

The root of the mutant list can be any of three shapes:

```json
{ "어긋들": [] }
{ "mutants": [] }
[]
```

The reason both spellings exist is narrow and practical: **it is one fewer reason for somebody to retype an anchor.** Once a field name does not match and a person starts hand-editing the file, they hand-edit the anchor while they are in there. A retyped anchor stops matching over one character of whitespace, and **an anchor that does not match is a mutant that runs and measures nothing**. Twenty-two of them were in that state at the last full sweep.

## Why is unmeasurable a failure?

**Because the alternative is a clean scorecard that is a lie.**

Take a mutant whose anchor no longer matches. Run the sweep and that entry goes past. Nothing errors. It is still counted in the total, and it lands on the caught side. The number on screen looks healthy.

That number is **not a number about your tests. It is a number about your JSON file.** It reports that your list has that many entries in it. The moment unmeasurable counts as a pass, the mutation tool has taken inside itself the exact defect class it was built to find — **something with a name on it that guards nothing**.

So `tools/mutate.mjs` counts 못 잼 as a **failure**. A non-matching anchor fails loudly. It is never skipped quietly.

For the same reason, 못 잼 in [adjudication](06-adjudication.md) is **not false**. Filing an unmeasurable claim as false produces a clean sheet, and the cleanliness is the lie.

## Does it run in CI?

**The gate does.** The commands in `.cha/config.json` under `gate` are ordinary shell commands and run anywhere. The mutation sweep runs too — it takes long enough that it belongs in a nightly job.

**The second eye and adjudication do not.** Adjudication is the work of inventing, per claim, the command that separates the two behaviours and running it. Which command that is differs for every claim and cannot be written down in advance. It is a person or an agent working against a live claim.

So: CI **holds step 8**. It cannot stand in for the other eight.

## Can I use it on a small repo?

**Yes, and it is cheaper there.**

The two parts that scale badly are **the full sweep** and **the number of briefings**, and both are proportional to the size of the repository. A small source tree produces a handful of briefings, a short mutant list, and a short sweep.

What changes on a small repo is the time around one lap, not the procedure. The steps are still the same nine.

---

| | |
|---|---|
| ← [09 — Results](09-results.md) | [00 — Why](00-why.md) ↺ |
