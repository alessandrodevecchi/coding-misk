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
- **Compose.** [Compose a part] in a track panel writes a new pattern with a number and an energy. With a preset, [Keep the rhythm] and [Keep the notes] vary it. On a guitar track, [Guitar] picks Riff (`riff: true`) or Chords (`riff: false`), remembered while the page is open.
- **Pads in the radio.** Every built-in style with a pad composes it in about a third of its songs (`share` 0.3, rule `style`): the song's own chords voiced near `c4`, held or as stabs. The rest keep the style's pad presets.
- **Patterns.** [New] in the Patterns tab composes one ([patterns.md](patterns.md)).
- **Growth shapes.** The `metamorphosis` development rewrites a song with parts of a sibling style ([growth-shapes.md](growth-shapes.md)).

**Kinds.** `melody` (a cell of degrees plus a progression summed over the bars), `bass` (chord roots with a rhythm cell), `arp` (indices into voiced chords), `chords` (a voiced pad or guitar power chords), `drums` (steps from a family), `sound` (a wave and an optional FM patch).

**Guitar riffs.** `compose('chords', { type: 'guitar', riff })`: `riff: true` writes a riff every time (16th slots, steps of `RIFF_STEPS` over the power chord, sparser at low energy), `riff: false` power chords only. Left out, a riff half the time with more energy, with the same random draws as before the option: the radio, songs and fixtures do not move (`check:material` keeps a digest).

**Energy.** Low energy gives few onsets in a small range. High energy gives more onsets and a wider range.

**Kick variants (`four-floor`).** The kick keeps step 0 and plays one of five variants on the meter's beats (`KICK_VARIANTS`, `kickVariants(meter)` and `kickRow(variant, meter)` in `src/material/drums.js`): `straight` (every beat), `pickup` (and the bar's last 16th), `push` (and the 16th two before the bar's end), `rolling` (and the 16th before each back beat), `broken` (the last beat moved to its off-beat 8th, or left out past the bar). A variant equal to an earlier one in the meter is left out, so 7/8 has four. The variant is the family's first draw, with weights per energy band: below 0.33 straight 0.45, pickup 0.2, push 0, rolling 0.1, broken 0.25; up to 0.66 straight 0.3, pickup 0.25, push 0.15, rolling 0.15, broken 0.15; above 0.2, 0.2, 0.25, 0.25, 0.1. `avoidKicks` (kick rows as `x`/`.` strings) leaves those variants out, unless it lists all of them; the other families ignore it and draw as before for the same seed. `why` names the variant (`four on the floor, pickup`) and `stats.kick` holds it. Rows have no velocity: a soft ghost kick needs a change to the song format first ([decisions.md](decisions.md)).

**«+ kick» and «+ beat».** On air the new kick or beat composes first (`airGroove` in `src/endless/material.js`): up to 8 grooves from the style's drum material at the phrase's energy, the kicks already held avoided, then the style's built-in grooves ([radio-commands.md](radio-commands.md)).

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
