---
id: music-engine
related: [songs, ideas, styles, material, patterns, sounds, from-a-reference]
code: [src/music.js, src/material/common.js, src/song/compile.js, src/endless/recipe.js]
checks: [npm run check:code, npm run check:songs, npm run check:patterns, npm run check:material]
---

# Music engine: keys, modes, progressions, meters, presets

## What it is

The musical building blocks every song, style and generator uses. They live in `src/music.js` as tables. Styles and songs name them by id; the compiler turns them into Strudel code.

**Everything is written in A.** Chords, presets and progressions are written in A minor (or its relative C major). A song's `key` transposes them by a number of semitones. So `epica` in E is the same shape as in A, five semitones lower.

**Degrees and semitones.** Hook presets are scale degrees (0 is the root, 7 the octave in a seven-note mode). With the `chromatic` mode the numbers are semitones instead (12 the octave, 6 the tritone, 1 the flat second). Bass and guitar riffs are semitone offsets from the chord root.

**Presets as ideas.** Every preset also has an idea (`BASS.rolling.idea`), the short form the idea writer prints and the Live coder grows ([ideas.md](ideas.md)).

## How it connects

- **Songs** pick a key, a progression and a meter per section, and a preset per track ([songs.md](songs.md)).
- **Styles** list the keys, progressions, meters and presets their songs may use ([styles.md](styles.md)).
- **Material** composes new parts on the same keys, modes and chords ([material.md](material.md)).
- **Patterns tab** plays every preset in a loop ([patterns.md](patterns.md)).
- **References** map to these ids: a measured key, mode and chord loop become a `keys` entry, a mode and a progression ([from-a-reference.md](from-a-reference.md)).

## Options

<!-- generated:keys -->
Keys (`KEYS`, everything is written in A and transposed): `E` (-5, it: Mi), `F` (-4, it: Fa), `F#` (-3, it: Fa#), `G` (-2, it: Sol), `A` (+0, it: La), `B` (+2, it: Si), `C` (+3, it: Do), `D` (+5, it: Re).

| Mode | Name | Scale steps (semitones) |
| --- | --- | --- |
| `minor` | Minor (it: Minore) | 0 2 3 5 7 8 10 |
| `phrygian` | Phrygian (it: Frigio) | 0 1 3 5 7 8 10 |
| `dorian` | Dorian (it: Dorico) | 0 2 3 5 7 9 10 |
| `mixolydian` | Mixolydian (it: Misolidio) | 0 2 4 5 7 9 10 |
| `locrian` | Locrian (tritone) (it: Locrio (tritono)) | 0 1 3 5 6 8 10 |
| `chromatic` | Chromatic (semitones) (it: Cromatico (semitoni)) | semitones: numbers are half steps |

Meters (`METERS`, sixteenth steps per bar): `4/4` 16, `3/4` 12, `5/4` 20, `7/8` 14.

Chord names (`CHORDS`, in A minor): `Am`, `F`, `C`, `G`, `Dm`, `E`, `Em`, `D`, `A#`, `Am7`, `Dm7`, `Em7`, `Fmaj7`, `Cmaj7`, `G7`.
<!-- /generated -->

The app has eight keys (E to D). A reference in another key goes to the nearest one or needs a new entry in `KEYS`. Major songs use the relative minor table: `rock` and `country` are written on C, the relative major of A minor.

<!-- generated:progressions -->
| Progression | Name | Chords (in A, one per bar) |
| --- | --- | --- |
| `epica` | Epic (it: Epica) | Am F C G |
| `notturna` | Nocturne (it: Notturna) | Am Dm F E |
| `euforica` | Euphoric (it: Euforica) | F G Am Am |
| `ipnotica` | Hypnotic (it: Ipnotica) | Am G F G |
| `malinconica` | Melancholic (it: Malinconica) | Am Em F G |
| `cyber` | Cyber | Am F G E |
| `pendolo` | Pendulum (2 bars) (it: Pendolo (2 battute)) | Am Am G G |
| `anthem` | Anthem (2 bars) (it: Anthem (2 battute)) | Am Am G G F F G G |
| `ascesa` | Ascent (2 bars) (it: Ascesa (2 battute)) | F F G G Am Am Em Em |
| `andalusa` | Andalusian (it: Andalusa) | Am G F E |
| `prog` | Prog | Am C D F |
| `lofi` | Lo-fi | Fmaj7 Em7 Dm7 Cmaj7 |
| `jazz` | ii-V-I | Dm7 G7 Cmaj7 Am7 |
| `frigio` | Phrygian (metal) (it: Frigio (metal)) | Am A# Am G |
| `drone` | One chord (drone) (it: Un accordo (drone)) | Am |
| `tensione` | Tension (b2) (it: Tensione (b2)) | Am Am Am A# |
| `arcade` | Arcade | Am F G Am |
| `dorico` | Dorian (i-IV) (it: Dorico (i-IV)) | Am Am D D |
| `rock` | Rock (I-V-vi-IV) | C G Am F |
| `country` | Country (I-IV-V) | C F G C |
| `turnaround` | Jazz turnaround (I-vi-ii-V) (it: Turnaround jazz (I-vi-ii-V)) | Cmaj7 Am7 Dm7 G7 |
<!-- /generated -->

Progressions with "(2 bars)" hold each chord for two bars. A chord name in a progression must be in `CHORDS`. For `voicing()` Strudel writes maj7 chords as `^7` (`F^7`, not `Fmaj7`).

<!-- generated:presets -->
| Track type | Table | Presets |
| --- | --- | --- |
| `bass` | `BASS` | `rolling` Rolling, `offbeat` Offbeat, `rumble` Rumble, `galoppo` Gallop (it: Galoppo), `ottavi` 8th notes (rock) (it: Ottavi (rock)), `walking` Walking (quarters) (it: Walking (un beat)), `sub` Long sub (it: Sub lungo), `pumping` Pumping (sidechain) (it: Pompato (sidechain)), `spirale` Spiral riff (octaves) (it: Riff spirale (ottave)), `mirino` Crosshair riff (it: Riff mirino), `tritono` Tritone riff (it: Riff tritono), `ottaveArcade` Arcade octaves (it: Ottave arcade), `boomchick` Boom-chick (country) |
| `arp` | `ARPS` | `su` Up (it: Su), `sugiu` Up and down (it: Su e giù), `pulsar` Pulsar, `pedale` Pedal (it: Pedale), `spezzato` Broken (it: Spezzato), `acid` Acid |
| `hook` | `HOOKS` | `richiamo` Call (it: Richiamo), `discesa` Descent (it: Discesa), `eco` Echo (it: Eco), `ostinato` Ostinato, `domanda` Call and response (it: Domanda e risposta), `neon` Neon, `cyber` Cyber, `decade` Decade (it: Decennale), `scintilla` Spark (it: Scintilla), `prog` Prog, `assolo` Solo (it: Assolo), `eroico` Heroic (it: Eroico), `phonk` Phonk, `allarme` Alarm (tritone) (it: Allarme (tritono)), `colpi` Hits (it: Colpi), `boss` Boss, `segnale` Signal (it: Segnale), `anima` Soul (it: Anima), `arcade` Arcade, `arcadeB` Arcade B, `pioggia` Rain (it: Pioggia), `orizzonte` Horizon (it: Orizzonte) |
| `pad` | `PADS` | `pad` Sustained (it: Tappeto), `stab` Stab, `pump` Offbeat pump (it: In levare), `sidechain` Sidechain, `staccato` Staccato 8ths (it: Staccato a ottavi), `synco` Syncopated (it: Sincopato), `comp` Comping (lo-fi) (it: Accompagnamento (lo-fi)), `power` Power chords, 8ths (it: Power chord a ottavi), `riff` Power chord riff (it: Riff power chord), `ring` Held power chord (it: Power chord tenuto) |
| `guitar` | `GUITAR_PATTERNS` | `thrash` Thrash riff (it: Riff thrash), `gallopRiff` Gallop riff (it: Riff in galoppo), `groove` Groove riff (it: Riff groove), `djentRiff` Djent riff (it: Riff djent), `heroic` Heroic chords (it: Aperture eroiche), `stomp` Stomp (industrial), `industrial` Industrial, `power8` Power chords, 8ths (it: Power chord a ottavi), `chug` 16th chugs (it: Chug a sedicesimi), `gallop` Gallop (it: Galoppo), `riff` Riff, `djent` Djent, `quarter` Quarters (it: Quarti), `held` Held (it: Tenuto) |
| `drums` | `GROOVES` | `trance` Trance, `rolling` Rolling hat, `breakbeat` Breakbeat, `halftime` Half-time, `techno` Techno, `hard` Hard techno, `rock` Rock, `boombap` Boom bap (lo-fi), `prog78` Prog 7/8, `prog54` Prog 5/4, `metal` Metal (doppia cassa), `gallopDrums` Gallop (metal) (it: Galoppo (metal)), `blast` Blast beat, `phonk` Phonk, `synthwave` Synthwave, `dnb` Drum and bass, `pulse` Pulse (ambient) (it: Battito (ambient)), `swing` Jazz swing, `train` Train beat (country) (it: Treno (country)), `rockChorus` Rock chorus (it: Rock ritornello) |
| `texture` | `TEX_RHYTHMS` | `bar` One per bar (it: Uno per battuta), `euclid` Euclidean 3/8 (it: Euclideo 3/8), `eighth` 8th notes (it: Ottavi), `sixteenth` 16th notes (it: Sedicesimi) |
<!-- /generated -->

<!-- generated:energy-shapes -->
Energy shapes of a song (`SHAPES` in `src/endless/recipe.js`): `build-drop`, `slow-burn`, `waves`, `flat-groove`, `verse-chorus`, `late-peak`, `descent`.

Artist quirks (`QUIRKS`): `two-drops`, `long-breaks`, `no-guitars`, `texture-first`, `hard-endings`, `talks-a-lot`, `slow-builds`.

Generator rules (`RULES`): melody: `polymeter`, `tail`, `call-response`, `dark`; bass: `half`, `offbeat`, `pulse`, `rolling`, `gallop`, `sixteenths`, `roots`, `octaves`, `fifths`, `shared`; arp: `up`, `updown`, `pedal`, `skips`, `random`; chords: `style`, `mode`, `sevenths`, `power`. Groove families: `four-floor`, `breakbeat`, `two-step`, `half-time`, `euclid`.
<!-- /generated -->

## Example

A section in E with the `tensione` progression and a tritone hook:

```json
{"name": "Drop", "bars": 16, "bpm": 128, "key": "E", "chords": "tensione", "meter": "4/4"}
```

```json
{"id": "lead", "type": "hook", "settings": {"preset": "allarme", "mode": "chromatic", "wave": "square"}}
```

`tensione` plays Am Am Am A# moved down five semitones: Em Em Em F. `allarme` in `chromatic` plays semitones 12 and 18, an octave and a tritone above the root.

## Where to read more

- [docs/MUSIC-ENGINE.md](../MUSIC-ENGINE.md): scene model, compiler, presets as ideas, Strudel gotchas.
- [docs/SONG-FORMAT.md](../SONG-FORMAT.md): section and track fields.
- [docs/COMPOSING.md](../COMPOSING.md#patterns-in-practice): which presets suit which part.
