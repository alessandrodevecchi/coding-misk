# Composing with coding-misk

How to write songs as code, for humans and agents. coding-misk extends [Strudel](https://strudel.cc/) with sections, tracks and clips: you describe the song in JSON, the app compiles it to readable Strudel code and plays it. The field reference is [SONG-FORMAT.md](SONG-FORMAT.md).

This guide grows with the project. Songs are JSON files in `songs/`; the arranger in the Compose tab edits the same format, and Save keeps your version in the browser.

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
6. Listen in the app (`npm run dev`, pick the song in Compose or in the Songs tab). Add new files to `songs/index.json` to set their place in the library. An agent cannot hear: measure instead (see "Checking levels").

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

## Example 4: parts as ideas

[`songs/examples/04-ideas.json`](../songs/examples/04-ideas.json) writes every part as an idea (`docs/SONG-FORMAT.md`, Ideas), the way a live coder writes it, instead of steps and notes written out:

- **Drums as sequencer steps:** `{ "beat": { "bd": "0,4,8,12", "hh": "2,6,10,14", "grid": 16 } }`. The code takes the shortest form with the same hits: `s("bd*4")`, `s("[~ hh]*4")`.
- **A shared bass line:** `"shared": { "bline": "<[0 ~ 0 3] [5 ~ 3 ~] [0 ~ 0 3] [-2 ~ 0 ~]>" }` holds scale degrees once. The bass reads it two octaves down (`"from": "bline", "sub": 14`) on its own rhythm (`"rhythm": "[x x ~ x]*4"`), the lead one octave down (`"sub": 7`). The code declares `const bline = "…"` once.
- **Voiced chords and a seeded arpeggio:** the arp holds `"chords": "<Am7 F^7 C^7 G7>"` with `"voicing": { "anchor": "c5", "mode": "below" }`; its notes are positions inside each voiced chord chosen by `irand(5).seg(16).rib(3, 2)`: random, but the same two bars every time. The pad voices the section's progression and holds it (`"hold": true`).
- **A prepared variant:** the bass carries `"variants": [{ "add": "0 0 4 0 5" }]`. The code shows it commented out, `// .add("0 0 4 0 5")`, until the live build step `{ "at": 16, "variant": { "track": "bass", "use": 0 } }` switches it on.

Write an idea by hand when a part is a small cell that repeats or moves (a rhythm, a line of degrees, chords with a voicing); keep `steps` and `notes` for parts drawn note by note. Randomness always needs a `seed` and `cycles`, and only picks indices inside a chord, sample slices or values (a filter, the pan): melodies stay written by hand.

## Example 5: composed parts and FM

[`songs/examples/05-material.json`](../songs/examples/05-material.json) holds parts made by the material generator (`docs/ENDLESS.md`, Material) and one test phrase for each FM sound kind at the top of its range: a melody with a changed tail, a polymetric lead in 7/8 (`"{-2 2 ~ 5 4}%14"`), basslines with an octave line as rhythm, a seeded and a polymetric arpeggio, a pad voicing the section's chords and a new progression on A phrygian, and the `fm` rack device (`{ "device": "fm", "index": 3, "harmonicity": 3.5, "decay": 0.4, "sustain": 0 }`). In Compose, [Compose a part] in a track's panel makes such a pattern for any song.

## Example 6: the voice instrument

[`songs/examples/06-voices.json`](../songs/examples/06-voices.json) speaks in the four ways of the voice instrument, a track of type `spoken` (`docs/SONG-FORMAT.md`, Voice instrument): an opening line in the intro that ends one beat before the drums come in (`"before": "drums"`), a chopped word in the second half of the groove (`"slices": 8, "rhythm": "0 ~ 1 ~ 2 3 ~ 3"`), a spoken passage on a second track in the break, ending before the drop, and a refrain drawn from the night vocabulary every two bars of the outro. The two spoken tracks have their own speakers, and the narrator a third; when the narrator would speak on a bar where a line sounds, it is quiet. The test songs `prova-voce-notte` (a spoken opening, a refrain from the dark cyberpunk style, the poetic narrator) and `prova-voce-taglio` (an opening, a chop with a crushed robot voice, a passage drawn from the machine vocabulary) build with the Live coder profile.

Keep spoken lines in quiet parts and short: a refrain of two or three words, a passage of a few short sentences (12 words at most). A chop counts as a layer; the other ways sit on top of the 4 to 5 layers. Run `npm run voices` after adding lines: without samples the lines stay silent.

## The rack

Each track can chain devices after the instrument: delays, reverbs, distortion, phaser, tremolo, filters, panning, and note devices that change what plays (echo, offset copies, repeats, random drops, reverse). Each device is one Strudel function, shown next to its name in the app. Example 3 gives the hook a dotted-8th delay with a slow auto-pan, and the guitar wall a large reverb with a tremolo:

```json
"rack": [{ "device": "delay", "amount": 0.35, "time": 0.1875, "feedback": 0.5 }, { "device": "pan", "motion": "slow" }]
```

FM works only on synth oscillators. For an FM-like colour on drums, samples and voices, use **Fold** (the wave folded back on itself: bright, hollow, metallic; Amount and Curve) or **Ring (trial)** (the sound times a sine wave: bells, metal, robot voices; Frequency and Amount). Fold folds only what is loud enough: drums, basses and voices fold from Amount 1.5, quiet pads need 2.5 or more. A folded line never goes above its own peak or the usual peak of its track type. Fold uses the same Strudel stage as Distortion and the track's own drive (Saturation on drums, the guitar's distortion): it takes their place.

```json
"rack": [{ "device": "fold", "amount": 2, "curve": "soft" }, { "device": "ring", "freq": 440, "amount": 0.6 }]
```

In the app, the arranger has two views of the same song: **Free timeline** (the default) and **Sections** (a cell per track and section, quick to fill). The free timeline places clips at any bar: click an empty lane to add one, drag to move, drag the right edge to resize, arrows and Shift + arrows on the selected clip. Above the sections, a player ruler shows the time and a cursor: click or drag it to start from any point, arrow keys move one bar. Switching views loses nothing: a section covered by free clips shows a striped cell in the sections view. The track panel has three views: "All in <section>" (the default) with the complete editor of every track that plays in the selected section, one under the other; "Selected track" with the editor of one track; "Section summary" with a compact card per playing track (patterns, volume, filter, drive, rhythm, rack).

## Live build

[`songs/primo-segnale.json`](../songs/primo-segnale.json) builds itself in front of the listener: one section of 96 bars, six tracks with clips over the whole section, and a `build` list that brings them in one at a time, opens a filter, adds a delay, takes the drums out for a breakdown and strips everything back at the end. Each step carries a comment of two or three words ("more rhythm", "add distortion"), shown over the stage and written in the code.

- Start from one sound and change one thing every 4 to 8 bars.
- Keep at most 4 to 5 tracks playing at a time: remove one when another comes in.
- Write comments as a performer would say them: very short, about what the music needs.
- Check the order with `node --no-warnings tools/song.mjs steps songs/my-song.json` and the code at a bar with `compile … --at N`.
- Take over by hand at any moment: type in the code (a click, a selection or a copy does not count) and the steps stop, the music goes on and Ctrl+Enter plays your code, even past the end of the song. "Resume live build" types the song's code back and the steps go on: with "from where I was" (on by default) the song goes back to the bar where you started typing, otherwise it goes on from where it has got to; your code stays in "Your last code" under the editor, with "Back to this code". In the Radio, by hand holds the song on air until you resume.
- Add a track of type `voice` and run `npm run voices` after writing new comments: each phrase becomes a spoken sample, shaped by the voice track's knobs and rack (Primo Segnale: higher pitch, distortion, low cut, delay, reverb).

### Profiles

The Profile menu next to "Live build" picks how a song builds and looks while it plays: Classic (in blocks), Crescendo (small steps) or Live coder (like a live coder: few lines, functions one at a time, pauses). Every control next to it (build style, code view, generator, comments, title, lit notes, fully narrated) can be changed by hand: the profile shows as custom until you pick a profile again. A song or a style can name its profile (`"profile": "switch"` is the Live coder profile: its id stayed `switch` when it was renamed).

### Crescendo

Set "Build style" to crescendo (next to "Live build") and a song grows from one sound to the song as written in small steps (#64), with no steps to write. The growth repeats the first full section, first over one held chord, then the song plays as written. Each track enters on a thinned version of its pattern, then its pattern fills up, its filter opens and its effects come in one at a time; the drums stop once or twice and come back. The ending is drawn per song: stripped back, cut in blocks, or as written. "Fully narrated" makes almost every step speak. The code menu next to it picks the view: code of the moment (the default: only the section that plays, the next section's lines prepared muted before it starts), compact code ( identical lines of a track joined under one lane, the tracks still to come as `_$:` lines), one line per track (also the values that change between sections in the same line, as sequences over the bars or picked by bar), or code per section like any song. Every profile writes the patterns short, like a live coder: `bd*4`, `[~ hh]*4`, repeated cells, equal groups with `!`, a bass line written once with its roots added on top, arpeggios with `.arp()` (idea-model); the generator menu only matters for code written by older versions. All views sound the same. In the Live coder profile a part that is an idea (presets included) grows from its simple form: a bass cell from one note per beat to its written cell, an arpeggio from the chord held to root and fifth to its order, a hook from its first degree to its first bar to the whole line. A song file can declare `"buildStyle": "crescendo"` to open in it; the three `crescendo-*` songs in `songs/` are written for it (short, medium, long).

### Growth shapes

With the Live coder profile a song does not always open from one kick: its growth follows a shape of three parts (growth-shapes, #64), shown and set in the live build options under "Growth shape".

- **Opening:** Slow (one kick on beat one that grows), full kick (the written kick row), from silence (one or more silent bars while the first line is typed; the first sound is that line), broken beat (the kick's off-beat hits, or a tresillo or two-step kick when the written kick is straight), filtered kick (the full kick behind a low-pass at 300 Hz that opens), melodic (an arpeggio, a hook or a guitar first; drums later), pad or drone, voice (waits for the voice instrument), muted base (every track written from the start, all but one muted with `_$:`, each step removes one `_`), mid-set (two tracks playing in solo with `S$:`, the others written; each step removes one `S`).
- **Pace:** slow keeps the natural spacing (4 to 8 bars and long pauses). Medium spaces the first minute's steps 10 to 15 seconds apart, fast 7.6 to 9 seconds with small moves (the opening track's levels, knobs and functions first, new lines later); after the first minute 2 to 6 bars. With medium and fast a drum track fills up right after it comes in, one line per row (kick, snare or clap, hats), so the kick is whole within the first minute.
- **Development:** by type (drums, bass, pad, then the rest), as written (in the order the clips start), masks (each track after the first gets a mask per phrase, `.mask("<1 1 0 1>")`, varied once and taken away at the end), parameters only (every track in the first two waypoints, then only filters, density, reverb and delay), second section (half of the tracks grows, then the others come in alone with `S$:` and grow by their patterns, then the marks go), metamorphosis (the song as written in one to three steps, then from a phrase boundary a new tempo within 12 BPM or half or double, a key a fifth away, and each line rewritten with a part composed for another style of the same family; the build ends on that skin).
- **Moves and second thoughts:** a beat step moved by a sixteenth and put back, a prepared variant uncommented and commented again, `seg(16)` on a pad or guitar (a held chord in sixteenths) and taken away, a cutoff that slides in five small moves, a melody that passes by on the way to the second waypoint and leaves before it really comes in (always the song's own part, in its scale). A beat written as an idea grows one step number at a time.

Who chooses: the Compose control, else the song's `growthShape`, else the weights of its style (`growthShapes`), else the song's seed (stream `shape-<SHAPES_SEED>`); impossible values are left out first, and the same song always draws the same shape. When the development or the pace is automatic and the drawn shape would make the human typing rush a step (measured on the Live coder code, `src/live/typing-load.js`), the next development by weight is tried (by type last), then by type with the other paces, then the same with less detail; the first without rushed steps plays, else the one rushed least in all (the sum of the excess). Values named by the song or in Compose are never replaced. This takes up to about 2.5 s the first time a song builds (cached after). Classic and Crescendo never use shapes.

**Typing never rushes.** The human typing types each step between the step before and the step itself. A shaped growth measures each edit as the Live coder view writes it (the leanest typing a person needs) and gives the step the bars it needs: first from the growth's budget, then from long listening pauses, and a small edit of the same line joins the step before it. A section boundary inside the growth (the progression, the second skin) gets the time to type its new lines two bars before it. A step that changes nothing heard (a level equal to the next) shares the bar of the step before. When a new line (a track coming in, a line copied from one above and still to edit) cannot be typed at a person's pace in the time before its step, the human typing pastes it whole after the short paste pause, longest first, instead of typing faster (`typingPlan`, human style only; never a comment or the voice's code). `tools/check-crescendo.mjs` measures the typing of every step (`tools/growth-measure.mjs`, `typingLoad`).

`SHAPES_VERSION` in `src/song/shapes.js` goes up when an intended change to the shape rules moves the Live coder fixtures (`node tools/check-crescendo.mjs --write-fixtures`, `tools/fixtures/live-coder.json`); the Crescendo fixtures never move with it.

## Endless sessions
## Endless sessions

The endless director writes songs like these on its own, from style recipes (`docs/STYLES.md`, `docs/ENDLESS.md`):

```sh
npm run endless -- --styles synthwave,jazz,country --chaos 1 --minutes 20 --seed aurora --join
```

The command writes each song and `session.json` to `songs/endless/` (git-ignored), and with `--join` one more song with the whole session in order. The songs appear in the Songs tab after a reload. The report prints one line per song (title, length, tempo, key, shape, tracks, style of each part) and one line per phrase (target and measured energy, moves, comment). The same seed gives the same session; without `--seed` the command prints the seed it chose.

## Patterns in practice

- **Drums:** start from a groove (`GROOVES` in `src/music.js`: trance, rolling, breakbeat, halftime, techno, hard, rock, boombap, metal, phonk, …) and vary one row per section.
- **Bass:** a preset for the feel (`rolling` for techno, `walking` for lo-fi, `galoppo` for metal, riffs like `spirale` or `tritono` for tension), or `notes` for your own line. `steps` change the rhythm of a preset without touching its notes.
- **Guitar:** riffs (`stomp`, `industrial`, `thrash`, `djentRiff`) carry their own notes; rhythms (`power8`, `chug`, `held`) play the chords. `steps` redraw the rhythm.
- **Arp:** chord tones in a fixed order; `notes` writes your own order (`"0 2 1 3"`).
- **Hook:** the melody. Presets cover call and response, descents, chromatic hits (`allarme`, `colpi`, `boss`); `notes` writes your own.
- **Pad:** the harmonic bed. `pad` holds, `stab`, `pump`, `sidechain` and `synco` add rhythm.
- **Ideas:** any of the parts above can be an `idea` instead (Example 4): a cell with its repetition, sequencer steps, degrees, chords with a voicing, a seeded random source, a shared progression, prepared variants. Presets are ideas too, so the code of every song is short: a rolling bass is `.struct("[~ x x x]*4")`.
- **Code tracks:** anything Strudel can do inside one pattern: `note()`, `s()`, `.scale()`, `.arp()`, `.off()`, `.jux()`, `.degradeBy()`, signals like `sine` and `perlin`. Harmony is not applied: write notes in the song key yourself.

## Taste rules (from the owner)

- 4 to 5 tracks playing at the same time. The validator warns above 6.
- Tension over sweetness: tritones, flat seconds, octave jumps, repeated notes and silence. Use `phrygian`, `locrian` or `chromatic` hooks and one-chord or b2 progressions (`drone`, `tensione`, `frigio`).
- Reels and short videos start at full energy: no long build-up.
- Avoid hard cuts that sound like a different song: use `fade`, a continuous layer across sections, or a transition section.
- Vary the material between songs.

## Checking levels

Target peaks around 0.5 for kick and lead parts, lower for pads and textures. General MIDI sounds differ a lot in level (organs and vibraphone are quiet, electric piano is loud): measure and adjust `gain`. The app keeps Strudel's master at 0.6, so the sum of the lines may go above 1 before it.

Measure a song in the app with Playwright: play each section and read the analysers, as `tools/snapshot-levels.cjs` does for built-in tracks. `node tools/check-levels.cjs <song>` also prints `out=`, the peak of the master output: that is the limit, above 1.0 the output clips. A single line above 1.0 is only a warning (a style can raise it with `headroom`). For a dirtier sound use distortion and `postgain`, not more `gain`.

## Strudel details that matter

- Tempo changes come from the sections; never put `.cps()` or `setcps` in code tracks.
- In code tracks, double quotes and backticks are mini-notation; numbers need a leading zero (`0.5`, not `.5`) inside mini-notation strings.
- Distortion before the volume: the guitar's level is applied after its amp, so `gain` stays meaningful with heavy drive.
- More in [MUSIC-ENGINE.md](MUSIC-ENGINE.md), section "Strudel gotchas".
