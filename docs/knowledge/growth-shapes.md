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

**Typing never rushes.** When development or pace is automatic and the drawn shape would make human typing rush a step of the growth, another shape is tried (shape-search). A value named by the song or in Compose is never replaced.

**The search.** A shape is judged only on the steps of its growth, before the written part starts (`crescendo.growth`): the section changes and the tracks that enter later with their first clip are the same for every shape, so they never count. The drawn shape is tried first, then its less detailed variants (detail 2, 1, 0); then the other candidates (other developments with the drawn pace, by type with the other paces) and their less detailed variants, in a weighted draw without replacement from the song's seed, with the style's or artist's weights (a variant weighs half its shape). The first shape with no rushed growth step is kept. At most 8 shapes are measured; when none of the first 8 meets the target the search goes on up to 16, then keeps the one whose growth is rushed least (the rushed load). A variant that grows the same as its shape is skipped and not counted. The 8 is the setting Growth shapes tried (Settings, Advanced, 4 to 32, [settings.md](settings.md)), read only by Compose: the radio, the song cards and the Node checks use 8, so sessions, durations and fixtures never depend on a browser.

**Search settings (Settings, Advanced, read only by Compose).** Try all growth shapes lifts the cap (at most 32 candidates today: 8 shapes with their 3 less detailed variants, 28 on luci-rosse; more when shapes are added; the Advanced card shows the counts from `shapeCounts`); its Keep choice is the first good one (default: the first shape in the order with no rushed growth step, the search stops there, so Try all with the fixed order is the search before `SHAPES_VERSION` 4) or the best one (every shape measured, the shortest whole song with no rushed growth step, else the one rushed least). Random order off tries the shapes in the fixed order before `SHAPES_VERSION` 4 (developments by weight, by type last, then the other paces, then the same with detail 2, 1, 0). Long song from (minutes, 5 to 60, default 15): when the whole grown song (growth and written part) with the kept shape is longer, every shape is measured and the shortest whole song with no rushed growth step is kept, in Compose and in the radio (which uses 15). Each value enters the Compose growth key; the defaults are not stored. `npm run growth:probe -- <song> --all --keep best --fixed --long 10` tries them without a browser.

**Free duration.** A rushed growth step that a unit owns gets the bars it needs before that unit, at most 32 bars a round and six rounds; the growth is made again after each round. A step that needs more stays rushed, and the counters say why (`npm run growth:probe`): `limit` (more than 32 bars in one round), `rounds` (the six rounds are used up), `not-unit` (no unit owns it), `fitted` (the fitted duration adds no bars). On kellerlicht a cutoff sweep revealed as a literal list of over a hundred values took over two minutes to type and made the growth long (675 bars, 20:27, at `SHAPES_VERSION` 4). Since `SHAPES_VERSION` 5 such lists are typed as ramps (below), and kellerlicht grows to 440 bars, 13:20. Since `SHAPES_VERSION` 6 the typing never anchors its line alignment on blank lines (`lineDiff` in `src/song/typing.js`), so a track after one that changed its line count is edited, not deleted and typed again. Since `SHAPES_VERSION` 7 a detour that rewrites a melody turns its halves by whole mini-notation steps (`rotateNotes` in `src/song/coder.js`): split on spaces alone it cut `<[…] […]>` into a parse error. The shapes drawn stay those of version 5 (`SHAPES_SEED`, below), so kellerlicht still grows to 440 bars, 13:20.

**Long lists as ramps.** In the code of a Live coder growth a mini-notation list of 16 or more plain numbers (repeats `!n` expanded) that moves linearly per bar, a written sweep rotated to its clip's start, is written `saw.range(a, b).slow(n).segment(1)`, with `.early(k)` when the ramp starts inside the list (`src/song/ramps.js`, used by `src/live/live-code.js`). Every bar keeps the list's value (within 0.01, the list's rounding). The levels the hidden mixer owns (`gain`, `postgain`, `velocity`, `mask`) and lists that are not linear stay as written; Classic and Crescendo code never change. `npm run check:ramps` compares every hap of the steps that type a ramp with the same code with the lists, in Strudel in Node.

**Version.** `SHAPES_VERSION` in `src/song/shapes.js` goes up when an intended change moves the Live coder fixtures; saved growths, card lengths and saved sessions carry it, so a new version grows them anew. The shape draws (the shape, the search order, the growth stream) are salted with `SHAPES_SEED`, fixed at 5, so a version raised for a rule fix keeps every song's drawn shapes. Change `SHAPES_SEED` only when new draws are wanted, and say so in the commit. `SHAPES_VERSION` 8 (reused-lines, `#85`): the written part keeps lines muted for later, beside the pattern that replaced them, edited while muted (`src/live/written-plan.js`), and the typing copies a long line from earlier code, in the growth too; every built-in song keeps the shape it kept at version 7; two grow shorter with the free duration, as their growth types less (prova-drum-and-bass 389 to 387 bars, next-chapter 213 to 208).

## Options

<!-- generated:growth-shapes -->
**Opening (it: Apertura)** (`opening`): How it starts: one kick that grows (Slow), the full kick, silence while the first line is typed, a broken beat, a filtered kick that opens, an arpeggio or a melody, a pad or a drone, the voice track, a written base kept muted and switched on line by line, two tracks already playing in solo.

| Value | Name | Default weight |
| --- | --- | --- |
| `slow` | Slow (it: Lenta) | 2 |
| `full-kick` | full kick (it: cassa intera) | 1 |
| `typed` | from silence (it: dal silenzio) | 1 |
| `broken` | broken beat (it: ritmo spezzato) | 1 |
| `filtered` | filtered kick (it: cassa filtrata) | 1 |
| `melodic` | arpeggio or melody (it: arpeggio o melodia) | 1 |
| `pad` | pad or drone (it: pad o bordone) | 1 |
| `voice` | voice track (it: voce traccia) | 0.5 |
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
