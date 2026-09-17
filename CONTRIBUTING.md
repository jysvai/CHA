# Contributing

This repository documents a method. The method's own rules apply to changes to
it, which makes contributing here slightly unusual. Read this first; it is
short.

## What is wanted

- **A failure this method missed.** The most valuable thing you can send is a
  defect that survived a CHA round, with the round that missed it. That is a
  gap in the five defect classes or in the gate, and it is worth more than a
  feature.
- **A platform this does not work on.** The tools are Node 20+ ESM with no
  dependencies and were developed on Windows. If `mutate.mjs` cannot run your
  suite, or a path handling assumption breaks on your machine, say so with the
  command and its output.
- **Corrections.** If a number in this repo is wrong, or a documented tool
  invocation does not match what the tool actually parses, that is a defect by
  this repo's own definition. Open an issue.

## Three rules for a code change

**1. A claim is not a defect until you have run it.**

An issue that says "this looks wrong" gets adjudicated before it gets fixed —
by you, if you are opening it. Include the command, the input, and the output.
"I read it and it seems incorrect" is a suspicion, which is a fine thing to
open an issue about, but say which one it is.

**2. A red test first, then the fix.**

Write the test that fails for the reason you are about to fix. Run it. Put the
red output in the pull request. A test written after the fix passes for reasons
nobody checked, and afterwards nobody can tell which reason it was.

**3. Every fix gets a mutant.**

Break the fixed line on purpose and confirm a named test goes red:

```bash
node tools/add-mutant.mjs <file> <line> --test <testfile> \
  --what "the meaning this line carries" \
  --then "what a person experiences when it is wrong" \
  --replace "the broken version of the line"

node tools/mutate.mjs --id <id>
```

If it stays green the fix is unguarded, and the next person to touch that file
will delete it without anything noticing.

## Before you open a pull request

```bash
node --check tools/*.mjs
cd examples && node test/size.test.js && node ../tools/mutate.mjs
```

The example sweep must come back `2 잡음/caught · 0 샜음/leaked`. If you changed
`tools/mutate.mjs`, run the example sweep on your platform and paste the output
— that is the only end-to-end check this repository has.

## Diagrams

`docs/diagrams/*.svg` are **generated**. Changing one means editing
`tools/gen-diagrams.mjs` and re-running it — never editing an SVG by hand:

```bash
node tools/gen-diagrams.mjs
```

Each diagram ships twice, light and dark, because GitHub strips `<style>` out of
an SVG so a media query can never fire. A hand-edited dark copy drifts from the
light one and **nobody notices**, because you only ever look at one of them at a
time and the one you are looking at is always fine.

The same command also rewrites the copies inlined in `site/index.html`, between
`<!-- diagram:NAME -->` markers. That page is self-contained on purpose, so it
carries its own copy of each diagram — and a copy nobody regenerates goes stale
without ever looking stale. If a marker is missing the tool writes nothing to the
page and exits non-zero rather than putting the diagram back where it guesses it
went; a page that lost a diagram must not come back green.

Then **open the result in a browser and look at it.** Checking label widths
arithmetically is not enough — it cannot see a connector drawn across a box, and
that is exactly the defect this generator keeps producing. A line routed through
a node strikes out the text inside it while every width check still passes.

The animated loop at the top of the README, `docs/diagrams/loop-anim*.gif`, is
generated too, by a separate tool that photographs each frame with headless
Chrome and stitches the frames with ffmpeg — so it needs both installed:

```bash
node tools/gen-loop-gif.mjs
```

It carries its own copy of the palette, because `tools/gen-diagrams.mjs` writes
files the moment it is imported. Change a colour in one, change it in both. And
**play the GIF** rather than checking a still: a frame that is right on its own
can still be wrong in sequence.

## Numbers

**Every number in this repository is measured.** None of them are estimates,
rounded figures, or illustrative. If you add a number, it has to come with what
produced it. If you cannot source it, leave it out — a sentence without a
number is better than a number nobody can trace.

This applies to the documentation too. `docs/*/09-*` is the numbers page and
nothing enters it that was not measured.

## Writing

- Plain declarative sentences. No marketing voice.
- **Explain why a rule exists by naming the failure it came from.** A rule with
  no failure behind it gets cut, because nobody follows a rule they cannot be
  told the reason for.
- Korean documentation is written as Korean, English as English. Neither is a
  translation of the other, and both are first-class. If you change one, say in
  the pull request whether the other needs the same change — it is fine not to
  do both, but it is not fine to leave the pair silently out of step.

## License

Contributions are accepted under the Apache License 2.0, the same license as
the project. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
