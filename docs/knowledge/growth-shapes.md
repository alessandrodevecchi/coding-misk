---
id: growth-shapes
related: [profiles, live-build, styles, voice, decisions]
code: [src/song/shapes.js, src/song/crescendo.js, src/song/coder.js, src/live/typing-load.js]
checks: [npm run check:crescendo, npm run check:typing]
---

# Growth shapes

## What it is

A growth shape says how a Live coder build opens, how fast it grows and in which order. It has three parts: an opening, a pace and a development.

Shapes apply only with the Live coder profile and its natural growth. Classic and Crescendo never use them.

## How it connects

- **Profile.** The controls `opening`, `pace` and `development` are profile controls ([profiles.md](profiles.md)). Each is `auto` or one value.
- **Song.** A song's `growthShape` names some parts ([songs.md](songs.md)).
- **Style.** A recipe's `growthShapes` gives weights per part ([styles.md](styles.md)).
- **Voice.** The `voice` opening needs a spoken track with an opening line ([voice.md](voice.md)).
- **Material.** The `metamorphosis` development rewrites lines with parts composed for another style of the same family ([material.md](material.md)).

**Who chooses.** For each part: the Compose control, else the song, else the style weights, else a draw from the song's seed. Values the song cannot play are left out before any draw. The same song always draws the same shape.

**On air.** A radio song has no Compose controls: the song, then the artist's `growth` weights, then the style, then the seed. The metamorphosis is never drawn (the next song is planned from the last section's tempo and key). The `typed` opening only follows a `cut` or an `interlude`, or opens a session; the `voice` opening still needs a spoken opening line ([radio.md](radio.md)).

**Typing never rushes.** When development or pace is automatic and the drawn shape would make human typing rush a step, the next development by weight is tried. A value named by the song or in Compose is never replaced.

**Version.** `SHAPES_VERSION` in `src/song/shapes.js` goes up when an intended change moves the Live coder fixtures. The seed name carries it, so a new version draws anew.

## Options

<!-- generated:growth-shapes -->
**Opening (it: Apertura)** (`opening`): How it starts: one kick that grows (Slow), the full kick, silence while the first line is typed, a broken beat, a filtered kick that opens, an arpeggio or a melody, a pad or a drone, a voice, a written base kept muted and switched on line by line, two tracks already playing in solo.

| Value | Name | Default weight |
| --- | --- | --- |
| `slow` | Slow (it: Lenta) | 2 |
| `full-kick` | full kick (it: cassa intera) | 1 |
| `typed` | from silence (it: dal silenzio) | 1 |
| `broken` | broken beat (it: ritmo spezzato) | 1 |
| `filtered` | filtered kick (it: cassa filtrata) | 1 |
| `melodic` | arpeggio or melody (it: arpeggio o melodia) | 1 |
| `pad` | pad or drone (it: pad o bordone) | 1 |
| `voice` | voice (it: voce) | 0.5 |
| `muted-base` | muted base (it: base muta) | 1 |
| `mid-set` | mid-set (it: a metà set) | 1 |

**Pace (it: Velocità)** (`pace`): How many changes in the first minute. Slow: as before, sparse steps and long pauses. Medium: a step every 10 to 15 seconds. Fast: a step about every 8 seconds, small moves. With medium and fast the kick is whole within the first minute. The typing never rushes: a step that takes long to type comes later.

| Value | Name | Default weight |
| --- | --- | --- |
| `slow` | slow (it: lenta) | 1 |
| `medium` | medium (it: media) | 2 |
| `fast` | fast (it: veloce) | 2 |

**Development (it: Sviluppo)** (`development`): In which order it grows. By type: drums, bass, pad, then the rest. As written: in the order the tracks come in the song. Masks: each instrument comes in, leaves and varies with its own mask. Parameters only: all come in at once, then filters, density, reverb and delay grow. Second section: new lines play alone with S$:, then all play. Metamorphosis: the whole song changes tempo, key and style, rewriting its lines one at a time.

| Value | Name | Default weight |
| --- | --- | --- |
| `by-type` | by type (it: per tipo) | 2 |
| `as-written` | as written (it: come scritto) | 2 |
| `masks` | masks (it: maschere) | 1 |
| `parameters` | parameters only (it: solo parametri) | 1 |
| `second-section` | second section (it: seconda sezione) | 1 |
| `metamorphosis` | metamorphosis (it: metamorfosi) | 0.5 |
<!-- /generated -->

What each opening needs: `slow` and `broken` need drums. `full-kick` needs a kick. `filtered` needs a kick whose cutoff is free. `melodic` needs an arp, hook or guitar. `pad` needs a pad or texture. `muted-base` and `mid-set` need three tracks or more. `typed` always works.

What each development needs: `masks` and `second-section` need two tracks or more. `metamorphosis` needs a style with siblings in its family and some material to rewrite.

## Example

A song that always opens on the full kick and grows fast:

```json
{"growthShape": {"opening": "full-kick", "pace": "fast"}}
```

Its development still comes from the style weights or the seed. The shape drawn for the Ideas example, with one step before and after, is in [live-build.md](live-build.md#example).

## Where to read more

- [docs/COMPOSING.md](../COMPOSING.md#growth-shapes): every opening, pace and development in detail, moves and second thoughts.
- [docs/VARIETY.md](../VARIETY.md): why shapes exist.
- [openspec/changes/growth-shapes/](../../openspec/changes/growth-shapes/): the change with its design and open questions.
