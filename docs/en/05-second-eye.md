# 05 — Second eye

**한국어: [05-2차눈.md](../ko/05-2차눈.md)**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../diagrams/architecture-dark.svg">
  <img alt="CHA data flow: one writer on the left, a read-only second eye on the right, and a read-only boundary between them that only briefing text and claim text cross." src="../diagrams/architecture.svg" width="100%">
</picture>

Send each briefing to a model **on a different platform** and store the answer. Nothing is fixed here. What comes back are **claims**, not defects; they become defects, or stop being anything, in [adjudication](06-adjudication.md).

The second eye has four required properties. Every one of them is a rule because it broke first.

---

## 1. A different platform

Two runs of the same model **cannot see the same places**.

This is not about capability. Models trained on the same data share a set of things that look normal. They read the same idioms as idiomatic, believe the same comments, and walk past the same shape of `catch`. Running the same model twice buys you **more compute, not another eye**.

The reason for crossing platforms is exactly one thing: **so that the hallucinations are uncorrelated**. You need the failure modes to differ, and for that the training has to differ.

Gemini, Codex, GPT — it does not matter which. The only requirement is that it is not the model that just wrote the code.

If you have no second platform at all, [01 — Setup](01-setup.md) has the fallback, and says plainly that it is a fallback and not the same thing.

---

## 2. Serial, one at a time

### What happened

Three briefings went out in parallel. **A personal quota emptied in about four minutes and all three answers were lost.**

The cause was not parallelism by itself. It was that **each branch carried its own retry loop**. When the limit hit, each branch backed off independently and re-knocked independently. All three hammered the same limit at once, the backoff windows overlapped, and the retries ate whatever headroom was left. The work that went into building those three briefings went with it.

### The rule

**One at a time.** The next briefing goes out after the previous answer is on disk.

And when the limit hits — **re-ask the same briefing. Do not move past it.**

The reason skipping is forbidden matters more than the rule. Skipping produces zero findings for that chunk, and zero findings **looks exactly like clean**. The briefing count still reads 39, the answer count still looks complete, and the file goes into the record as reviewed. That is a hole nothing downstream can detect.

### Configuration

`.cha/config.json`:

```json
{
  "secondEye": {
    "command": null,
    "model": null,
    "mode": "read-only",
    "maxRetries": 6,
    "backoffMs": 1200000,
    "timeoutMs": 600000
  }
}
```

- `command` — the command line that asks the second eye. `{file}` is replaced with the briefing path. If the template has no `{file}`, the briefing is piped on stdin instead.
- `maxRetries` — how many times one briefing may be re-asked. Default 6.
- `backoffMs` — how long to sleep on a quota refusal before asking again. Default 20 minutes.
- `timeoutMs` — how long to wait for one answer. Default 10 minutes. Without it, a single hung process stops the whole round.

### Running it

```bash
node tools/queue.mjs
node tools/queue.mjs --briefings .cha/briefings --answers .cha/answers
```

**It is resumable.** Tags that already have an answer in `.cha/answers/` are skipped. If a quota stopped you halfway, run it again — nothing is re-asked that was already answered.

What it prints:

```
  2차 눈 / second eye  —  12 briefing(s), one at a time
  model: <pinned model id>

  … recall-2  quota — sleeping 20.0min, then asking the SAME briefing again (5 left)
```

"the SAME briefing" is spelled out in that line because that is the moment you will want to skip it.

---

## 3. Pin the model id

Never `latest`. Write the exact id.

`latest` **changes without telling you**, and when it changes, round-to-round numbers stop meaning anything. When one round produces far fewer findings than the round before it, you have no way to tell whether the code improved or **the reviewer changed**. Both are plausible, and people read that ambiguity in the flattering direction.

The numbers in this repo mean something because the ruler did not move. `queue.mjs` warns and continues when `secondEye.model` is unset — it does not block, but it tells you up front that "which model was that, back then?" will have no answer later.

Write the pinned id into every round of the [record](08-gate-and-record.md).

---

## 4. Read-only, one writer

**The second eye gets no write tools.** No shell, no repo access. Only the briefing text.

This is not about trust. **Two writers produce edits whose interaction nobody has read.** One moves a guard, the other moves the thing the guard protected; each one's tests pass separately, and the defect lives in between.

**Half-applied fixes** come from exactly here: a header describing the correct behaviour, implemented at only one of two call sites. Three of these were found in the measured rounds. In all three, the code had been lying for a whole release cycle.

`mode: "read-only"` in the config is a declaration. Whether it is actually true is something the person wiring up the tool has to guarantee.

---

## How to write the ask

The instruction attached to the briefing is short.

- **Defects only.** No praise, no summary, no refactoring suggestions.
- **Within the five classes.** Nothing outside them.
- **`file:line`** on every finding.
- **How to measure it** on every finding. If the reviewer cannot say how to measure a finding, it should not be filed.
- **No confidence scores.** Execution decides anyway. A score changes nothing about the verdict and changes quite a lot about how you feel reading it.

And **never show your own conclusions**. The "must never go in" list from [04 — Briefing](04-briefing.md) applies here unchanged. Attach the first eye's suspicions and what comes back is agreement, not review.

---

## What comes back is not yet a defect

In the measured rounds, **57 claims came back and 22 were true**.

Start fixing on the strength of reading and you touch **35 pieces of working code**, each of which is an opportunity to introduce a real defect. Leave the answers in `.cha/answers/` and go to the next step.

---

| | |
|---|---|
| ← [04 — Briefing](04-briefing.md) | [06 — Adjudication](06-adjudication.md) → |
