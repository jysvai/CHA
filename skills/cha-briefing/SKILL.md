---
name: cha-briefing
description: Cut source into 20KB second-eye briefings that carry the code, its promises, and a strict answer format. Use when preparing code for review by a model on another platform, or when review answers keep coming back vague, truncated, or full of summary instead of findings.
---

# 브리핑 / Briefing

A briefing is the only thing the second eye sees. It has to carry enough for a real finding and nothing that would tell the reviewer what to conclude.

## The cap: 20KB

Not a style preference. Three failure modes live above it and all three are silent:

1. **Truncation mid-finding.** The answer gets cut and you receive half a claim with no marker saying it was cut. You cannot distinguish "the reviewer stopped" from "the reviewer found three things".
2. **Middle-of-context recall loss.** Findings cluster at the beginning and the end of a long chunk. The middle of a 60KB file gets reviewed in name only — which looks identical to "the middle was clean".
3. **Unjudgeable volume.** CHA adjudicates by *running* each claim. Forty claims from one briefing cannot be run in one sitting, so they queue, and queued claims rot: the file moves, the line numbers drift, and you end up adjudicating against code that no longer exists.

20,480 bytes is the working cap. Measure bytes, not lines — CJK comments are three bytes a character and a 400-line Korean file blows the budget a Latin-1 file of the same length would fit inside.

## Splitting

Split at **function boundaries**, name the parts `<tag>-a`, `<tag>-b`, and say in each part which lines it covers and that the rest exists.

Never split mid-function. A reviewer who cannot see the early return will invent one, and you get a confident finding about a code path that is guarded ten lines above the cut. Those cost a full adjudication each to disprove.

## The shape

```markdown
# <tag> — <file> lines <from>–<to>

## What this file promises
<file header verbatim + the header of every function in this slice>

## Code
```<lang>
<the slice, real line numbers preserved>
```

## What to look for
1. A rule that never matches real input.
2. Silent failure — a swallowed error, a dropped item, a fallback that hides it.
3. A test that does not guard — the name promises more than the assertion checks.
4. Comment contradicts code.
5. Trust-boundary leak — a key, a path, a network call crossing a line the code says it does not cross.

A false warning is a defect.

## Answer format — nothing else
For each defect, and only for defects:
1) input → what happens now vs what should happen
2) line number and the line, quoted
3) confidence
If you find nothing, answer "none". Do not summarise the file.
Say plainly which parts you could not see.
```

## Why the promises section exists

Most real findings in this loop came from a **comment contradicting its code**, and the reviewer can only see that contradiction if the comment is in front of it. Headers are the specification; shipping the code without them is asking someone to review an implementation against nothing.

## Why the strict answer format

Without it you get a summary of the file. A summary is unfalsifiable — nothing in it can be run, so nothing in it can be adjudicated, so the whole round produces zero verdicts.

"Say plainly which parts you could not see" is the line that turns a silent gap into a reported one. A reviewer that skipped 200 lines and a reviewer that read them and found nothing produce identical answers unless you ask.

## Never in a briefing

- **The conversation.** Not one turn. The second eye must not inherit the first eye's conclusions.
- **Your own suspicions.** Same reason. If you name what you suspect, you will be agreed with.
- **Secrets.** Briefings go to another platform. Strip keys, tokens, internal hostnames, customer data. If a slice cannot be stripped, do not brief it.
- **The fix you already have in mind.** Naming it converts review into ratification.

## Line numbers

Keep the real ones. Every claim is adjudicated by running something at a specific line, and a briefing renumbered from 1 forces you to map every claim back by hand — which is where two of the wrong adjudications in this project came from.
