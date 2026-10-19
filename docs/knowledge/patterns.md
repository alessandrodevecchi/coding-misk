---
id: patterns
related: [ideas, material, radio, styles, library, comments-and-functions]
code: [src/library/patterns.js, src/library/patterns-tab.js, src/music.js]
checks: [npm run check:patterns]
---

# Patterns

## What it is

The Patterns tab in the Groove Lab plays every built-in preset as a pattern, and keeps the user's own. A pattern is one part: a melody, a bassline, an arpeggio, a chord rhythm, a groove or a riff.

Each pattern plays in a loop: a temporary song of four bars with its sound, a key, a progression, a tempo and, for basslines and riffs, a simple beat under it.

## How it connects

- **Ideas.** Built-in patterns are the presets of `src/music.js`, each stored as an idea ([ideas.md](ideas.md)).
- **Material.** [New] in the detail composes a part of the same kind with the generator ([material.md](material.md)).
- **Compose.** Save as pattern takes a track's pattern with the context of its first section. A listen button next to a track's preset opens it here. Add to song puts a pattern on the song open in Compose.
- **Styles.** A style sheet lists the presets it uses; each opens here ([styles.md](styles.md)).
- **Radio.** Saved patterns join the director's pool for the styles of their tags, or every style ([radio.md](radio.md)). Swap picks among them ([radio-commands.md](radio-commands.md)).
- **Code.** The loop is written with the technical functions preset of the current profile ([comments-and-functions.md](comments-and-functions.md)).
- **Backup.** Saved patterns are in the backup ([library.md](library.md)).

## Options

<!-- generated:pattern-kinds -->
| Kind | Track type |
| --- | --- |
| `melodies` | `hook` |
| `basslines` | `bass` |
| `arpeggios` | `arp` |
| `chords` | `pad` |
| `grooves` | `drums` |
| `riffs` | `guitar` |
<!-- /generated -->

Bass riffs count as `riffs` too. In the detail: sound, key, progression, mode, tempo, meter and the beat under the pattern. They change from the next bar without stopping.

A saved pattern keeps: `name`, `kind`, `type`, `pattern`, `sound`, `settings`, `context` (key, chords, meter, bpm, mode), `styles`, `source` (`compose` or `generated`), `seed` and `why` for generated ones, `created`. Browser key: `coding-misk-patterns`.

## Example

<!-- generated:example-pattern -->
Save as pattern on the arpeggio of the Ideas example gives this pattern (main fields):

```json
{"name":"arp · Ideas","kind":"arpeggios","type":"arp","pattern":{"idea":{"chords":"<Am7 F^7 C^7 G7>","voicing":{"anchor":"c5","mode":"below"},"random":{"fn":"irand","max":5,"seg":16,"seed":3,"cycles":2}}},"sound":"triangle","context":{"key":"A","chords":"epica","meter":"4/4","bpm":124,"mode":"minor"}}
```

Its loop in the Patterns tab (4 bars, compiled):

```js
$: n(irand(5).seg(16).rib(3, 2)).chord("<Am7 F^7 C^7 G7>").anchor("c5").mode("below").voicing()
  .s("triangle").lpf(sine.range(1040, 4160).slow(8)).lpq(4)
  .decay(.15).sustain(.15).delay(.3).gain(0.3).mask(section1).velocity(section1).orbit(3).analyze("arp")
```
<!-- /generated -->

## Where to read more

- [docs/ARCHITECTURE.md](../ARCHITECTURE.md#patterns-tab): catalogue, loop, preview, store, links.
- [docs/COMPOSING.md](../COMPOSING.md#patterns-in-practice): which presets suit which part.
- [openspec/changes/pattern-library/](../../openspec/changes/pattern-library/): the change, with favourites and votes for later.
