# Music engine

## Songs and channel state

Songs follow the format v2 (`docs/SONG-FORMAT.md`): sections, tracks, patterns, clips. To generate code, each clip is turned into a channel state (`clipState` in `src/song/format.js`): section fields + track settings + clip overrides + pattern. That state follows `DEFAULT` in `src/music.js` (the model of the old scenes, kept as the generator's input), and `sceneLayers(state, { only: type })` writes the Strudel layers of one instrument.

State fields:

- Scene: `bpm`, `bpmEnd` (ramp to the end of the scene, `null` = fixed), `key` (`E F F# G A B C D`, all music is written in A and transposed), `prog`, `meter` (`4/4 3/4 5/4 7/8`), `swing` (0 to 1).
- `drums`: `on`, `kit`, `gain`/`gainEnd`, `cutoff`/`cutoffEnd`, `drive`, `grit`, `rows` (`bd cp sd hh oh rd`, each `{ steps: 'x...', mute }`, one char per 16th).
- `bass`: `preset`, `wave`, `gain`, `cutoff`, `move`, `reso`, `drive`.
- `guitar`: `type` (`clean crunch distorted metal muted`), `pattern`, `gain`, `cutoff`, `drive`, `octave` (`0`, `-2`, `-12`), `width` (`double`, `mono`), `room`.
- `arp`: `preset`, `wave`, `speed` (`16`, `8`), `gain`, `cutoff`, `move`, `reso`, `drive`, `delay`.
- `hook`: `preset`, `mode` (`minor phrygian dorian mixolydian locrian chromatic`), `octave` (3 to 5), `wave`, `fm`, `vowel`, `harmony` (`''`, `2` thirds, `4` fifths), `drive`, `grit`, `delay`, `gain`, `cutoff`.
- `pad`: `preset`, `wave`, `gain`, `cutoff`, `move`, `drive`, `room`.
- `texture`: `sample` (`vinyl` is synthetic crackle, others are dirt-samples or custom), `rhythm`, `gain`, `grit`, `room`.
- `riser`: `gain`, `bars`, `dir` (`up` riser, `down` downlifter).

Every `…End` value enables an automation from the start to the end of the scene.

`steps` on `bass`, `guitar`, `arp`, `hook` and `pad`: one character per 16th (`x` plays, `.` rests), like a drum row. Empty means the preset rhythm (`channelSteps(state, ch)` returns what actually plays). Bass, guitar and pad use the steps as `.struct()`; when the preset holds the chord (pad without rhythm, guitar `held`), each note lasts until the next step (`x@3`). Arp and hook keep their note sequence and use the steps as `.mask()`: a step can silence a note but cannot add one where the melody rests. Changing the preset clears `steps`.

## Presets (in `src/music.js`)

- Progressions (`PROGS`, written in A): `epica notturna euforica ipnotica malinconica cyber pendolo anthem ascesa andalusa prog lofi jazz frigio drone tensione arcade dorico`. Two-bar chords are written by repeating the chord.
- Bass (`BASS`): `rolling offbeat rumble galoppo ottavi walking sub pumping` plus riffs `spirale mirino tritono ottaveArcade`.
- Guitar patterns (`GUITAR_PATTERNS`): riffs `thrash gallopRiff groove djentRiff heroic stomp industrial`, rhythms `power8 chug gallop riff djent quarter held`.
- Arp (`ARPS`): `su sugiu pulsar pedale spezzato acid` (digits 0 to 3 are chord tones).
- Hook (`HOOKS`): scale-degree melodies (`richiamo … orizzonte`) and chromatic ones in semitones (`allarme colpi boss arcade arcadeB segnale`).
- Pad (`PADS`): `pad stab pump sidechain staccato synco comp power riff ring`.
- Grooves (`GROOVES`): `trance rolling breakbeat halftime techno hard rock boombap prog78 prog54 metal gallopDrums blast phonk`.
- Kits: `RolandTR909 RolandTR808 RolandTR707 RolandTR606 LinnDrum AkaiLinn LinnLM1 OberheimDMX EmuSP12 AkaiMPC60 AlesisHR16 YamahaRX5`.
- Waves: oscillators plus General MIDI soundfonts (electric piano, organs, guitars, basses, strings, choir, flute, celesta, bells, marimba, 808 cowbell…).

## Presets as ideas

Every preset is also stored as an idea (idea-model, #70): `BASS.rolling.idea` is `{ rhythm: "[~ x x x]", per: "beat", half: "[~ x]" }`, a riff is `{ rhythm, add, per: "slot" }` (its onsets and its semitones per 16th), `ARPS` hold an `index` per note slot, `HOOKS` their `degrees` per 8th, `PADS` and `GUITAR_PATTERNS` a rhythm or `hold`, `GROOVES` sequencer steps per row (`{ beat: { bd: "0,4,8,12", grid: 16 } }`), `TEX_RHYTHMS` a rhythm and an `n` source. `presetIdea(type, channel)` returns the idea of a channel's preset. Compose, the director and the recipes keep picking presets by name.

`src/song/ideas.js` holds the idea writer, shared by every profile:

- `writeIdea(idea, ctx)`: the code of an idea for one clip, in its shortest exact form (ctx: meter steps, chords of the bars from the clip start, key, swing, the channel's settings, the song's shared progressions, the variant switched on, a thinning mask).
- `expandIdea(idea, ctx)`: the steps one bar of the idea plays (`{ steps }`, drums `{ rows }`), for Crescendo thinning, `channelSteps` and the step row in Compose.
- `ideaLadder(idea, ctx, n)`: simpler forms of the idea for the Live coder's growth (one hit per beat, the strongest onsets of a cell, the chord held, root and fifth, the first degree, the first bar of an alternation, a progression without its transposition).
- `seqForm(tokens)`, `drumRow(id, steps)`, `beatForm(cell, half, n)`, `altForm(items)`: the shortest exact form of written material: a repeated cell (`[~ x x x]*4`), runs (`0!6 1 0!5`), repeated groups (`[0 12]!6 [-2 10]!2`), sequencer steps (`s("bd").beat("0,7,10",16)`) when shorter, an alternation without repeated bars (`<a1!2 g1!2>`). Drum rows may take a coarser grid (`bd*4`): a sample plays to its end, so a longer step sounds the same (not under `ply`, `rev`, `jux` or `degradeBy`). Melodic notes keep their lengths. A `*n` cell is never written around an alternation (it would count its own cycles faster).
- The rules of the idiomatic generator (`src/song/idiom.js`: the progression on top, `.arp()`) moved into the writer; `idiomatic()` stays for code the writer did not write and leaves the writer's code as it is.

`tools/check-ideas.cjs` (dev server) proves the sound: the events of every song in `songs/` and `songs/examples/`, and of a few states of each Crescendo build, are the same as with the code written before the change (`tests/snapshots/code-before-ideas/`).

## Compiler

The app compiles every song with `compileSong` (`src/song/compile.js`, format reference in `docs/SONG-FORMAT.md`): each clip is generated by `sceneLayers(state, { only: type })`, the per-instrument code generator. Songs saved by older versions as scenes are converted with `fromScenes`; the conversion was checked layer by layer against the old scene compiler before it was removed.


- Emits `setcpm`, then `const SECTIONS = [['name', bars], …]` and `const TEMPO = {'name': bpm | [[1, bpm], …]}` on single lines with single quotes (read by `parseSong`).
- Each section gets a lane `const sectionN = "<1!8 0.67 …>"` (one value per bar); clips that cover only part of a section get their own `clipN` lane. Layers use `.mask(lane).velocity(lane)`, so fades overlap the outgoing and incoming section. The guitar uses `.mask(lane).postgain(lane.mul(level))` instead.
- Chords, hook phrases and automations are rotated so they start at the scene's first bar.
- Rhythms are per-beat templates `[beat, half beat]` repeated for the bar length (`[~ x x x]*4`), with `@` weights for a half beat (7/8). Riffs are 16th-step strings of semitone offsets: `.struct()` plus `.transpose("0!6 1 0!5 3 0 1 0")`. Every string is written in its shortest exact form (see Presets as ideas).
- Shared progressions of the song (`shared`) are written once after the section lanes (`const bline = "…"`); tracks read them by name (`n(bline.sub(14))`). Prepared variants of an idea are written at the end of its first line as a comment (`// .add("0 0 4 0 5")`) until a `variant` step switches one on.
- Odd meters: `TEMPO` is stored as "4/4 BPM" (`bpm * 16 / steps per bar`); labels show the real BPM.
- Every layer ends with `.analyze("<instrument>")` for the visuals.
- Each instrument has its own orbit (`.orbit(n)`: drums 1, bass 2, arp 3, hook 4, guitar 5, pad 6, texture 7, riser 8). In superdough, delay time, feedback and reverb size belong to the orbit, so separate orbits keep them independent per instrument.

## Writing a new song

Write a JSON file in `songs/` (see `docs/COMPOSING.md`), add its id to `songs/index.json`, validate with `npm run check:songs`, then run `node tools/check-levels.cjs <id>` and balance: target peaks around 0.5 for kick and lead elements, keep the sum under the master limit. Update the snapshots (`npm run snapshot:code`, `node tools/snapshot-levels.cjs write <id>`).

Guidelines from the owner's feedback: 4 to 5 layers per section; tension over sweetness; reels start at full energy (cut them from the strongest sections of a full song); avoid hard cuts between sections; vary the material between songs.

## Strudel functions

Before a generator writes a Strudel function it did not write before, look it up in `docs/STRUDEL-FUNCTIONS.md` (the catalog of the installed version, with synonyms, parameters and an example) and check it is not marked undocumented or reserved by an app function (`chan`, `crunch`, the library functions and the song functions never take a Strudel name: `npm run check:strudel` fails if they do). `npm run check:strudel` fails when generated code calls a name that is not in the catalog. After updating Strudel, rebuild the catalog with `npm run catalog:strudel` (the check fails until then); the hand notes in `docs/strudel/variety.json` stay.

## Strudel gotchas (learned the hard way)

- `.cps()` inside a pattern recomputes queued haps with a stale reference and drops notes. Change tempo from outside with `scheduler.setCps` at bar boundaries.
- In evaluated code, double-quoted strings and backticks are mini-notation, even inside helper functions. Use single quotes for plain JS strings and `mini('…')` to turn a string into a pattern. Plain strings passed to `note()` or `.scale()` are not parsed as mini-notation.
- Mini-notation numbers need a leading zero (`0.33`, not `.33`).
- `velocity` set by a layer is overwritten by the scene lane: shape volume with `postgain`.
- Before heavy distortion, `gain` only changes saturation: control guitar level after it with `postgain`.
- General MIDI soundfonts have very different levels (vibraphone and organ are far quieter than electric piano): measure and balance.
- Some kits lack samples (YamahaRX5, AlesisHR16, KorgMinipops have no crash; the compiler borrows the 909 crash).
- Scene names lose quotes and apostrophes (`safeName`).
- The sum of all layers can exceed 1.0; the app keeps Strudel's master at 0.6.
