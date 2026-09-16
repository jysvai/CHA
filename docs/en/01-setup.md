# 01 — Setup

**한국어: [01-설치.md](../ko/01-설치.md)**

---

## 1. Install the plugin

```
/plugin marketplace add jysvai/CHA
/plugin install cha@cha
```

Or from a local clone:

```bash
git clone https://github.com/jysvai/CHA ~/CHA
```

```
/plugin marketplace add ~/CHA
/plugin install cha@cha
```

That gives you 10 commands, 6 skills, 3 agents, the tools under `tools/`, and one hook from `hooks/hooks.json`.

---

## 2. Set up a repository

In the repo you want to review:

```
/cha-init
```

It creates:

```
.cha/
  config.json      # gate commands, second-eye command, briefing size cap
  record.md        # cumulative record — append only, never deleted
  mutants.json     # the mutant list
  briefings/       # generated briefings, one per chunk
  answers/         # second-eye answers, one per tag
```

Seeded from `templates/` — `config.json`, `record.md`, `mutants.json`.

`/cha-init` **refuses to guess the gate.** It reads `package.json`, `Makefile`, `pyproject.toml`, `Cargo.toml` and writes down only commands that actually exist. An `npm run lint` that is not there gives you a gate that looks like it runs and blocks nothing. If it finds none, it says so and asks.

If `.cha/record.md` already exists, `/cha-init` **stops.** That repo is already under CHA, and overwriting the record is the worst thing this tool could do.

---

## 3. Fill in `config.json`

A Node repo, worked through. These key names are the ones the tools actually read; anything else falls back to a default, silently.

```json
{
  "gate": {
    "test": "npm test",
    "check": "npm run check",
    "docs": "npm run docs"
  },
  "secondEye": {
    "command": "some-cli --model exact-model-id-here --read-only -p @{file}",
    "model": "exact-model-id-here",
    "mode": "read-only",
    "maxRetries": 6,
    "backoffMs": 1200000,
    "timeoutMs": 600000
  },
  "briefing": { "maxBytes": 20480 },
  "mutate": {
    "testCommand": "node {file}",
    "copy": ["src", "test", "bin", "lib", "docs", "tools", "package.json"],
    "timeoutMs": 180000
  },
  "writer": "claude-only"
}
```

### `gate`

Name-to-command pairs. As many as you like; `/cha-gate` runs **all of them, in the order written.**

One rule: **never write a command you have not run.** A gate entry that names a command which does not execute is neither green nor red, and it gets reported as green.

### `secondEye.command`

A shell template. **`{file}` is the only substitution `tools/queue.mjs` performs** — it is replaced with the briefing path. Nothing else in the string is touched, so the model id goes in literally:

```
"command": "some-cli --model exact-model-id-here --read-only -p @{file}"
```

Writing `{model}` in here does **not** work. It is passed through to the CLI as the seven characters `{model}`, and what happens then depends on the CLI: a good one errors, a bad one falls back to its default model and reviews with something you did not choose and cannot identify afterwards. Put the id in twice — once in the command, once in `secondEye.model` so the record can quote it.

**If the template contains no `{file}`,** the briefing is piped on stdin instead. So a CLI that does not take a file argument works too:

```
"command": "some-cli --model exact-model-id-here --read-only"
```

Left as `null`, `/cha-review2` stops and points at [05 — Second eye](05-second-eye.md). It does **not** fall back to reviewing with yourself and calling that a second eye. That is the correlated-error failure from [00 — Why](00-why.md), with extra steps.

### `secondEye.model`

**An exact model id.** Not `latest`, not `default`, not empty.

`latest` changes silently. On the day it changes, round 38 and round 39 stop being comparable and nothing tells you. `tools/queue.mjs` prints a warning when this is unset and carries on — it does not stop you, but the numbers from a round that printed that warning cannot be lined up against the next round's.

### `secondEye.mode`

`"read-only"`. The second eye gets no write tools, no shell, and no repo access — only the briefing text.

A reviewer that can edit is a **second writer**, and that is where half-applied fixes come from.

### Quota settings

| Key | Default | What it is |
|---|---|---|
| `maxRetries` | 6 | how many times one briefing may be re-asked |
| `backoffMs` | 1200000 (20 min) | how long to sleep after hitting a quota wall |
| `timeoutMs` | 600000 (10 min) | limit for a single review |

On a quota wall `tools/queue.mjs` **re-asks the same briefing** rather than skipping past it. Skipping leaves a chunk that nobody reviewed while the count still adds up.

Never parallel. Three reviews sent at once emptied a personal quota **in about four minutes and lost all three answers**, because each one ran its own retry loop.

### `briefing.maxBytes`

Default `20480`. **Bytes, not lines.** Korean is three bytes per character, so measuring in lines ships a Korean briefing roughly three times the size of an English one.

Why 20KB, and what breaks quietly above it: [04 — Briefing](04-briefing.md) and [03 — Harness tuning](03-harness-tuning.md).

### `mutate.testCommand`

The command that runs **one test file**. `{file}` is replaced with the path inside the work directory.

| Runner | Value |
|---|---|
| node | `"node {file}"` |
| vitest | `"npx vitest run {file}"` |
| jest | `"npx jest {file}"` |
| pytest | `"python -m pytest {file}"` |

Do not put a whole-suite command here. This runs once per mutant.

### `mutate.copy`

Mutation **never breaks source in place.** It copies to a temp directory and only ever writes there. A Ctrl+C, or a test that takes the process down mid-run, would otherwise leave a deliberately broken file on disk — and committing that is worse than anything this tool prevents.

`copy` must contain **enough for the suite to actually run**. Leave something out and the test goes red and the mutant is scored as caught — caught by a missing file, not by the mutation.

For a pytest repo, typically:

```json
"copy": ["src", "tests", "pyproject.toml", "setup.cfg", "conftest.py"]
```

### `writer`

`"claude-only"`. It writes down in configuration that there is exactly one place code gets written. See [06 — Adjudication](06-adjudication.md) and `/cha-fix`.

---

## 4. `.gitignore`

```gitignore
.cha/briefings/
.cha/answers/
```

Keep `record.md` and `mutants.json` **tracked.** Those two are the artifacts. The intermediate briefings and answers are not.

---

## 5. The hook

`hooks/hooks.json` ships one `PostToolUse` hook. When `Edit` or `Write` touches a source file, and only in a repo that has a `.cha/` directory, it adds one line reminding you that this fix needs a red test recorded and a mutant.

**It never blocks.** It always exits 0, and on any parse failure it exits 0 silently. A hook that breaks someone's session is worse than no hook.

---

## 6. If you have no second platform

Plainly: **the value drops a lot.** The whole point is decorrelated error. Remove that and what is left is procedure.

In descending order of usefulness:

**(a) A different vendor's free tier.** The best option. Different training, different failure modes. A tight quota is fine — `queue.mjs` knows about quota walls and waits. A round spread across a day is not a problem.

**(b) A local model via Ollama.** Weaker. It finds fewer real defects and raises more false ones. But its training is **genuinely different**, and false claims get filtered out at adjudication anyway. Weak is a cost you can pay. Correlated is not.

**(c) A human.** Slow and narrow, but the blind spot is completely different. Cutting briefings to 20KB pays off directly here — a person cannot produce a 400-line answer either.

**(d) Last resort: run the loop without step 3.** Use steps 1-2 to raise suspicions, then run 4 through 9 unchanged. You still get red-test-first, mutants, and the cumulative record, and those three are worth having on their own.

But this is **CHA with its main organ removed.** What remains is discipline, not adversarial review. Do not call it the other thing — not even to yourself.

---

## 7. Check the gate is green before you start

Run the gate commands once before the loop:

```
/cha-gate
```

**A loop that starts on a red build cannot tell its own breakage from the kind it inherited.** If a test goes red mid-round and you have to ask "is that my fix or was that already there", every verdict in that round is shaky.

`/cha-gate` reports numbers, not a word — pass, fail, skip, and **how many test files exited cleanly**. Leave that last one out and the gate runs backwards: if six files crash before asserting anything, the pass count goes *up*.

---

## Next

- [02 — The loop](02-loop.md) — nine steps
- [05 — Second eye](05-second-eye.md) — serialization, quota, pinning
- [03 — Harness tuning](03-harness-tuning.md) — where these defaults came from
