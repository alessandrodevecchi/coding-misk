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
| `tags` | no | `{ "genres": [...], "styles": [...], "free": [...] }`: genres from the fixed list (`techno`, `trance`, `house`, `synthwave`, `drum-and-bass`, `industrial`, `rock`, `metal`, `hip-hop`, `pop`, `jazz`, `country`, `ambient`, `experimental`), style recipe ids, free tags (lowercase, at most 24 characters). The Songs tab adds the genre of each style to the song's own genres and shows style tags with the style's current name. |
| `inspiration` | no | `{ "en": "...", "it": "..." }`: what inspired the song, a short note per language (at most 120 characters). The texts for sharing mention it in a sentence of their own. |
| `origin` | no | `"endless"` for songs made by the director; kept when the song is saved from the radio |
| `narrator` | no | how the narrator speaks: `"explain"` (default, it says what each step does) or `"poetic"` (a short image before each track comes in, nothing at the other steps), or `{ "style": "poetic", "lines": { "bass": [{ "en": "…", "it": "…" }], "any": […] } }` with the song's own images by track type. See [Voice instrument](#voice-instrument) |

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

- `id`: unique in the song. `name`: label in the code and UI (defaults to `id`). `mute`, `solo`: `true` leaves the track out of the code (solo: every other track). `pinned`: settings fixed against live build steps (a list of setting names): the track's own value holds even where a `set` step would change it.
- `type`: `drums bass guitar arp hook pad texture riser code voice spoken`. Any number of tracks of any type (`voice` is the narrator, `spoken` the voice instrument).
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
| `fm` | `index` 1 (0 to 4), `harmonicity` 1 (`0.5 1 1.01 2 2.01 3 3.5 4`), `wave` sine (`sine triangle square sawtooth pink brown`), `decay` 0.3, `sustain` 0.5, `index2` 0 (0 to 3, 0 is off), `harmonicity2` 1 (1 to 10): two operators at most | `.fm().fmh().fmwave().fmdecay().fmsustain()`, `.fm2().fmh2()` |

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
| `voice` | `gain` .6 (applied after the effects), `pitch` 1 (2 an octave up, same length), `tempo` 1 (0.5 twice as long, same pitch), `cutoff` 18000, `hpf` 0 (low cut in Hz), `drive` 0, `room` .2, `delay` 0. No patterns or clips: it speaks the `say` comments of the live build |
| `spoken` | the `voice` settings; `speaker` `""` draws one for the song (never the narrator's). Words stay within the voice limits (pitch .45 to 1.5, tempo .5 to 1.15, drive up to 5.5, …), except in chops |

`wave` takes an oscillator (`sawtooth supersaw square triangle sine`) or a General MIDI sound (`gm_epiano1`, `gm_distortion_guitar`, `gm_choir_aahs`, …; see the Sounds tab). Layer two with a comma: `"gm_distortion_guitar,sawtooth"`.

### Patterns per type

Steps are one character per 16th: `x` plays, `.` rests. A 4/4 bar has 16 steps, 7/8 has 14. Shorter strings are padded with rests, longer ones are cut.

| Type | Pattern fields |
| --- | --- |
| `drums` | `rows`: `bd` kick, `cp` clap, `sd` snare, `hh` hat, `oh` open hat, `rd` ride, each a step string; or `idea` with sequencer steps |
| `bass` | `preset` (`rolling offbeat rumble galoppo ottavi walking sub pumping spirale mirino tritono ottaveArcade`), `steps`, `notes`, `idea` |
| `guitar` | `preset` (riffs `thrash gallopRiff groove djentRiff heroic stomp industrial`, rhythms `power8 chug gallop riff djent quarter held`), `steps`, `idea` |
| `arp` | `preset` (`su sugiu pulsar pedale spezzato acid`), `speed` ("16" or "8"), `steps`, `notes`, `idea` |
| `hook` | `preset` (`richiamo discesa eco ostinato domanda neon cyber decade scintilla prog assolo eroico phonk allarme colpi boss segnale anima arcade arcadeB pioggia orizzonte`), `steps`, `notes`, `idea` |
| `pad` | `preset` (`pad stab pump sidechain staccato synco comp power riff ring`), `steps`, `idea` |
| `texture` | `rhythm` (`bar euclid eighth sixteenth`), `idea` |
| `riser` | none (use `{}`) |
| `code` | `code`: one Strudel pattern expression |
| `voice` | none |
| `spoken` | a line: `way` (`passage refrain chop opening`), `text` (`{ "en", "it" }`, a string, or `"vocab:<group>"`), `every` (refrain), `slices` and `rhythm` (chop), `before` (passage, opening). The track may keep `voiceOptions: { "phrases": "1" \| "2-3" \| "4-5" \| "6-8" \| "many", "kind": "different" \| "repeated" \| "mixed", "ways": [...], "draw": 0 }`, the voice instrument options it was written with in Compose (voice-placement); the app writes it, the compiler ignores it |

- **`steps`** on bass, guitar and pad replace the preset rhythm (the preset still sets the sound shape). On arp and hook they are a mask: a step can silence a note, not add one.
- **`notes` on bass and arp** are chord tones: `0` root, `1` third, `2` fifth, `3` top note, `~` rest. They follow the chord of each bar and the key of the section. Bass plays them two octaves below the arp. 16 notes per bar (8 for arp at speed "8").
- **`notes` on hook** are scale degrees of the section key in the hook `mode`: `0` is the key note, `7` the octave in a 7-note scale; negative numbers go below. 8 notes per bar (8ths).
- **Mini-notation in `notes`:** `[a b]` splits one note in two, `<[bar 1] [bar 2]>` alternates bars, `~` rests.
- **`code`** is plain Strudel: `note("a2 [c3 e3]").s("sawtooth").lpf(800)`. No `$:`, `setcpm` or `setcps`: tempo comes from the sections. The app adds the clip lane, the bus and `.analyze`. Inside a JSON string, write `"` as `\"`.

### Ideas

A pattern of a `drums`, `bass`, `guitar`, `arp`, `hook`, `pad` or `texture` track can hold an `idea` instead of written-out steps or notes: a small musical idea, the way a live coder writes it. The compiler writes it in its shortest form. A pattern that names a preset and holds no idea plays the preset's idea (every preset is stored as one); a pattern with `steps` or `notes` and no idea plays exactly as before.

```json
"patterns": {
  "A": { "preset": "rolling" },
  "B": { "idea": { "rhythm": "[~ x x x]*4" } },
  "C": { "idea": { "from": "bline", "sub": 14, "variants": [{ "add": "0 0 4 0 5" }] } }
}
```

| Field | What it says | Example | Code |
| --- | --- | --- | --- |
| `rhythm` | where notes start in a bar (`x` plays, `~` rests) | `"[~ x x x]*4"` | `.struct("[~ x x x]*4")` |
| `per` | `"beat"`: `rhythm` is one cell per beat, repeated for the beats of each bar (works in every meter) | `"beat"` | |
| `half` | with `per: "beat"`, the cell for a half beat (7/8); default the first half of the cell | `"[~ x]"` | |
| `beat` | sequencer steps on a grid; drums: one list per row | `{ "steps": "0,4,11", "grid": 16 }`, `{ "bd": "0,4,11", "grid": 16 }` | `.beat("0,4,11",16)` |
| `degrees` | scale degrees, counted from the key note in octave 4 (hook: its `octave`) | `"<0 2 4 ~>"` | `n("<0 2 4 ~>").scale("A4:minor")` |
| `scale` | mode of the degrees (hook: default its `mode`); the key comes from the section | `"phrygian"` | |
| `chords` | chord names, written in A like the progressions | `"<Am7 F^7>"` | `chord("<Am7 F^7>").voicing()` |
| `voicing` | `{ "anchor", "mode" }`, both optional; without `chords`, the section's progression is voiced | `{ "anchor": "c5", "mode": "below" }` | `.anchor("c5").mode("below").voicing()` |
| `index` | positions inside the voiced chord (arp); without chords, inside the chords of the progression | `"[0 1 2 3]*4"` | `n("[0 1 2 3]*4").chord(…)`, `.arp("[0 1 2 3]*4")` |
| `random` | a seeded random source for indices (arp), sample slices (texture) or values (`on`) | `{ "fn": "irand", "max": 8, "seg": 16, "seed": 3, "cycles": 2 }` | `irand(8).seg(16).rib(3, 2)` |
| `from` | a shared progression of the song (below) | `"bline"` | `n(bline.sub(14))` |
| `add`, `sub` | transposition: degrees for degrees, semitones for notes; a number or a pattern | `14`, `"<0 12>"` | `.sub(14)`, `.transpose(…)` |
| `hold` | `true` holds the chord for the bar (pad, guitar, arp) | `true` | |
| `variants` | prepared variants, one chain function each; commented out until a `variant` step switches one on | `[{ "add": "0 0 4 0 5" }]` | `// .add("0 0 4 0 5")` |

Degrees and indices can also be a polymeter, `"{0 ~ 2 4 1}%16"`: one item per step, 16 steps a bar, so a cell of 5 or 7 values drifts against the bar and restarts at the clip start. A pattern of `add` on degrees (a progression summed over the bars, `"<0 -2 2 -1>"`) starts on its first item at the clip start, like the chords. The material generator (`docs/ENDLESS.md`, Material) writes ideas with these fields only.

Which fields fit which track: `drums` take `beat`; `bass` rhythm, beat, degrees, scale, from, add, sub; `hook` degrees (required, or `from`), scale, rhythm, from, add, sub; `arp` index, chords, voicing, random, from, add, sub, rhythm; `pad` and `guitar` rhythm, beat, chords, voicing, add, hold; `texture` rhythm (`x` is the sample) and random. Every track takes `variants` but drums.

- **Seeded randomness only.** A `random` source needs a `seed` and `cycles` (its loop length in bars): the same song plays the same notes in the app, in exports and in checks. Randomness only chooses indices inside a chord, sample slices, or the values of `lpf`, `hpf`, `pan`, `delay`, `room` or `gain` (`"on": "lpf"` with `"range": [400, 2000]`). Free melody notes are written by hand.
- **Chord names** are those Strudel's voicings know: `Am`, `Am7`, `F^7` (not `Fmaj7`), `G7`, `Dm7b5`, `Csus`…
- **Variants and degrees.** `add` and `sub` in a variant work on degrees (and arp indices); on notes use `transpose`. With variants, degrees are written first and turned into notes after: `bline.sub(14) // .add("0 0 4 0 5")` then `.n().scale("A4:minor")`.
- **Compose.** The step row shows the steps an idea plays; editing it writes the steps and removes the idea from that pattern ("written out").

### Shared progressions

`shared` declares named progressions once; several tracks read them with `from`, each with its own transposition. A progression is scale degrees, or chord names when it starts with a letter.

```json
"shared": { "bline": "<[3 5@15] [3@12 0@4] [5 7@15] 7>" },
"tracks": [
  { "id": "bass", "type": "bass", "patterns": { "A": { "idea": { "from": "bline", "sub": 14, "rhythm": "[x x ~ x]*4" } } }, "clips": [{ "section": 0, "pattern": "A" }] },
  { "id": "lead", "type": "hook", "patterns": { "A": { "idea": { "from": "bline", "sub": 7 } } }, "clips": [{ "section": 0, "pattern": "A" }] }
]
```

The code holds `const bline = "<[3 5@15] [3@12 0@4] [5 7@15] 7>"` once, after the section lanes, and both tracks use it: `n(bline.sub(14))`, `n(bline.sub(7))`. A clip that starts inside the progression reads it with `.late(start)`. Names are letters and digits starting with a letter, not JavaScript words and not names of the compiler (`SECTIONS`, `TEMPO`, `section1`, `clip1`…).

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

## Live build

`build` is an optional list of timed steps. A song with steps starts from silence and builds itself while it plays, in the style of live-coding videos: each change is typed into the code panel during the bar before its step and sounds on the step's bar.

```json
"build": [
  { "at": 0,  "add": "kick", "say": { "en": "just a kick", "it": "solo una cassa" } },
  { "at": 16, "add": "bass", "say": "need bass" },
  { "at": 24, "set": { "track": "bass", "cutoff": 1100 }, "say": "open it up" },
  { "at": 40, "rack": { "track": "arp", "device": "delay", "amount": 0.35 } },
  { "at": 64, "remove": ["kick", "hats"], "say": "breakdown" }
]
```

| Field | Value |
| --- | --- |
| `at` | bar from 0 where the change sounds |
| `add` | track id, or a list: the track starts playing. Tracks named by an `add` step are silent before it; the others play from the start |
| `remove` | track id, or a list: the track stops |
| `set` | `{ "track", …settings }`: settings of that track from now on |
| `pattern` | `{ "track", "to" }`: every clip of the track plays pattern `to` from now on. `{ "track", "level": k }`: every clip plays the variant `k` of its own pattern (`A~1`, `A~2`…, made by Crescendo), `0` the written one |
| `rack` | `{ "track", "device", …values }`: adds a rack device (replaces one of the same kind) |
| `unrack` | `{ "track", "device" }`: removes a rack device |
| `hide` | `{ "track", "keys" }`: leaves out of the track's code the functions of these settings (`cutoff`, `reso`, `drive`, `grit`, `room`, `delay`, `env`), so Strudel's defaults apply (natural growth) |
| `reveal` | `{ "track", "keys" }`: brings them back |
| `variant` | `{ "track", "use": k }`: switches on the prepared variant `k` (from 0) of the track's ideas: its line loses the `//` and plays. `"use": null` switches it off |
| `mute` / `unmute` | track id, or a list: the track's lines stay in the code muted with `_$:`, or lose the `_` and play (growth shapes) |
| `solo` / `unsolo` | track id, or a list: the track's lines play alone with `S$:` (Strudel plays only the `S` lines while there are some), or lose the `S` |
| `mask` | `{ "track", "mask": "<1 1 0 1>" }`: a mask per phrase on the track's lines (one value per bar, 1 plays); `"mask": null` takes it away |
| `say` | a short comment, or one per language (`{ "en", "it" }`): shown over the stage for 4 bars, written as `// > …` above the track it changes, and spoken by a voice track |
| `voice` | id of the voice track that speaks this step's comment (default: the first one) |

One step can combine several actions. Steps on the same bar apply in file order. The state at any bar is the song with every step up to that bar applied, so seeking and pausing land on the right version. Clips still decide where a track can play. `node tools/song.mjs steps <file>` lists the steps; `compile <file> --at N` prints the code at bar N.

**Spoken comments.** When a sample exists for a comment, it is spoken once on its step's bar by a track of type `voice`. `npm run voices` (macOS) makes one WAV per phrase and language with the system voice (`say`), in `public/samples/say_en/` and `say_it/` (git-ignored). A step speaks with the first voice track, or with the one named in its `voice` field (`{ "at": 8, "say": "more bass", "voice": "robot" }`); a song with several voice tracks can give each phrase a different sound. Without a voice track, comments use the default voice settings.

A song without `build` can also build itself: the "Live build" switch above the arranger derives steps from its clips (each track comes in where its clips start and leaves where they stop, with a short comment), so it sounds exactly as written. On the timeline, a live build shows hatching where its steps keep a track silent and a diamond where a step changes it.

**Creation date and app version.** `"created": "2026-10-16"` and `"appVersion": "0.6.0"` say when the song was made and with which version of the app (#67). The app writes them when a song is saved from Compose or the radio, `tools/endless.mjs` when it writes songs, and `tools/song-dates.mjs` filled the songs in `songs/` from git. Both are optional.

**Profile.** `"profile": "switch"` (the Live coder profile; or `classic`, `crescendo`) opens and plays the song with that performance profile and the Live build on; it wins over `buildStyle`.

**Configuration.** `"config": { "profile": "switch", "live": true, "options": { "narrated": true, "typing": "fast" } }` is the song's own configuration (song-own-settings): the profile (`classic`, `crescendo`, `switch`), the Live build switch and the profile options that differ from the profile (the controls of `src/live/profiles.js`: comments, technical functions, narrator, typing, growth shape and the others). It is how the song opens, plays and exports, and wins over `profile` and `buildStyle`; a missing part falls back to them. A song with none of the three plays as Classic with the Live build off: as written. Compose writes `config` when a song is saved with a configuration trial (Save, Save as new); a change in Compose alone is a trial kept in the browser, never in the file. The validator reports a wrong profile, a `live` that is not a boolean and an option value out of its list (`config.options.typing`), and warns about unknown fields and options.

**Growth shape.** `"growthShape": { "opening": "full-kick", "pace": "fast", "development": "as-written" }`, each part optional, sets how the song grows with the Live coder profile: the song's value wins over its style's weights and over the seed, and a value the song cannot play (a kick opening without drums) falls to the next rule. Openings: `slow`, `full-kick`, `typed`, `broken`, `filtered`, `melodic`, `pad`, `voice` (needs a spoken track with an opening line, never drawn without one), `muted-base`, `mid-set`; paces: `slow`, `medium`, `fast`; developments: `by-type`, `as-written`, `masks`, `parameters`, `second-section`, `metamorphosis`. The validator reports a wrong value with its path (`growthShape.opening`). A metamorphosis adds a pattern `skin` to the tracks it rewrites and changes the tempo and key of the sections after its phrase boundary.

**Build style.** `"buildStyle": "crescendo"` (or `"blocks"`) makes the song open and play with that build style of the live build, the Live build on; without it (and without `profile` or `config`) the song plays as written. Crescendo (`src/song/crescendo.js`) ignores the song's own `build` and computes one: it prepends growth sections (`Crescendo`, `Crescendo 2`), may append an ending section (`Strip` or `Stop`), adds pattern variants named `<pattern>~<level>` to the tracks, and writes steps with the actions above. The song file is never changed.

## Voice instrument

A track of type `spoken` plays spoken lines as part of the music (voice-instrument, #39). It is not the narrator: the narrator (`voice` tracks) speaks the comments of a live build; a spoken track plays in the song as written, in exports and in every live build. Its patterns are lines and its clips place them:

```json
{ "id": "words", "type": "spoken", "settings": { "speaker": "reed", "gain": 0.55 },
  "patterns": {
    "open": { "way": "opening", "text": { "en": "the city is still awake", "it": "la città è ancora sveglia" }, "before": "drums" },
    "chop": { "way": "chop", "text": { "en": "signal", "it": "segnale" }, "slices": 8, "rhythm": "0 ~ 1 ~ 2 3 ~ 3" },
    "refrain": { "way": "refrain", "text": "vocab:night", "every": 2 } },
  "clips": [{ "section": "Intro", "pattern": "open" }, { "start": 16, "bars": 8, "pattern": "chop" }, { "section": "Outro", "pattern": "refrain" }] }
```

| Field | Value |
| --- | --- |
| `way` | `opening`: the line once, from the clip's first bar. `passage`: a longer text (up to 12 words), once, at the start of the quietest section the clip covers, lightly treated (no drive, little room, no rack). `refrain`: the line every `every` bars (default 4) in the quiet sections of the clip, each time only if it ends before the section does. `chop`: the line cut in `slices` and played on the steps of `rhythm` on every bar of the clip |
| `text` | `{ "en", "it" }` or a string (one language: it plays in that language). Missing: the style's lines for the way (`spoken.lines` of the song's first style that has them), else a line drawn from the vocabulary. `"vocab:<group>"` draws from one group (`dark calm machine night`). Drawn lines use the song's seed on their own stream: the same song draws the same line, and the music of a seed does not change. At most 12 words |
| `every` | refrain: bars between two lines, 1 to 64 |
| `slices`, `rhythm` | chop: slices (2 to 32, default 8) and their order, one token per step of the bar (`~` rests), for example `"0 1 0 1 2 2 3 ~"` |
| `before` | passage or opening: a track id; the line ends one beat before that track's next entry (a clip that starts where the track was silent). Without such an entry the line plays from the clip's start |

A **quiet section** has at most half the tracks of the fullest section (voice and spoken tracks left out), or a name with `intro`, `break`, `pausa`, `outro`, `coda` or `fine`. Lines are placed from the clips, so every state of a live build places them on the same bars.

**Code.** Each way is one `$:` line with a mask lane on the bars it starts on, with the voice settings and the rack, on orbit 13 (the second spoken track 14; the narrator speaks on 15 and up): `s("say_en_reed").n(2).late(0.625).mask("<0!6 1 0!49>").stretch(0.9)…orbit(13)`. A drawn line plays its vocabulary entries one per beat: `n("3 1 ~ ~")`. A chop: `.slice(8, "0 ~ 1 ~ 2 3 ~ 3").clip(1)`. A line without its sample on this machine writes only its comment (`no sample: npm run voices`) and stays silent.

**Samples.** `npm run voices` makes every line of the songs, the styles' lines, every vocabulary entry for the speakers of the styles' voice instrument, and the poetic narrator's images; it also writes `public/samples/say_lengths.json` (git-ignored), the length of each sample, used to place the lines. Without it the length is estimated from the words.

**Speakers and language.** A spoken track speaks with its `speaker`, else one of its style's `spoken.speakers`, else any speaker, never the narrator's. Lines follow the app's language when they have a text in it.

**Narrator.** The narrator yields: a step comment on a bar where a spoken line sounds is not spoken, and a step that brings in a spoken track is not narrated. With `"narrator": "poetic"` it speaks only where a track comes in (an `add`, a clone or an unmute), a short image from the song's `narrator.lines`, its style's, else the vocabulary's poetic group, in the bar before the entry when the code of the step before still plays there.

**Live build.** A spoken track is never thinned and is not part of a Crescendo growth: it enters on the bar of its first line. With the Live coder's `voice` opening, the first spoken track with an opening line is the first sound of the build: the line is said just before the next track comes in, ending a beat or more before it (the bars before it are the time that track's line takes to type).

## Compiled code

`compileSong` writes, in order: `setcpm`, `SECTIONS` and `TEMPO` (read by the player for seeking and tempo changes), one lane per section (`section1 = "<1!8 0!24>"`), then one block per track with its clips. Each clip line ends with `.mask(lane).velocity(lane).orbit(n).analyze("<instrument>")`.

Each idea is written in its shortest exact form: a repeated cell with its repetition (`.struct("[~ x x x]*4")`, `s("[~ hh]*4")`), runs (`"0!6 1 0!5 3 0 1 0"`), sequencer steps when they are shorter (`s("bd").beat("0,7,10",16)`), degrees and chord names as written. Written steps and notes use the same short forms whenever they make the same events. Shared progressions come after the section lanes (`const bline = "…"`).

Songs saved by older versions of the app (scenes with a full state each) are converted with `fromScenes` when loaded. The conversion was checked layer by layer against the old scene compiler before the scene model was removed.
