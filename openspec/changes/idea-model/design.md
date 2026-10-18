## Context

See proposal.md for the motivation. Today:

- Presets in `src/music.js` are written-out material: beat templates (`BASS.rolling` is `['[~ x x x]', '[~ x]']`), 16th riffs as semitone strings, arp orders over the four notes of `CHORDS[c].arp`, hook degrees, drum rows of 16 `x.` characters.
- `sceneLayers` expands them per bar (`rhythm()`, `beatGrid`, `stepGrid`, `fitTokens`) and writes the result, so a bass becomes `.struct("[~ x x x] [~ x x x] [~ x x x] [~ x x x]")` and an arp becomes one bracket of 16 note names per chord.
- `src/song/idiom.js` shortens finished code for the Switch profile only (drums to `bd*4`, note groups to cells, `.arp()` for arpeggios). It is text in, text out.
- Crescendo (`src/song/crescendo.js`) thins `rows`, `notes` and `steps` (`patternVariants`), and the natural rules (`rules.natural`, Switch) already grow an arp from one note.
- `tools/check-compact-code.cjs` already compares the events Strudel makes for two codes (`queryArc`, sample lengths ignored for drum banks). The event check of this change reuses that comparison.

## Goals / Non-Goals

**Goals:**

- One idea object per part, readable in JSON and in code, that the compiler, Crescendo, the energy measure and the director can all use.
- Same events for every existing song, proved by a check, not by listening alone.
- A simple first set of idea kinds, enough for the material generator (#71) and the growth shapes (#64).

**Non-Goals:**

- No idea editor in Compose. The step row still edits written steps (see D7).
- No new openings or pace for the live build: that is `growth-shapes`. This change only gives an idea its ladder of forms.
- No composing of new material: that is `material-generator`.
- No new Strudel helper functions registered in the page; ideas compile to functions Strudel ships (`struct`, `beat`, `n`, `scale`, `chord`, `voicing`, `arp`, `add`, `sub`, `seg`, `rib`, `irand`).

## Decisions

### D1. The idea is an optional `idea` field of a pattern

```json
"patterns": {
  "A": { "preset": "rolling" },
  "B": { "idea": { "rhythm": "[~ x x x]*4" } },
  "C": { "idea": { "from": "bline", "sub": 14, "rhythm": "[x x ~ x]*4", "variants": [{ "add": "0 0 4 0 5" }] } }
}
```

Fields of an idea (all optional, at least one):

| Field | What it says | Example |
| --- | --- | --- |
| `rhythm` | a cell with its repetition, the onsets of the part | `"[~ x x x]*4"` |
| `beat` | sequencer steps on a grid, per drum row for drums | `{ "bd": "0,4,11", "grid": 16 }` |
| `degrees` | scale degrees (hook, generated bass and lead) | `"<0 2 4 ~>"` |
| `scale` | mode for the degrees; the key comes from the section | `"phrygian"` |
| `chords` | chord names with qualities | `"<Am7 F^7>"` |
| `voicing` | `{ "anchor": "c5", "mode": "below" }`, both optional | |
| `index` | positions inside the voiced chord (arp), or a random source | `"[0 1 2 3]*4"` |
| `random` | `{ "fn": "irand", "max": 8, "seg": 16, "seed": 3, "cycles": 2 }` | |
| `from` | name of a shared progression of the song | `"bline"` |
| `add`, `sub` | transposition in degrees or semitones, a number or a pattern | `14`, `"<0 12 0 0>*4"` |
| `variants` | prepared variants, each one chain function and its argument | `[{ "add": "0 0 4 0 5" }]` |

The song gets an optional `shared` map: `{ "bline": "<[3 5@15] [3@12 0@4] [5 7@15] 7>" }`. A shared progression is degrees by default, or chord names when it starts with a letter.

Why: the song format already stores patterns as small JSON objects with mini-notation strings (`notes`, `steps`, `rows`). An `idea` field adds to that without touching old fields, so old songs load unchanged and the format stays version 2.

Alternatives: storing a Strudel expression per pattern (like the `code` track) would be the shortest, but the compiler, Crescendo and the energy measure could not read it back, and the validator could not check it. A new format version 3 was rejected: nothing old changes meaning.

### D2. Presets become ideas, by name

Each preset table entry gets an idea next to its label, and `sceneLayers` reads the idea instead of the written template:

| Table | Idea |
| --- | --- |
| `BASS` beat templates | `rhythm` cell per beat, repeated for the beats of the bar (`[~ x x x]*4` in 4/4) |
| `BASS` riffs | `rhythm` from the riff onsets plus `add` with the semitone line |
| `ARPS` | `index` cell (`"0 1 2 3"` played `*2` at speed 16) over the chord stacks of `CHORDS` |
| `HOOKS` | `degrees` as written today |
| `PADS`, `GUITAR_PATTERNS` | `rhythm` cell, or a riff as for bass |
| `GROOVES` | `beat` per row, or a cell when shorter (`bd*4`, `[~ hh]*4`) |
| `TEX_RHYTHMS` | `rhythm` and a `random` source for `n` where today it is `irand(16)` |

Odd meters: the beat template stays the source of truth for 3/4, 5/4 and 7/8; a cell with `*n` is written only when the bar is whole beats of the cell, as `beatGrid` does today. Exact pitches stay exact: an arp of an existing preset compiles to `note("<[a3,c4,e4,a4] …>").arp("[0 1 2 3]*2")`, with the chord stacks from `CHORDS`, because Strudel's own `voicing()` picks other octaves for some chords (`C` in our table is `g3 c4 e4 g4`). Chord names with `voicing()` are used only by ideas that ask for them (new material, D1 `chords`).

Alternatives: keep presets written out and shorten the finished code with `idiom.js` for every profile. Rejected: the result is still text, the director and Crescendo still work on expanded material, and a variant cannot be prepared.

### D3. One idea writer, used by every profile

A new module `src/song/ideas.js` holds three pure functions:

- `writeIdea(idea, ctx)`: the code of an idea for one clip (ctx: meter, key, chords of the section, start bar, track type), in its shortest exact form.
- `expandIdea(idea, ctx)`: the written form (`steps`, `notes`, `rows`) the idea plays, for Crescendo thinning, `channelSteps`, the energy measure and the step row in Compose.
- `ideaLadder(idea, ctx, n)`: n simpler forms for live build growth (D5).

`sceneLayers` calls `writeIdea` for every pattern, preset or not, so Classic, Crescendo and Live coder all get the shorter code. The rules of `idiom.js` move into `writeIdea`; `idiomatic()` stays for code it did not write (hand code, older versions) and becomes a no-op on code that is already short.

Why every profile: the sound does not change (D6 proves it), and two code shapes for the same song would double the snapshots and the typing plans to maintain.

### D4. Shared progressions as a `const`

`compileSong` writes one line per shared progression, after the section lanes: `const bline = "<[3 5@15] [3@12 0@4] [5 7@15] 7>"`. A track that reads it writes `n(bline.sub(14))` (degrees) or `chord(bline)` (names). The name is checked against JavaScript reserved words and the names the compiler uses (`section1`, `clip1`, `SECTIONS`, `TEMPO`). Clips that start inside a section rotate the progression with `.late(start)` as chords are rotated today.

### D5. Live build growth of an idea

`patternVariants` keeps its current behaviour for `rules = {}` (Crescendo) and for patterns without an idea. With `rules.natural` (Live coder) and an idea, it returns `ideaLadder` forms, named `A~1`, `A~2`… as today, so build steps, seek, typing and export work unchanged.

Ladders, simplest first:

| Idea | Ladder |
| --- | --- |
| `rhythm` cell | one hit per beat (`x*4`), then the strongest onsets of the cell, then the cell |
| `beat` | the first step, then the steps on beats, then all steps |
| `degrees` | the first degree held, then the cell without its alternation, then as written |
| `chords` + `index` | the chord held, then indices `0 2` (root and fifth), then as written |
| `random` | the source as written from the first form (one idea), with a shorter `seg` first when the source drives a rhythm |
| `from` + `add` | the progression without the `add`, then with it |

Prepared variants are not part of the ladder: they wait for a `variant` step.

### D6. Build step `variant`

`{ "at": 64, "variant": { "track": "bass", "use": 0 } }` switches on variant 0; `"use": null` switches it off. `stateAt` applies it like `pattern` steps, so seek and export land on the right state. The compiler writes a switched-on variant as active chain code and the others as `// .add("…")` lines under the track, the same way natural growth writes commented functions today (`tr.commented`).

### D7. Compose and the step row

The pattern panel shows an idea pattern with its step row filled from `expandIdea`. Editing the row writes `steps` (or `notes`) and removes the idea from that pattern, with a short notice ("written out"). Changing the preset clears both, as today. A small text line under the row shows the idea as code, read only.

### D8. The event-equivalence check

`tools/check-ideas.cjs` (dev server, like `check-compact-code.cjs`) evaluates, for every song in `songs/` and `songs/examples/`, the code from the saved snapshot `tests/snapshots/code/<id>.strudel` taken before this change and the new compiled code, queries the events over the whole song and compares onset, length and every value. Drum bank samples compare without length; note names and MIDI numbers of the same pitch are equal; a velocity of 1 equals no velocity. The old snapshots are copied to `tests/snapshots/code-before-ideas/` in the first commit so the check keeps a baseline after `npm run snapshot:code` rewrites the main ones.

## Risks / Trade-offs

- [A short form with a different event length, for example `bd*4` gives quarter-note events] → drum samples compare without length (they play to their end); melodic notes must match length, so a melodic cell is shortened only when its note lengths stay equal.
- [Odd meters break a `*n` cell] → the writer uses a cell only when the bar holds whole cells, otherwise the beat template path of today.
- [Thinning an idea in Crescendo gives other steps than thinning the written pattern] → Crescendo always thins `expandIdea` output, which equals the written pattern; `npm run check:crescendo` must pass without new fixtures.
- [Typing plans and video frames change because the code text changes] → expected; `npm run check:typing` and `check:live-code` are rerun and their fixtures rewritten only where the text changed, never the sound.
- [The Live coder profile sounds different] → intended for that profile only; its songs are listened to in the owner's test; `CRESCENDO_VERSION` goes up because natural growth steps change.
- [Chord names that Strudel reads differently from our table] → existing material keeps note stacks (D2); new material using `voicing()` is checked by ear in `material-generator`.

## Migration Plan

1. Copy the current code snapshots to `tests/snapshots/code-before-ideas/`.
2. Add ideas to the presets and the writer; run the event check until every song matches.
3. Rewrite `npm run snapshot:code` and say why in the commit (shorter code, same events).
4. Rollback: the `idea` field is optional and old fields are untouched, so reverting the writer restores today's code.

## Open Questions

- **Where the event check runs.** Recommended: in the browser through the dev server, reusing the `check-compact-code.cjs` setup, because evaluation needs the transpiler and the loaded functions. Alternative: Node with `@strudel/core`, `mini` and `tonal`, faster but it may miss functions that load with the REPL. Either choice keeps the specs and tasks.
- **`beat` or a written cell for drum rows with 3 to 5 hits.** Recommended: the shorter text wins, a cell on a tie; `beat` needs `strudel-catalog` to confirm it ships. Can be tuned after the first snapshots.
- **Name of the step action.** Recommended: `variant` with `use`. `prepare` or `uncomment` read worse in JSON.
