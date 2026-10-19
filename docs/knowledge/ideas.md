---
id: ideas
related: [songs, strudel, live-build, material, patterns, decisions]
code: [src/song/ideas.js, src/song/compile.js, src/music.js]
checks: [npm run check:ideas, npm run check:songs, npm run check:code]
---

# Ideas

## What it is

An idea is a part written as a small musical thought, the way a live coder writes it. A repeated cell, sequencer steps, scale degrees, chord names with a voicing, a seeded random source, a shared line, prepared variants.

The compiler writes an idea in its shortest exact form. A rolling bass is `.struct("[~ x x x]*4")`, not sixteen written steps. The sound is the same as the written-out form.

Every preset is stored as an idea too.

## How it connects

- **Songs.** A pattern holds `idea` next to or instead of `preset`, `steps` or `notes` ([songs.md](songs.md)).
- **Live build.** In the Live coder growth an idea grows from its simple form to its full form ([live-build.md](live-build.md)).
- **Material.** The generator composes ideas, with these fields only ([material.md](material.md)).
- **Patterns.** Built-in and saved patterns are ideas ([patterns.md](patterns.md)).
- **Compose.** Editing the step row of a pattern writes the steps out and removes its idea.

## Options

<!-- generated:idea-fields -->
| Track type | Idea fields |
| --- | --- |
| `drums` | `beat` |
| `bass` | `rhythm`, `per`, `half`, `beat`, `degrees`, `scale`, `from`, `add`, `sub`, `variants` |
| `guitar` | `rhythm`, `per`, `half`, `beat`, `chords`, `voicing`, `add`, `hold`, `variants` |
| `arp` | `rhythm`, `per`, `half`, `index`, `chords`, `voicing`, `random`, `from`, `add`, `sub`, `hold`, `variants` |
| `hook` | `rhythm`, `per`, `half`, `degrees`, `scale`, `from`, `add`, `sub`, `random`, `variants` |
| `pad` | `rhythm`, `per`, `half`, `beat`, `chords`, `voicing`, `from`, `add`, `hold`, `variants` |
| `texture` | `rhythm`, `random`, `variants` |
<!-- /generated -->

- `rhythm`: where notes start in a bar, `x` plays and `~` rests.
- `per`: `"beat"` makes `rhythm` one cell per beat, in any meter.
- `half`: with `per`, the cell for a half beat in 7/8.
- `beat`: sequencer steps on a grid; drums have one list per row.
- `degrees`: scale degrees from the key note.
- `scale`: the mode of the degrees; the key comes from the section.
- `chords`: chord names, such as `<Am7 F^7>`.
- `voicing`: `anchor` and `mode` of the voiced chords.
- `index`: positions inside a voiced chord, for an arpeggio.
- `random`: a seeded source (`irand`, `rand`, `perlin`) with `seed` and `cycles`.
- `from`: the name of a shared progression of the song.
- `add` and `sub`: a transposition, a number or a pattern.
- `hold`: hold the chord for the bar.
- `variants`: prepared chain calls, commented out until a `variant` step switches one on.

Randomness is always seeded. It only picks indices, sample slices or effect values. Free melody notes are never random.

## Example

<!-- generated:example-idea -->
From the Ideas example (`songs/examples/04-ideas.json`). The bass pattern as an idea, on the shared line `bline`:

```json
{"preset":"rolling","idea":{"from":"bline","sub":14,"rhythm":"[x x ~ x]*4","variants":[{"add":"0 0 4 0 5"}]}}
```

The compiled code (Classic view, first section):

```js
const bline = "<[0 ~ 0 3] [5 ~ 3 ~] [0 ~ 0 3] [-2 ~ 0 ~]>"
$: bline.sub(14) // .add("0 0 4 0 5")
  .n().scale("A4:minor").struct("[x x ~ x]*4")
  .s("sawtooth").lpf(sine.range(360, 1440).slow(8)).lpq(8)
  .decay(.12).sustain(0).gain(0.7).mask(section1).velocity(section1).orbit(2).analyze("bass")
```

The drums of the second section as a beat idea:

```json
{"idea":{"beat":{"bd":"0,4,8,12","cp":"4,12","hh":"2,6,10,14","oh":"14","grid":16}}}
```

```js
$: s("bd*4").bank("RolandTR909").gain(0.85).mask(section2).velocity(section2).orbit(1).analyze("kick")
$: s("[~ cp]*2").bank("RolandTR909").gain(0.68).mask(section2).velocity(section2).orbit(1).analyze("snare")
$: s("[~ hh]*4").bank("RolandTR909").gain(0.43).mask(section2).velocity(section2).orbit(1).analyze("hats")
$: s("~!7 oh").bank("RolandTR909").gain(0.38).mask(section2).velocity(section2).orbit(1).analyze("hats")
```
<!-- /generated -->

## Where to read more

- [docs/SONG-FORMAT.md](../SONG-FORMAT.md#ideas): the fields with their code, and [shared progressions](../SONG-FORMAT.md#shared-progressions).
- [docs/COMPOSING.md](../COMPOSING.md#example-4-parts-as-ideas): the Ideas example.
- [docs/VARIETY.md](../VARIETY.md#one-root): why parts became ideas.
