---
id: material
related: [ideas, styles, radio, radio-commands, patterns, growth-shapes]
code: [src/material/index.js, src/endless/material.js, src/song/rack.js]
checks: [npm run check:material, npm run check:endless]
---

# Material generator

## What it is

The material generator composes new parts from a seed, a style and an energy. It writes melodies, basslines, arpeggios, chords, grooves and sounds. Every part is an idea of the song format, so it compiles, grows in a live build and is measured like a preset.

The seed picks among rules, never note by note in a free range. The same seed and inputs give the same part. Each part keeps `why`, the list of rules it used.

## How it connects

- **Ideas.** The output is an idea ([ideas.md](ideas.md)).
- **Styles.** Each instrument of a recipe has a `material` field: source, share, families and rules ([styles.md](styles.md)).
- **Radio.** The director asks where each track's material comes from ([radio.md](radio.md)). Vary, Add and More complex compose on air ([radio-commands.md](radio-commands.md)).
- **Compose.** [Compose a part] in a track panel writes a new pattern with a number and an energy. With a preset, [Keep the rhythm] and [Keep the notes] vary it.
- **Patterns.** [New] in the Patterns tab composes one ([patterns.md](patterns.md)).
- **Growth shapes.** The `metamorphosis` development rewrites a song with parts of a sibling style ([growth-shapes.md](growth-shapes.md)).

**Kinds.** `melody` (a cell of degrees plus a progression summed over the bars), `bass` (chord roots with a rhythm cell), `arp` (indices into voiced chords), `chords` (a voiced pad or guitar power chords), `drums` (steps from a family), `sound` (a wave and an optional FM patch).

**Energy.** Low energy gives few onsets in a small range. High energy gives more onsets and a wider range.

## Options

<!-- generated:material-sources -->
Material (it: Materiale): Where the parts of the songs come from: the patterns as written, varied patterns, parts composed by the generator, or as each style says. With varied patterns, complexity sets how much they change: 0 keeps them as written.

| Source | Name |
| --- | --- |
| `patterns` | Patterns (it: Pattern) |
| `varied` | Varied (it: Variati) |
| `composed` | Composed (it: Composti) |
| `mix` | Mix (it: Misto) |
<!-- /generated -->

- `patterns`: the library as written, no mutation, nothing composed.
- `varied`: presets varied; complexity sets how much.
- `composed`: parts composed by the generator.
- `mix`: each recipe decides, with its share per instrument. The default.

The source is a session option ([radio.md](radio.md)). At complexity 0 the director keeps presets only, unless the source is `composed`.

## Example

Compose a bassline in Node:

```json
{"kind": "bass", "seed": "demo", "harmony": {"key": "A", "mode": "minor", "chords": "epica"}, "meter": "4/4", "energy": 0.6}
```

`compose('bass', { seed: 'demo', style, harmony, meter: '4/4', energy: 0.6 })` returns `{ idea, settings, rack, why, stats }`. Vary on the radio uses the same function; its result is in [radio-commands.md](radio-commands.md#example).

## Where to read more

- [docs/ENDLESS.md](../ENDLESS.md#material): the rules per kind, FM patches, the director's use.
- [docs/STYLES.md](../STYLES.md#material): the `material` field of a recipe.
- [docs/VARIETY.md](../VARIETY.md): why the generator exists.
