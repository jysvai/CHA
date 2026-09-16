---
description: Cut a source file into second-eye briefings of 20KB or less, each carrying the code, its promises, and the five defect classes.
---

# /cha-brief `<path>`

Turn source into something a second eye on another platform can actually review. Run `${CLAUDE_PLUGIN_ROOT}/tools/brief.mjs`, or build the briefing by hand to the same shape.

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/brief.mjs" <path> --out .cha/briefings --max 20480
```

## Why 20KB

Three separate things break above it, and they break quietly:

- The reviewer's **answer** gets truncated mid-finding. You get half a claim with no way to tell it was cut.
- Recall drops in the middle of a long chunk. Findings cluster at the start and the end.
- A 400-line answer about a 2,000-line file is unjudgeable. You cannot run 40 claims in one sitting, so they rot.

When a file does not fit, split it at a **function boundary** and name the parts `<tag>-a`, `<tag>-b`. Never split mid-function: a reviewer that cannot see the early return will invent one.

## What goes in

```markdown
# <tag> — <file> lines <from>–<to>

## What this file promises
<the file header, verbatim — plus any function headers in this slice>

## Code
```<lang>
<the slice, with real line numbers>
```

## What to look for
1. A rule that never matches real input.
2. Silent failure — a swallowed error, a dropped item, a fallback that hides it.
3. A test that does not guard — the name promises more than the assertion checks.
4. Comment contradicts code.
5. Trust-boundary leak — a key, a path, a network call crossing a line the code says it does not cross.

A false warning is a defect. Code that reports a problem that is not there costs the same as silence.

## Answer format — nothing else
For each defect, and only for defects:
1) input → what happens now vs what should happen
2) line number and the line, quoted
3) confidence
If you find nothing, answer "none". Do not summarise the file.
Say plainly which parts you could not see.
```

## What must never go in

- **The conversation.** Not one turn. The second eye must not inherit the first eye's conclusions, or you have bought a second opinion and been handed an echo.
- **Your suspicions from `/cha-hunt`.** Same reason. Hunt findings are adjudicated on their own.
- **Secrets.** Briefings are sent to another platform. Strip keys, tokens, internal hostnames, and customer data before writing the file — and if a slice cannot be stripped, do not brief it.
- **The fix you already have in mind.** Naming it turns the review into agreement.

## Output

One file per chunk in `.cha/briefings/`, plus a printed list of tags. Report how many chunks, their byte sizes, and the next command (`/cha-review2`).
