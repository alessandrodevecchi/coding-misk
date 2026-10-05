# Song format v2

Reference for the JSON song files in `songs/`. A song is sections (the timeline and the harmony) plus a free list of tracks; each track has named patterns and clips that place a pattern on bars. The guide with worked examples is [COMPOSING.md](COMPOSING.md).

Check a file with `node --no-warnings tools/song.mjs validate songs/my-song.json` and print its Strudel code with `compile`. `npm run check:songs` validates every file in `songs/` and checks the built-in tracks.

## Song

```json
{
  "format": "coding-misk/song",
  "version": 2,
  "id": "night-drive",
  "title": "Night Drive",
  "look": "edgerunners",
  "style": { "en": "One line about the track", "it": "Una riga sul brano" },
  "sections": [],
  "tracks": []
}
```

| Field | Required | Value |
| --- | --- | --- |
| `format`, `version` | yes | `"coding-misk/song"`, `2` |
| `id` | yes | lowercase letters, digits, hyphens; unique in the library |
| `title` | yes | shown in the app |
| `look` | no | visual: `palco`, `pixel`, `tramonto`, `montagne`, `spazio`, `sonar`, `edgerunners` |
| `style` | no | `{ "en", "it" }` description |

## Sections

Sections follow each other on the timeline. They hold everything shared by all tracks: tempo, meter, key and chords, plus the transition cues.

| Field | Default | Value |
| --- | --- | --- |
| `name` | required | unique name; clips refer to it |
| `bars` | required | 1 to 256 |
| `bpm` | 138 | 40 to 240, real BPM (also in odd meters) |
| `bpmEnd` | `null` | ramp to this BPM by the end of the section |
| `key` | `A` | `E F F# G A B C D` |
| `chords` | `epica` | progression, one chord per bar, repeating: `epica notturna euforica ipnotica malinconica cyber pendolo anthem ascesa andalusa prog lofi jazz frigio drone tensione arcade dorico` |
| `meter` | `4/4` | `4/4 3/4 5/4 7/8` (16, 12, 20, 14 steps per bar) |
| `swing` | 0 | 0 to 1 |
| `fade` | 0 | bars of crossfade from the previous section; tempo ramps over them too |
| `crash` | false | crash on the first beat (played by drum tracks with a clip starting here) |
| `breath` | false | half a bar of silence at the end, before a drop |
| `fill` | false | snare roll in the last bar (drum tracks) |

Progressions are written in A minor and moved to `key`; see `PROGS` in `src/music.js` for the chords.

## Tracks

```json
{ "id": "riff", "name": "Guitar riff", "type": "guitar", "settings": {}, "rack": [], "patterns": { "A": {} }, "clips": [] }
```

- `id`: unique in the song. `name`: label in the code and UI (defaults to `id`). `mute`, `solo`: `true` leaves the track out of the code (solo: every other track).
- `type`: `drums bass guitar arp hook pad texture riser code`. Any number of tracks of any type.
- `settings`: how the track sounds. Missing settings take the defaults below.
- `patterns`: named patterns (`"A"`, `"verse"`, …), what the track plays.
- `clips`: where it plays. A track plays nothing outside its clips.

Each track gets its own orbit (bus), so its delay and reverb are independent.

### Rack

`rack` is an ordered chain of devices added after the instrument, for the whole track. Each device is one Strudel function; missing values take the defaults, `"on": false` bypasses it.

```json
"rack": [
  { "device": "delay", "amount": 0.35, "time": 0.1875, "feedback": 0.5 },
  { "device": "pan", "motion": "slow" }
]
```

| Device | Values (defaults) | Strudel |
| --- | --- | --- |
| `echo` | `count` 3 (2 to 8), `time` 0.125, `feedback` 0.5 | `.echo(count, time, feedback)` |
| `off` | `time` 0.125, `semitones` 12 (melodic tracks) | `.off(time, x => x.add(note(semitones)))` |
| `ply` | `times` 2 (2 to 4) | `.ply(times)` |
| `degrade` | `amount` 0.3 | `.degradeBy(amount)` |
| `rev` | none | `.rev()` |
| `jux` | none | `.jux(rev)` |
| `delay` | `amount` 0.4, `time` 0.1875, `feedback` 0.45 | `.delay().delaysync().delayfeedback()` |
| `reverb` | `amount` 0.4, `size` 0.6 | `.room().roomsize()` |
| `distort` | `amount` 2 (0 to 8) | `.distort()` |
| `shape` | `amount` 0.4 | `.shape()` |
| `crush` | `bits` 6 (1 to 16) | `.crush()` |
| `coarse` | `amount` 8 (1 to 32) | `.coarse()` |
| `phaser` | `rate` 1, `depth` 0.6 | `.phaser().phaserdepth()` |
| `tremolo` | `rate` 8 per bar, `depth` 0.7 | `.tremolosync().tremolodepth()` |
| `vowel` | `vowel` a (`a e i o u`) | `.vowel()` |
| `hpf`, `lpf` | `cutoff` (Hz), `reso` 0 | `.hpf().hpq()`, `.lpf().lpq()` |
| `pan` | `position` 0.5, `motion` fixed (`fixed slow fast`) | `.pan()` |

Times are fractions of a bar: `0.0625` a 16th, `0.125` an 8th, `0.1875` a dotted 8th, `0.25` a quarter. Devices act after the instrument settings, so a rack `lpf` or `distort` replaces or adds to the track's own filter and drive.

### Settings per type

Common: `gain` (about 0 to 1), `gainEnd` and `cutoffEnd` (ramp to this value over the section, or `null`), `cutoff` (low-pass in Hz, 18000 or more means open), `drive` (distortion, 0 to about 4), `room` and `delay` (send, 0 to 1), `move` (filter motion: `fisso`, `lento`, `veloce`).

| Type | Settings (defaults) |
| --- | --- |
| `drums` | `kit` (RolandTR909; also TR808, TR707, TR606, LinnDrum, AkaiLinn, LinnLM1, OberheimDMX, EmuSP12, AkaiMPC60, AlesisHR16, YamahaRX5), `gain` .9, `cutoff` 20000, `drive` 0, `grit` 0 (bit crush) |
| `bass` | `wave` sawtooth, `gain` .8, `cutoff` 700, `move` lento, `reso` 8, `drive` 0 |
| `guitar` | `type` distorted (`clean crunch distorted metal muted`), `gain` .5, `cutoff` 4200, `drive` 0, `octave` "0" (`"-2"` a tone down, `"-12"` an octave down), `width` double (`double` or `mono`), `room` .2 |
| `arp` | `wave` supersaw, `gain` .4, `cutoff` 2400, `move` lento, `reso` 4, `delay` .35, `drive` 0 |
| `hook` | `wave` square, `mode` minor (`minor phrygian dorian mixolydian locrian chromatic`), `octave` "4" ("3" to "5"), `gain` .3, `cutoff` 3000, `move` fisso, `delay` .4, `fm` 0, `vowel` "", `grit` 0, `drive` 0, `harmony` "" (`"2"` thirds, `"4"` fifths) |
| `pad` | `wave` supersaw, `gain` .28, `cutoff` 1400, `move` lento, `room` .85, `drive` 0 |
| `texture` | `sample` numbers (`vinyl numbers industrial metal glitch space wind crow`, or a custom bank), `gain` .4, `grit` .7, `room` .6 |
| `riser` | `gain` .25, `bars` "8" (length of the sweep), `dir` up (`up` riser, `down` downlifter) |
| `code` | `visual`: which Stage instrument lights up (`kick snare hats bass guitar arp hook pad fx riser`, default `fx`) |

`wave` takes an oscillator (`sawtooth supersaw square triangle sine`) or a General MIDI sound (`gm_epiano1`, `gm_distortion_guitar`, `gm_choir_aahs`, …; see the Sounds tab). Layer two with a comma: `"gm_distortion_guitar,sawtooth"`.

### Patterns per type

Steps are one character per 16th: `x` plays, `.` rests. A 4/4 bar has 16 steps, 7/8 has 14. Shorter strings are padded with rests, longer ones are cut.

| Type | Pattern fields |
| --- | --- |
| `drums` | `rows`: `bd` kick, `cp` clap, `sd` snare, `hh` hat, `oh` open hat, `rd` ride, each a step string |
| `bass` | `preset` (`rolling offbeat rumble galoppo ottavi walking sub pumping spirale mirino tritono ottaveArcade`), `steps`, `notes` |
| `guitar` | `preset` (riffs `thrash gallopRiff groove djentRiff heroic stomp industrial`, rhythms `power8 chug gallop riff djent quarter held`), `steps` |
| `arp` | `preset` (`su sugiu pulsar pedale spezzato acid`), `speed` ("16" or "8"), `steps`, `notes` |
| `hook` | `preset` (`richiamo discesa eco ostinato domanda neon cyber decade scintilla prog assolo eroico phonk allarme colpi boss segnale anima arcade arcadeB pioggia orizzonte`), `steps`, `notes` |
| `pad` | `preset` (`pad stab pump sidechain staccato synco comp power riff ring`), `steps` |
| `texture` | `rhythm` (`bar euclid eighth sixteenth`) |
| `riser` | none (use `{}`) |
| `code` | `code`: one Strudel pattern expression |

- **`steps`** on bass, guitar and pad replace the preset rhythm (the preset still sets the sound shape). On arp and hook they are a mask: a step can silence a note, not add one.
- **`notes` on bass and arp** are chord tones: `0` root, `1` third, `2` fifth, `3` top note, `~` rest. They follow the chord of each bar and the key of the section. Bass plays them two octaves below the arp. 16 notes per bar (8 for arp at speed "8").
- **`notes` on hook** are scale degrees of the section key in the hook `mode`: `0` is the key note, `7` the octave in a 7-note scale; negative numbers go below. 8 notes per bar (8ths).
- **Mini-notation in `notes`:** `[a b]` splits one note in two, `<[bar 1] [bar 2]>` alternates bars, `~` rests.
- **`code`** is plain Strudel: `note("a2 [c3 e3]").s("sawtooth").lpf(800)`. No `$:`, `setcpm` or `setcps`: tempo comes from the sections. The app adds the clip lane, the bus and `.analyze`. Inside a JSON string, write `"` as `\"`.

## Clips

```json
{ "section": "Drop", "pattern": "A" }
{ "start": 12, "bars": 8, "pattern": "B", "set": { "gainEnd": 0 } }
```

- **Position:** `section` (name, or index from 0) covers that section; `start` (bar from 0) and `bars` place it anywhere. With `section` plus `bars`, the clip starts at the section and lasts `bars`.
- **`pattern`:** a key of the track's `patterns`.
- **`set`:** settings for this clip only, on top of the track settings.
- Clips on one track cannot overlap; put layered parts on separate tracks.
- In the app, the sections view writes `section` clips and the free timeline writes `start`/`bars` clips; a section clip that is moved or resized becomes a `start`/`bars` clip.
- A clip covering a whole section fades in and out with the section's `fade`. A clip that starts or ends inside a section starts and stops on the bar.
- A clip spanning several sections follows each section's chords and key. Automations (`gainEnd`, `cutoffEnd`) ramp within each section.

## Compiled code

`compileSong` writes, in order: `setcpm`, `SECTIONS` and `TEMPO` (read by the player for seeking and tempo changes), one lane per section (`section1 = "<1!8 0!24>"`), then one block per track with its clips. Each clip line ends with `.mask(lane).velocity(lane).orbit(n).analyze("<instrument>")`.

Songs saved by older versions of the app (scenes with a full state each) are converted with `fromScenes` when loaded. The conversion was checked layer by layer against the old scene compiler before the scene model was removed.
