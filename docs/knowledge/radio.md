---
id: radio
related: [radio-commands, styles, artists, material, patterns, narrator, voice, export, library, settings]
code: [src/radio/radio.js, src/endless/director.js, src/endless/transitions.js, src/endless/compilation.js, src/endless/energy.js]
checks: [npm run check:endless, npm run check:compilation, node --no-warnings tools/check-radio.cjs]
---

# Radio

## What it is

The radio plays endless sessions. A director writes one song at a time from style recipes, plans the transition to the next and keeps going. The same seed and the same options give the same songs, in the app and on the command line (`npm run endless`).

A song on air builds itself like a live build. The listener can steer it from the console.

## How it connects

- **Styles and artists.** The director picks parts from the selected styles, or from an artist's taste ([styles.md](styles.md), [artists.md](artists.md)).
- **Material.** Each track plays a preset, a varied preset, a composed part or a saved pattern ([material.md](material.md), [patterns.md](patterns.md)).
- **Console.** Commands rewrite the song on air from a boundary ([radio-commands.md](radio-commands.md)).
- **Voice.** Spoken comments and the voice instrument come from the recipes ([narrator.md](narrator.md), [voice.md](voice.md)).
- **Out.** Sessions can be recorded, exported faster than real time, saved to playlists ([export.md](export.md), [library.md](library.md)).
- **Defaults.** Settings keeps the radio defaults for new sessions ([settings.md](settings.md)).

**Energy and moves.** Each song follows an energy shape. On each phrase boundary the director scores candidate moves (add a track, strip one, brighter, darker, dirtier, more space) and picks those that reach the target.

**Curves.** Next to energy the console shows density, brightness, tension and voice per double phrase. Dragging one sets a soft target for that part of the song on air.

**Seeds and replay.** Everything random comes from the seed, through named random sources. Replay plays the session again with every change made while listening. A session saved in a playlist warns when the director version has changed since (`DIRECTOR_VERSION`).

**Continue in radio.** A song from Compose or the Songs tab can be song 0. The radio then goes on in the closest styles.

## Options

<!-- generated:radio-knobs -->
| Option | Name | Default | What it does |
| --- | --- | --- | --- |
| `chaos` | Chaos (it: Caos) | `0.3` | 0: each song in one style, taking turns. 1: drums, bass, harmony, lead, pads and voice from different styles |
| `energy` | Energy (it: Energia) | `0.6` | Raises or lowers the energy of every song: more tracks, busier drums, more open filters, more drive |
| `complexity` | Complexity (it: Complessità) | `0.5` | How many tracks play together and how much the material moves away from the presets |
| `talk` | Voice (it: Voce) | `0.5` | How often the voice speaks: 0 never, 0.5 about half of the changes, 1 almost every change |
| `minutes` |  | `15` | no help text: described below |
| `transition` | Transitions (it: Transizioni) | `artist` | How one song turns into the next: as the artist likes it, or always the same kind. Applies from the next transition. |
| `harmony` | Harmony (it: Armonia) | `artist` | Compatible: the next song is a fifth away with a close tempo. Free: any key and tempo. |
| `material` | Material (it: Materiale) | `mix` | Where the parts of the songs come from: the patterns as written, varied patterns, parts composed by the generator, or as each style says. |
<!-- /generated -->

`minutes` is the length of a session on the command line (`--minutes`); the radio in the app plays until it is stopped. Styles, chaos, energy, complexity, voice and material apply from the next song prepared.

<!-- generated:transitions -->
| Transition | Name |
| --- | --- |
| `mix` | Mix |
| `morph` | Morph |
| `break` | Break and riser (it: Break con riser) |
| `echo` | Echo out (it: Eco in uscita) |
| `interlude` | Interlude (it: Interludio) |
| `cut` | Cut (it: Stacco netto) |

Harmony modes: `compatible` Compatible (it: Compatibile), `free` Free (it: Libera).
<!-- /generated -->

- `mix`: the next song starts under the last bars; the current one fades and filters out.
- `morph`: the current tracks leave one at a time while the next song builds in.
- `break`: the last phrase keeps pad and texture, a riser climbs, the next song starts with a crash.
- `echo`: delay and reverb on the last two bars; the next song starts under the tail.
- `interlude`: a near silence with a spoken comment.
- `cut`: a plain end and start.

The option `transition` is `artist` (the artist's weights) or one kind. `harmony` is `artist`, `compatible` or `free`.

**Compilation.** The radio changes artist, genre, styles and knobs on its own, every song or every two to four songs. A setup limits genres, artists and knob ranges.

<!-- generated:compilation-presets -->
Compilation: The radio changes artist, genre, styles and knobs on its own: every song, then every 2 to 4 songs, then off.

| Preset | Name | Movement | Genres | Knob ranges |
| --- | --- | --- | --- | --- |
| `everything` | Everything (it: Tutto) | `free` | all | chaos 0-1, energy 0-1, complexity 0-1, talk 0-1 |
| `journey` | Journey (it: Viaggio) | `journey` | all | chaos 0.15-0.7, energy 0.3-0.9, complexity 0.3-0.8, talk 0.2-0.8 |
| `max` | Max | `free` | all | chaos 0.6-1, energy 0.7-1, complexity 0.6-1, talk 0.3-0.9 |
| `club` | Club | `journey` | techno, trance, house, drum-and-bass, synthwave | chaos 0.15-0.7, energy 0.6-0.95, complexity 0.3-0.8, talk 0.2-0.8 |
| `chill` | Chill | `journey` | ambient, jazz, hip-hop, synthwave | chaos 0.1-0.45, energy 0.2-0.6, complexity 0.3-0.8, talk 0.2-0.8 |
<!-- /generated -->

## Example

```sh
npm run endless -- --styles berlin-techno,jazz --chaos 0.5 --minutes 20 --seed aurora --join
```

This writes the session to `songs/endless/` (git-ignored) and prints one line per song and per phrase. The same seed gives the same session. A steered song from a seeded session is in [radio-commands.md](radio-commands.md#example).

## Where to read more

- [docs/ENDLESS.md](../ENDLESS.md): sessions, plans, energy, moves, transitions, steering, curves, determinism, checks.
- [docs/ARCHITECTURE.md](../ARCHITECTURE.md#radio): the window song and the player.
- The Guide card `radio` in `src/guide.js`.
