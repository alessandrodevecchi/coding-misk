# Composing with coding-misk

How to write songs as code, for humans and agents. coding-misk extends [Strudel](https://strudel.cc/) with sections, tracks and clips: you describe the song in JSON, the app compiles it to readable Strudel code and plays it. The field reference is [SONG-FORMAT.md](SONG-FORMAT.md).

This guide grows with the project. Today songs are written as JSON files in `songs/` (the app lists them in the Tracks tab, under the coded tracks); the arranger will edit the same format.

## The model in one minute

- **Sections** are the timeline: intro, build, drop. Each holds tempo, meter, key and chords for every track.
- **Tracks** are instruments: as many as you want, of any type, even three guitars.
- **Patterns** are what a track plays: a drum grid, a preset, steps, notes, or Strudel code.
- **Clips** place a pattern on the timeline: over a whole section, or from any bar for any number of bars.
- **Shared versus own.** Sections keep the tracks together (pulse, harmony). Each track keeps its own sound, rhythm, notes, effects and bus.

## Workflow

1. Copy an example from `songs/examples/` and give it a new `id` and `title`.
2. Write sections first: bars, BPM, key, chords.
3. Add tracks one at a time, starting with drums and bass.
4. Validate: `node --no-warnings tools/song.mjs validate songs/my-song.json`. Fix every error; read every warning.
5. Look at the code: `node --no-warnings tools/song.mjs compile songs/my-song.json`.
6. Listen in the app (`npm run dev`, Tracks tab). An agent cannot hear: measure instead (see "Checking levels").

## Example 1: first beat

[`songs/examples/01-first-beat.json`](../songs/examples/01-first-beat.json): one section, one drum track.

```json
"patterns": {
  "A": { "rows": { "bd": "x...x...x...x...", "cp": "....x.......x...", "hh": "..x...x...x...x." } }
},
"clips": [{ "section": "Loop", "pattern": "A" }]
```

Each row is 16 steps (one bar of 16ths in 4/4). Four on the floor on `bd`, clap on beats 2 and 4, off-beat hats. The compiled code is one Strudel layer per row:

```js
$: s("[bd ~ ~ ~] [bd ~ ~ ~] [bd ~ ~ ~] [bd ~ ~ ~]").bank("RolandTR909").gain(0.6).mask(section1).velocity(section1).orbit(1).analyze("kick")
```

## Example 2: bass and chords

[`songs/examples/02-bass-and-chords.json`](../songs/examples/02-bass-and-chords.json): two sections with different progressions, a bass line written as chord tones, a pad only in the chorus.

```json
"walk": { "preset": "sub", "notes": "0 ~ 0 2 ~ 0 3 ~ 0 ~ 0 2 ~ 1 2 ~" }
```

`0` is the root of the current chord, `2` the fifth, `3` the top note, `1` the third. The line follows the chords (`malinconica` in the verse, `epica` in the chorus) without rewriting it. The bass clip uses `"start": 0, "bars": 16` to cover both sections; a clip spanning sections follows each section's harmony.

## Example 3: two guitars, a hook and a code track

[`songs/examples/03-night-shift.json`](../songs/examples/03-night-shift.json) shows the rest:

- **Two guitar tracks:** `riff` (metal type, `stomp` riff, tuned down) plays the drop; `wall` (held chords, quieter, more reverb) enters at bar 17 (`"start": 16`) and fades out in the outro with `"set": { "gainEnd": 0 }`.
- **A clip that starts mid-section:** the bass starts at bar 5 of the intro (`"start": 4`), the hook at bar 13 (`"start": 12`).
- **Hook as scale degrees:** `"<[0 ~ 1 ~ 0 ~ [~ 4] 3] [1 ~ 0 ~ ~ ~ ~ ~]>"` in E phrygian: `1` is the flat second, which gives the dark colour; `<…>` alternates two bars.
- **Section cues:** the drop fades in over 1 bar, starts with a crash, and leaves half a bar of silence at its end (`breath`) before the outro.
- **A code track:** radio static written directly in Strudel:

```json
{ "id": "noise", "type": "code", "settings": { "visual": "fx" },
  "patterns": { "static": { "code": "s(\"white*16\").decay(.03).sustain(0).hpf(6000).gain(perlin.range(.05, .25)).pan(rand)" } },
  "clips": [{ "section": "Intro", "pattern": "static" }, { "section": "Outro", "pattern": "static" }] }
```

## Patterns in practice

- **Drums:** start from a groove (`GROOVES` in `src/music.js`: trance, rolling, breakbeat, halftime, techno, hard, rock, boombap, metal, phonk, …) and vary one row per section.
- **Bass:** a preset for the feel (`rolling` for techno, `walking` for lo-fi, `galoppo` for metal, riffs like `spirale` or `tritono` for tension), or `notes` for your own line. `steps` change the rhythm of a preset without touching its notes.
- **Guitar:** riffs (`stomp`, `industrial`, `thrash`, `djentRiff`) carry their own notes; rhythms (`power8`, `chug`, `held`) play the chords. `steps` redraw the rhythm.
- **Arp:** chord tones in a fixed order; `notes` writes your own order (`"0 2 1 3"`).
- **Hook:** the melody. Presets cover call and response, descents, chromatic hits (`allarme`, `colpi`, `boss`); `notes` writes your own.
- **Pad:** the harmonic bed. `pad` holds, `stab`, `pump`, `sidechain` and `synco` add rhythm.
- **Code tracks:** anything Strudel can do inside one pattern: `note()`, `s()`, `.scale()`, `.arp()`, `.off()`, `.jux()`, `.degradeBy()`, signals like `sine` and `perlin`. Harmony is not applied: write notes in the song key yourself.

## Taste rules (from the owner)

- 4 to 5 tracks playing at the same time. The validator warns above 6.
- Tension over sweetness: tritones, flat seconds, octave jumps, repeated notes and silence. Use `phrygian`, `locrian` or `chromatic` hooks and one-chord or b2 progressions (`drone`, `tensione`, `frigio`).
- Reels and short videos start at full energy: no long build-up.
- Avoid hard cuts that sound like a different song: use `fade`, a continuous layer across sections, or a transition section.
- Vary the material between songs.

## Checking levels

Target peaks around 0.5 for kick and lead parts, lower for pads and textures. General MIDI sounds differ a lot in level (organs and vibraphone are quiet, electric piano is loud): measure and adjust `gain`. The app keeps Strudel's master at 0.6, so the sum may go above 1.

Measure a song in the app with Playwright: play each section and read the analysers, as `tools/snapshot-levels.cjs` does for built-in tracks.

## Strudel details that matter

- Tempo changes come from the sections; never put `.cps()` or `setcps` in code tracks.
- In code tracks, double quotes and backticks are mini-notation; numbers need a leading zero (`0.5`, not `.5`) inside mini-notation strings.
- Distortion before the volume: the guitar's level is applied after its amp, so `gain` stays meaningful with heavy drive.
- More in [MUSIC-ENGINE.md](MUSIC-ENGINE.md), section "Strudel gotchas".
