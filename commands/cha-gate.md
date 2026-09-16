---
description: Run every gate command and report the real numbers. Green means green — a skip is not a pass.
---

# /cha-gate

Run the commands in `.cha/config.json` → `gate`, in order, and report what actually happened.

```bash
npm test && npm run check && npm run docs
```

## The rule

**Report the numbers, not the word.** "Tests pass" is not a gate result. This is:

```
관문 / gate 39
  test   12,596 pass / 0 fail / 1 skip   (156 of 156 files clean)
  check  OK — 167 files, 170 deploy files all LF
  docs   62 pages, 0 broken links
```

Three things that hide behind the word "pass":

- **A skip is not a pass.** One skip is fine when you know which one and why. A skip count that grows between gates is a suite quietly switching itself off.
- **Files that exited cleanly matters as much as assertions.** 12,596 assertions passing across 150 of 156 files means six files died before asserting. The assertion count goes *up* when a file crashes early and its failures never run.
- **The gate must be green before the loop starts**, not just after a fix. A loop that begins on a red build cannot tell its own breakage from the kind it inherited.

## If it is red

Stop. Do not hunt, do not brief, do not start the next fix. A red gate means the last thing you wrote is either wrong or exposed something that was already wrong, and both are the highest-priority item on the board. Find the smallest input that reproduces it, then go to `/cha-fix` — with a red test first, same as always.

## If a gate command does not exist

Say so. Do not substitute a similar one, and do not report a gate as passing on two of three commands. `/cha-init` is supposed to have verified all of them; if one has since disappeared, that is a finding about the repo.

## Output

The gate number, the three blocks above with real numbers, the elapsed time, and the next command. Append the block to `.cha/record.md` — the gate history is how you see a skip count creeping.
