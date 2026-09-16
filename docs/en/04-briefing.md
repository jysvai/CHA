# 04 — Briefing

**한국어: [04-브리핑.md](../ko/04-브리핑.md)**

A briefing is one unit of work for the second eye: a slice of source under 20KB, the promises that code makes about itself, and the five defect classes.

It is not a smaller version of "paste the file and ask". Pasting the file gets you an answer, but it gets you an answer **in which you cannot tell what went unread**.

---

## Why 20KB

Three things break above the cap. All three break **quietly**, which is the whole problem.

### (a) The answer truncates mid-finding

A long briefing produces an answer that stops before the end. The last finding is cut off mid-sentence.

The loss is not that one finding. The loss is that **truncation and "there was nothing there" look identical**. When the answer contains no findings about the back half of the file, you cannot tell whether the back half is clean or whether the answer never reached it. People read that ambiguity in the flattering direction.

### (b) The middle of the file goes unreviewed

Recall drops in the middle of a long context. The visible symptom is that **findings cluster at the two ends**.

This is worse than truncation because the answer looks fine. The findings come back correctly formatted, each with a file:line. But they all come from the opening and closing stretches of the file, and everything in between is in exactly the state it would be in if nobody had looked at it. The file still gets written into the record as reviewed.

### (c) A 400-line answer cannot be adjudicated

[Adjudication](06-adjudication.md) means running a command per claim. It does not mean reading the claim and nodding.

Forty claims from one briefing cannot be settled in one sitting. The unsettled ones slide to tomorrow, then to the next round, and become a pile labelled "look at this later". If two of them were true, nobody finds out.

**The size of the briefing sets the size of the answer, and the size of the answer decides whether the answer ever actually gets judged.**

---

## Measure bytes, not lines

The cap is **20480 bytes**. Not lines.

One Korean character is three bytes in UTF-8. In source with Korean comments, a line count understates the real size **by up to a factor of three**. A slice that looked small by line count went out well over the cap, the answer came back truncated, and nobody noticed it was truncated.

`tools/brief.mjs` measures with `Buffer.byteLength`. Do not measure by eye.

---

## Split at function boundaries

**Never split mid-function.**

A reviewer who cannot see the early return **invents one**, and files a finding about it. Settling that finding costs a command run, and the command shows the code does not exist. You have spent an adjudication on code that is not there.

The cost is not only the time. What is left afterwards is an impression that this reviewer's findings are partly imaginary, and next round a real finding gets read less carefully because of it.

## Keep the original line numbers

Do not renumber each chunk from 1.

Findings arrive as `file:line`. If the briefing was renumbered, **every single claim has to be mapped back by hand** — one conversion per finding, and one arithmetic slip sends you to read the wrong line and conclude that the finding was wrong.

---

## What goes in

1. **The source chunk** — comments included, verbatim. Stripping comments defeats the point.
2. **The promises** — what the code says about itself. Header comments, function docs, documented behaviour. This is the ruler the code gets measured against. "A line with no `ok` is not counted as a success" is a **testable claim**, and it is usually one `node -e` away from settled.
3. **The five defect classes**, below.
4. **The instruction to report defects only** — no praise, no proposed patches, no refactoring suggestions. Every finding needs `file:line` and **how you would measure it**. A finding whose author cannot say how to measure it should not be filed.

### The five classes

1. **A rule that never matches real input** — a regex, threshold, or name check that does not fire on the values people actually pass.
2. **Silent failure** — a `catch` that swallows, a `continue` that drops, a fallback that hides the fact that something did not happen.
3. **A test that does not guard** — the name promises more than the assertion checks.
4. **Comment contradicts code** — both cannot be right; the work is deciding which one is the bug.
5. **Trust-boundary leak** — a key, a path, a network call, or a permission crossing a line the code says it does not cross.

**A false warning is a defect.** Code that reports a problem that is not there costs exactly what silence about a real one costs.

---

## What must never go in

- **The conversation so far.** The second eye should be seeing this repository for the first time.
- **Your own hunt suspicions.** Attach them and the second eye confirms them back to you. You have spent quota receiving your own conclusions — **an echo you paid for**.
- **Keys, tokens, credentials.** The briefing leaves the machine and goes to somebody else's server.
- **The fix you already have in mind.** Same reason. Show a patch and you get back "yes, that patch is correct".

All four are one failure: **the second eye stops being a second eye.** The reason for sending it to another platform is to buy an uncorrelated set of blind spots. Handing over your conclusions first copies your blind spots onto it.

---

## Running it

```bash
node tools/brief.mjs src/agent/recall.js
```

The default cap comes from `briefing.maxBytes` in `.cha/config.json`, falling back to 20480.

```bash
node tools/brief.mjs src/agent/recall.js --out .cha/briefings --max 20480
```

What it prints:

```
  recall-1  18.2KB  (lines 1–214)
  recall-2  19.7KB  (lines 215–441)
  recall-3  11.4KB  (lines 442–588)

  3 briefing(s), cap 20KB
```

Each chunk gets a tag. That tag becomes the answer filename (`.cha/answers/<tag>.md`) and the argument to `/cha-judge <tag>`.

A file that already fits under the cap produces one briefing. Splitting is not the goal.

---

## Next

[`/cha-review2`](05-second-eye.md) takes the briefings **one at a time**. Do not send them in parallel — three parallel reviews emptied a quota in about four minutes and lost all three answers. [05 — Second eye](05-second-eye.md) explains why that happens and what the queue does instead.

---

| | |
|---|---|
| ← [03 — Harness tuning](03-harness-tuning.md) | [05 — Second eye](05-second-eye.md) → |
