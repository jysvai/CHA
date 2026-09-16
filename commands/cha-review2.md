---
description: Send every pending briefing to the second eye — one at a time, quota-aware, skipping anything already answered.
---

# /cha-review2

Run the second-eye queue. This is a long-running, mostly unattended step; start it in the background and keep working.

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/queue.mjs" --briefings .cha/briefings --answers .cha/answers
```

The command it calls per briefing comes from `.cha/config.json` → `secondEye.command`. If that is `null`, stop and point at `docs/en/05-second-eye.md`; do not fall back to reviewing with yourself and call it a second eye.

## The rules the queue enforces

**One at a time.** Three parallel reviews once burned an entire personal quota in four minutes and lost all three answers — the retry logic inside each one kept firing until the account was empty. Serial is slower per wall-clock hour and strictly faster per *answer that survives*.

**Quota-aware backoff.** On `RESOURCE_EXHAUSTED` / `quota reached`, read the reset window out of the error, sleep past it, and retry **the same briefing** — do not move on and leave a hole. If the error carries no window, back off 20 minutes.

**Skip what is already answered.** A rerun must not throw away answers you already paid for. An answer file that exists and is non-empty and does not contain an error marker is done. Empty and error files are re-asked.

**Read-only.** The second eye gets no write tools, no shell, and no repo access — only the briefing text. A reviewer that can edit is a second writer, and two writers is how a fix ends up half-applied.

**Pin the model.** Write the exact model id into `config.json`. "Latest" silently changes what you measured between rounds, and then the round-to-round numbers mean nothing.

## While it runs

Do not wait on it. Adjudicate the answers that have already landed (`/cha-judge <tag>`), or hunt the next slice. The queue writes one file per tag into `.cha/answers/` as it goes.

## Output

Per briefing: the tag, whether an answer landed, how many lines, and how long it took. At the end: how many answered, how many skipped as already-done, how many lost. **Report the lost ones by name** — a queue that quietly finishes with holes is the same failure as a test that asserts nothing.
