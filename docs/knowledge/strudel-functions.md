---
id: strudel-functions
related: [strudel, comments-and-functions, material, growth-shapes, ideas]
code: [tools/strudel-catalog.mjs, tools/strudel-functions.mjs, tools/strudel-code.mjs, tools/check-strudel.mjs, docs/strudel/functions.json, docs/strudel/coverage.json, docs/strudel/inputs.json, docs/strudel/variety.json]
checks: [npm run check:strudel, npm run catalog:strudel]
---

# Strudel functions: catalog and coverage

## What it is

The app ships one exact version of Strudel. The catalog lists every function of that version, with its parameters and its documentation. The coverage says which of them the code written by the app actually uses.

The catalog exists because many useful functions were never written: the app kept using the same few. Read this note before adding a move to the generator, a growth shape or a radio command. Pick functions from the list below first.

<!-- generated:summary -->
Functions in the shipped Strudel: 610. Written by the app: 68. Never written: 542.
<!-- /generated -->

## How it connects

- [strudel.md](strudel.md) explains the basics; this note is the full list.
- [comments-and-functions.md](comments-and-functions.md): the app's own functions, never named after a Strudel function.
- [material.md](material.md), [growth-shapes.md](growth-shapes.md), [ideas.md](ideas.md): the places where a new function becomes music.

## Options

There are no user options. `npm run catalog:strudel` writes these files when Strudel, the generator or the app functions change, and before a merge to main. It reads the generated code from the shared cache in `.cache/checks/`: only songs and styles that changed are generated again, and everything after a change to the code that writes Strudel (in worker processes, see [checks.md](checks.md#levels-cache-and-workers)):

- `docs/strudel/functions.json`: every function, its synonyms, parameters and description.
- `docs/strudel/coverage.json`: which functions the app writes, counted in songs, live builds, radio songs and the hidden code.
- `docs/strudel/inputs.json`: a hash of everything the catalog reads. `npm run check:knowledge` warns when the code no longer matches it, so a stale list below is never unseen.
- `docs/strudel/variety.json` is written by hand, not generated: notes on the functions useful for variety, and the change that uses them.

The coverage counts a function by its catalog name. The app may write a synonym: `rib` is `ribbon`, `seg` is `segment`, `fm2` is `fmi2`. A function written under any of its names is not listed as unused. One known hole: the code view "one line per track" writes `.pick([...])`, but the coverage does not read that view, so `pick` still shows as unused.

`npm run check:strudel` fails when the generated code calls a function that is not in the catalog, or when an app function takes a Strudel name.

## Example

<!-- generated:unused -->
Useful for variety and not written yet by the app (a function written under any of its names counts as written):

| Function | Why it is useful |
| --- | --- |
| `sometimes` | Seeded variation on some events (an effect, a note up an octave). |
| `sometimesBy` | Like sometimes, with a chance that can follow a radio curve. |
| `almostNever` | Rare fills and glitches. |
| `every` | A change every n cycles: fills, turnarounds. |
| `lastOf` | A fill on the last cycle of a phrase. |
| `iter` | Rotates a pattern each cycle: one idea, many bars. |
| `chooseCycles` | Seeded choice between ideas, one per cycle. |
| `off` | A shifted, transformed copy of a line (echoes, harmonies). |
| `ply` | Repeats each event: a build-up move. |
| `perlin` | Smooth seeded movement for filters and levels. |
| `pick` | Picks named ideas by a pattern of indices. |
| `duck` | Sidechain ducking of one bus by another, instead of written gain steps. |
| `lpenv` | Filter envelope depth: a filter that opens per note. |
| `fm3` | Third FM operator. |
| `fm4` | Fourth FM operator. |
| `fm5` | Fifth FM operator. |
| `fm6` | Sixth FM operator. |
| `fm7` | Seventh FM operator. |
| `fm8` | Eighth FM operator. |
| `penv` | Pitch envelope: drops, zaps, risers. |
| `scrub` | Plays a sample from a position: textures and stutters. |
| `ir` | Impulse response reverb from a sample: rooms that differ by style. |
| `S$:` | Line label (solo), not a function: a section built in solo before the others come back. |
<!-- /generated -->

<!-- generated:written -->
Written by the app today:

`add`, `all`, `analyze`, `anchor`, `arp`, `attack`, `bank`, `beat`, `chord`, `clip`, `crush`, `decay`, `degradeBy`, `delay`, `delayfeedback`, `delaysync`, `distort`, `distortvol`, `early`, `fmdecay`, `fmh`, `fmh2`, `fmi` (as `fm`), `fmi2` (as `fm2`), `fmsustain`, `fmwave`, `gain`, `hpf`, `irand`, `jux`, `late`, `lpf`, `lpq`, `mask`, `mode`, `mul`, `n`, `note`, `orbit`, `pan`, `phaser`, `phaserdepth`, `postgain`, `range`, `register`, `release`, `ribbon` (as `rib`), `room`, `roomsize`, `s`, `scale`, `segment` (as `seg`), `setcpm`, `slice`, `slow`, `speed`, `stretch`, `struct`, `sub`, `superimpose`, `sustain`, `swingBy`, `transpose`, `tremolodepth`, `tremolosync`, `velocity`, `voicing`, `vowel`
<!-- /generated -->

## Where to read more

- [docs/STRUDEL-FUNCTIONS.md](../STRUDEL-FUNCTIONS.md): the readable catalog, with descriptions, coverage and variety notes.
- The official Strudel reference: https://strudel.cc/learn/
