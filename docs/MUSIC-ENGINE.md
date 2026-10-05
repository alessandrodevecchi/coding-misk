# Music engine

## Track and scene model

```js
track = { id, title, look, style: { it, en }, scenes: [scene, …] }
scene = { name, bars, fade, crash, breath, fill, state }
```

- `fade`: bars of crossfade from the previous scene (0 = hard cut). Tempo also ramps over these bars.
- `crash`: crash cymbal on the first beat. `breath`: half bar of silence at the end (before a drop). `fill`: snare roll in the last bar.
- `state` follows `DEFAULT` in `src/music.js`; `normalizeState` fills fields missing from older saves.

`state` fields:

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

## Compiler (`compileTrack`)

- Emits `setcpm`, then `const SECTIONS = [['name', bars], …]` and `const TEMPO = {'name': bpm | [[1, bpm], …]}` on single lines with single quotes (read by `parseSong`).
- Each scene gets a lane `const sceneN = "<1!8 0.67 …>"` (one value per bar). Layers use `.mask(sceneN).velocity(sceneN)`, so fades overlap the outgoing and incoming scene. The guitar uses `.mask(sceneN).postgain(sceneN.mul(level))` instead.
- Chords, hook phrases and automations are rotated so they start at the scene's first bar.
- Rhythms are per-beat templates `[beat, half beat]` repeated for the bar length, with `@` weights for a half beat (7/8). Riffs are 16th-step strings of semitone offsets: `.struct()` plus `.transpose("0 0 1 0 …")`.
- Odd meters: `TEMPO` is stored as "4/4 BPM" (`bpm * 16 / steps per bar`); labels show the real BPM.
- Every layer ends with `.analyze("<instrument>")` for the visuals.
- Each instrument has its own orbit (`.orbit(n)`: drums 1, bass 2, arp 3, hook 4, guitar 5, pad 6, texture 7, riser 8). In superdough, delay time, feedback and reverb size belong to the orbit, so separate orbits keep them independent per instrument.

## Writing a new track

Add it to `src/tracks.js` with `makeScene(name, bars, opts, state => { … })` and the helpers there (`only`, `steps`, `guitar`, `acid`, `rumble`, `club…`). Put it in `BUILTIN_TRACKS`. Then run `node tools/check-levels.cjs <id>` and balance: target peaks around 0.5 for kick and lead elements, keep the sum under the master limit.

Guidelines from the owner's feedback: 4 to 5 layers per scene; tension over sweetness; reels start at full energy (`reelFrom`); avoid hard cuts between sections; vary the material between tracks.

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
