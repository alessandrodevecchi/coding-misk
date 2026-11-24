# Design

## Context

What the code does today (line numbers at `develop` 305be97):

- **Compose part.** `composePattern` (`src/main.js:4085-4110`) calls `compose(kind, { seed: '<song id>:<track id>:<n>', style: part.material, … })` with `n` from `composeNums`, a page-only counter. The style is `composeStyle()` (`src/main.js:4074`): the song's first style tag, else the style nearest its tempo and meter. It writes a new pattern only. Undo elsewhere in Compose is a toast with an Undo action (`src/main.js:3665-3667`).
- **Composed sounds.** `sound(r, { style, type, energy, octave })` (`src/material/sound.js`) picks a kind from `style.sounds` (`bell`, `reese`, `growl`, `dirty`, `square`, `tine`, `clang`, `sub`, `organ`) and returns `{ settings: { wave }, rack: [fm device] }` inside `FM_RANGES`. `fmInRange` checks it. It is called by `applyMaterial` (`src/endless/material.js:86-91`) when a recipe names sound kinds, and by the radio's Vary (`src/endless/steering.js:516`), which also draws a kit for drum tracks from the recipe's `kits`.
- **Style ranges.** A recipe instrument has `settings`, each a number or a range (`"cutoff": [300, 900]`, `"drive": [0, 0.4]`); the director draws them in `settingsFor` (`src/endless/director.js:85-90`). It also has `waves` and, for drums, `kits`.
- **Drums.** `groove(r, …)` (`src/material/drums.js`) returns `{ idea: { beat } }` only. The drum writer (`src/music.js:483-490`) writes one line per row: `s(row).bank(kit).gain(g × row mult).lpf(cutoff).distort(drive).distortvol(.5).crush(grit)` and the rest. Settings are per track (`kit`, `gain`, `cutoff`, `drive`, `grit`), so every hit of a piece sounds the same.
- **Random values.** An idea's `random` with `on` in `RANDOM_VALUES` (`src/song/ideas.js:310`) writes `.lpf(rand.range(a, b).rib(seed, cycles))` as an absolute value (`writeIdea`, `tail`, line 379). It replaces the track's own value (a `.gain(rand…)` replaces the track's gain). Only one source per idea, and drum ideas cannot hold one. The generator writes `random` only for arpeggio indices (`src/material/arp.js:42`).
- **Seeds.** `stream(seed, name)` (`src/endless/random.js`) gives independent named streams. `materialStream(seed, kind)` is `material:<kind>`. A new stream name never moves the draws of another.
- **Settings fields.** `SETTING_FIELDS` comes from the keys of `DEFAULT[type]` (`src/song/format.js:80`). Crescendo ramps settings it finds (`src/song/crescendo.js:278`). Live build `set` steps may set any setting field (`src/song/build.js:569`).
- **Levels.** Every line goes through the master level, the look-ahead limiter (ceiling 0.97) and the guard (`src/sounds/limiter.js`). Level targets: kick and leads about 0.5, the highest built-in kick 0.9 (`docs/knowledge/sound-and-levels.md`). The sound guard (`src/sounds/sound-guard.js`) swaps broken soundfont zones, and `kitRow` maps a row a kit lacks.
- **Versions.** `DIRECTOR_VERSION` 20, `SHAPES_VERSION` 10, `CRESCENDO_VERSION` 3. A saved radio session records them and warns when they differ. Precedent for an option that keeps old behaviour: `gestures: false` (`src/endless/director.js:64`).

## Goals / Non-Goals

**Goals:**

- A per-track dice in Compose for a new sound within the style, with locks, undo and seeded numbers.
- Composed drum tones per kit piece, inside safe ranges.
- Seeded per-hit variation written by the generator, small and in the style's character.
- Every existing song, saved session and fixture plays exactly as before.

**Non-Goals:**

- Live knobs: modulating a sounding note through `.bmod()` buses (future work).
- Rack "Sweep" devices with `.env()`, `.lfo()` and `lpenv` (future work).
- Variation of the FM index (D7), of tempo, pitch or note choice.
- Changing "Compose a part", the radio's sounds die (#50) or the drum patterns `groove()` draws.

## Decisions

### D1. Two new track settings: `tone` (drums) and `vary` (drums and melodic)

- **Where.** Both are track settings ("how it sounds"), not pattern fields, so every pattern of the track shares them and a clip's `set` can override them. They join `DEFAULT.drums` (`tone: null`, `vary: null`) and `DEFAULT.<bass|arp|hook|pad|guitar>` (`vary: null`), so `SETTING_FIELDS` lists them and the director's `settingsFor` skips them (null defaults are not copied).
- **Not grown, not stepped.** Crescendo does not ramp them (they are objects, skipped next to `pinned`), and a live build `set` step cannot set them in this version (the validator reports it). A Live coder growth types them as part of the track's line from its first step.
- **Why not idea fields.** An idea is a part (what plays). `idea.random` stays as it is for indices, slices and the hand-written absolute values. Putting tones in the pattern would make a re-rolled sound differ per pattern, and Compose part would overwrite it.
- **Absent means today.** No field, no code: the writer adds nothing, so songs without them compile byte for byte as today (`check:code`).

### D2. `tone`: per kit piece group, inside a fixed safe table

```json
"settings": { "kit": "…", "tone": { "kick": { "decay": 0.35, "tune": -1, "drive": 0.2, "cutoff": 9000 }, "snare": { "decay": 0.2 }, "hats": { "decay": 0.06, "cutoff": 12000 } } }
```

- **Groups.** `kick` (row `bd`), `snare` (rows `sd`, `cp`), `hats` (rows `hh`, `oh`, `rd`). Each value is optional.
- **Safe table** (`TONE_RANGES` in `src/material/tone.js`, measured and narrowed in task 2.4):

| Group | decay (s) | tune (semitones) | drive | cutoff (Hz, low-pass) |
| --- | --- | --- | --- | --- |
| kick | 0.15 to 0.8 | -3 to 2 | 0 to 0.6 | 1500 to 20000 |
| snare | 0.08 to 0.5 | -2 to 3 | 0 to 0.8 | 2500 to 20000 |
| hats | 0.03 to 0.3 | -2 to 4 | 0 to 0.3 | 5000 to 20000 |

- **Code per row line.** `decay` writes `.decay(d).sustain(0)` (a sample plays its envelope only when sustain is under 1); `tune` writes `.speed(2^(t/12))` rounded to 3 places; `drive` writes `.distort(x).distortvol(.5)` and wins over the track's `drive` on that row (one `distort` per line); `cutoff` writes `.lpf(c)` and wins over the track's `cutoff` only when lower. The open hat with a decay shorter than its step length is the classic closed and open contrast, so `oh` gets `max(decay, 2 × hats decay)`.
- **Order.** The tone goes right after `.bank(kit)` and before swing, the rack and the analyser, so rack devices still act on top of it.
- **Levels.** No value raises a row above its untoned peak by more than the drive's own rise, which `distortvol(.5)` already halves (the same rule as the track drive today). A short decay and a low cutoff only lower the level. Task 2.4 measures the peaks in the browser (D9).
- **Sound guard.** Tones load no new sample and name no row: `kitRow` and the guard work as today. `speed` changes a sample's length, not its file.

### D3. How the generator draws tones

- **Stream.** `compose('tone', { seed, style, energy })` draws from `material:tone`, a new stream. `groove()` and its stream do not change, so every drum pattern stays as today (`check:material` fixtures).
- **Draw.** For each group: a value inside the style's range (`drums.material.tones`, D8) intersected with the safe table, else inside the safe table's middle half. Energy moves it: higher energy, more drive and a brighter cutoff; lower energy, longer kick decay and darker hats. Each group is drawn from its own sub-stream (`material:tone/kick`, …), so a lock on one group (D5) never changes another's draw.
- **Where.** `applyMaterial` gives every drum track of a song one tone at session `sound` ≥ 1 (D6), drawn at the song's energy target A from `<session seed>:<index>:drums:tone`. The kick and beat tracks share it, like the groove. The radio's Vary, when it changes the kit of a drum track, also draws a tone from `<seed>:tone:<j>` at `sound` ≥ 1.

### D4. `vary`: seeded values per hit, relative to the track's own value

```json
"settings": { "vary": [{ "on": "lpf", "amount": 0.3, "seed": 41, "cycles": 4 }, { "on": "pan", "amount": 0.4, "seed": 7, "cycles": 2, "fn": "perlin" }, { "on": "decay", "amount": 0.25, "seed": 3, "cycles": 4, "row": "hh" }] }
```

- **Entry.** `on` (target), `amount` (0 to the target's cap), `seed` (whole number), `cycles` (loop length in bars, 1 to 8), `fn` (`rand`, the default, a new value each hit; `perlin`, a smooth one), `row` (drums only: one row, else every row). At most three entries per track, one per target and row.
- **Relative.** The writer computes the range from the track's own value `v` and the amount `a`, so variation stays around what the user or the style chose:

| Target | Range written | Cap of `amount` | Note |
| --- | --- | --- | --- |
| `lpf` | `v × (1 - a)` to `v` (`v` = cutoff, 18000 when open) | 0.6 | never brighter than the track |
| `hpf` | `v` to `v + a × 2000` | 0.5 | |
| `pan` | `0.5 - a/2` to `0.5 + a/2` | 0.8 | `perlin` by default |
| `gain` | `v × (1 - a)` to `v` | 0.3 | folded into the track's gain value; never louder |
| `delay`, `room` | `v` to `v + a × 0.5` | 0.6 | `v` = the track's value or 0 |
| `decay` | `v × (1 - a)` to `v × (1 + a/2)` | 0.5 | `v` = the preset's decay, or the tone's |
| `distort` | `v` to `v + a × 1.5`, with `distortvol(.5)` | 0.4 | never on bass in this version |
| `crush` | `16 - a × 10` to 16 bits | 0.8 | |
| `vowel` | one of `a e i o u`, `round(a × 4) + 1` of them | 1 | `irand(n).rib(seed, cycles).pick([...])` |

- **Code.** `.lpf(rand.range(2400, 4000).rib(41, 4))`, built with `randomCode` (`src/song/ideas.js:323`). The value is sampled at each hit's onset, so no `seg` is needed. `rib` makes the random values loop every `cycles` bars, so the same song sounds the same everywhere: Strudel's `rand` and `perlin` depend only on time, never on `Math.random`.
- **Merged, not stacked.** A target the track already writes (the track's `lpf`, `gain`, a preset's `decay`) is replaced in place by the varied value, so one call per control stays on the line. A target that the track automates (`cutoffEnd`, `gainEnd`, `move`) or that a rack device writes later on the line (for example a Delay device for `delay`) is skipped, and the validator warns.
- **Why relative.** The hand form (`idea.random` with an absolute range) can make a hat louder than its track or open a filter the user closed. A relative amount keeps the user's sound as the ceiling and can be checked against one cap per target.
- **Strudel.** Every target is a pattern-able control in Strudel 1.2.6 (`docs/STRUDEL-FUNCTIONS.md`): `decay`, `distort`, `crush`, `vowel`, `lpf`, `hpf`, `pan`, `gain`, `delay`, `room`. `rib`, `rand`, `perlin` and `pick` must be in the catalog; `check:strudel` fails otherwise (task 3.2). `decay` on a sample needs `sustain` under 1: the target is offered on drums only where a tone sets the decay.

### D5. The sound dice in Compose

- **Where.** A dice button (`DICE`, `src/icons.js:5`) with a number next to it, in the track panel's sound row, for `drums`, `bass`, `arp`, `hook`, `pad` and `guitar` tracks. Not for code, texture, riser, voice and spoken tracks.
- **Seed.** `<song id>:<track id>:sound:<n>`. A press of «New sound» draws with `n` = the highest number in the track's sound history plus one (D10). The number field applies a number by itself (D10). A song without a style tag uses `composeStyle()`; with no recipe at all the button is disabled with a tooltip.
- **Lock groups.** Each group draws from its own sub-stream of the seed (`sound/<group>`), so locking one never changes what the others draw:

| Track | Groups |
| --- | --- |
| Synth (bass, arp, hook, pad) | Sound (`wave` and the `fm` device, or a wave from `waves`), Filter (`cutoff`, `reso` in the style's ranges), Effects (`delay`, `room`, `drive` in the style's ranges), Variation (`vary`) |
| Guitar | Sound (`type`), Effects (`drive`), Variation |
| Drums | Kit (from `kits`), Kick, Snare and clap, Hats (the tone groups), Variation |

- **Never rolled.** The level (`gain`), the octave, the mode, the pattern, the clips and every rack device other than the `fm` device the dice put there. A user's own rack devices stay.
- **Synth sound.** When the style names sound kinds (`material.sounds`), the dice composes one with `compose('sound')`, which may add or replace the `fm` device. Otherwise it picks a wave from the style's `waves` other than the current one, and removes an `fm` device the dice added before.
- **Variation in the dice.** The Variation group draws a `vary` with the style's targets and amount (D8) at the Compose energy slider's value. An empty draw (amount 0) clears it.
- **Locks are remembered per song and track in the browser** (local storage, like the Compose trials), not in the song file. Open question 2.
- **Undo.** Each roll shows a toast "New sound #n" with Undo, which restores the track's settings, rack and sound history exactly as before the roll (hand edits included). A chip click and an applied number show a toast "Sound #n" with the same Undo. Earlier sounds come back through the history chips (D10).
- **Hearing it.** The dice works while the song plays: the change reaches the song through `changed()` at the next evaluation, and the pattern preview (headphones) plays it alone.

### D6. Existing songs and profiles keep their sound

- **New director option `sound`.** `OPTION_DEFAULTS.sound = 0`. At 0, `applyMaterial` and the steering draw no tone and no variation. At `SOUND_VERSION` (1) they do. The new draws use new stream names only (`material:tone`, `…:vary`), so at 1 every other draw (patterns, kits, waves, plans, titles, voice) is the same as at 0. The only difference is the new fields.
- **Who sets it.** New radio sessions, compilations and the New song panel record `sound: 1` in their recipe. A recipe without the field reads 0: every session saved in a playlist before this change replays as before, with no version warning. The command line keeps 0 unless `--sound 1` is given.
- **Fixtures do not move.** `check:endless` fixtures run at the default 0, so they stay byte for byte and `DIRECTOR_VERSION` stays 20. New fixtures at `sound: 1` are added, and a check asserts that a song at 1 minus its `tone` and `vary` fields equals the song at 0.
- **Songs.** A saved or built-in song has no `tone` or `vary`, so it compiles as today (`check:code`, `check:songs`, level snapshots, Crescendo and Live coder fixtures unchanged). Compose writes the fields only when the user presses the dice.
- **Classic and Crescendo.** Neither profile adds, removes or ramps the new fields (D1): they play what the song holds. A new radio song gets tones and variation whatever its profile, since the profile is about growth (open question 1).
- **Later changes.** A change that moves the draws at `sound` ≥ 1 raises `SOUND_VERSION`; a session saved at an older value warns that it may sound different, like `DIRECTOR_VERSION`.

### D7. FM index stays out

The `fm` rack device writes `.fm(index)` after the variation on the line, so a varied `fmi` would be overwritten, and the device's FM rise already moves the index. Varying it belongs to the future Sweep devices.

### D8. Style recipe fields

- `drums.material.tones`: per group, ranges for the four values (`{ "kick": { "decay": [0.2, 0.5], "drive": [0, 0.3] } }`). Missing values use the safe table's middle half. Values outside the safe table are errors.
- `<instrument>.material.variation`: `{ "amount": 0.3, "targets": ["lpf", "pan", "decay"] }`. Default when absent: amount 0.2, targets `lpf` and `pan` for melodic tracks, `decay` and `pan` on hats for drums. Never `gain` on the kick, never `distort` on bass.
- **Amount at generation.** The written amount is `style amount × (0.5 + energy target A)`, clamped to each target's cap, then drawn between 60 and 100 % of it. One to three targets per track, from the style's list.
- **Character.** Every built-in style gets these fields in task 4.1, kept small: ambient and lo-fi favour `room` and `lpf`, industrial and acid `distort` and `crush` on hats or arps, trance and house `pan` and `lpf`, jazz and country `decay` only.

### D9. Checks

- `check:material`: tone ranges, determinism, groups independent under locks, energy direction, `groove()` fixtures unchanged.
- `check:ideas` or a new `check:sound-params`: the writer's code for each target and each tone value; ranges relative to the track; merged controls (one call per control per line); skipped targets; the same haps in Strudel in Node twice in a row; the values loop every `cycles` bars.
- `check:songs` and `tools/check-idea-errors.mjs`: the validator's errors and warnings for `tone` and `vary` (outside the safe table, above the cap, too many entries, unknown target, `row` on a melodic track, a `set` step on them).
- `check:styles`: the new recipe fields.
- `check:endless`: fixtures at 0 unchanged; new fixtures at 1; the "1 minus the new fields equals 0" rule over 20 seeds and every style.
- `check:strudel` and `catalog:strudel`; `check:functions` (song functions still fold the longer lines); `check:mixer` (the hidden mixer keeps the varied gain); `check:code` unchanged.
- Browser: a new `tools/check-sound-dice.cjs` (dice, locks, undo, number, both languages, both themes, 400 px) and a level run of radio songs at `sound: 1` over every style (`check-levels.cjs` on generated songs): each row at most 0.9, the median kick within 0.1 of today's, `in=` at most 1.2.

### D10. Sound history chips (owner test r94e)

The first version had a number field that did nothing by itself: typing 2 and pressing «New sound» rolled 2 and moved the field to 3, so going back felt unclear. The history replaces that path.

- **Where it lives.** On the track, in the song: `track.soundRolls = { "cur": 3, "rolls": [{ "n": 1, "settings": { … }, "rack": [ … ], "fm": { … } | null }, …] }`, next to the other per-track state Compose writes (`voiceOptions`, `pinned`). It is saved with the song, travels with an exported file and survives a reload. The compiler ignores it; the validator checks its shape. The locks stay in the browser (D5).
- **What an entry holds.** The track's full sound: the settings the dice may change (`wave`, `type`, `kit`, `tone`, `cutoff`, `reso`, `drive`, `delay`, `room`, `vary`; a key absent from the track is absent from the entry) and the whole rack, plus the FM device the dice owns at that point (`fm`), so a later roll still knows which device is the dice's. The level, octave, mode, patterns and clips are not in it, so going back never moves them.
- **Rule.** Before the track leaves a sound (a new roll, a chip click, a number applied in the field), the entry of the lit sound is overwritten with the track's current sound, so the hand edits made on it are kept. A chip click then writes its entry into the track and lights it. Simplest rule that keeps hand edits without tracking each edit.
- **Numbers.** «New sound» always uses the highest number in the history plus one, so it never gives back or overwrites an earlier entry. The field shows the lit number (empty with no history). A typed number applies on `change` (Enter, blur, the arrows) or about one second after the last keystroke: a number with a chip restores it, a number without one rolls it (the same seed as ever) and adds its chip. The lit number does nothing.
- **Cap.** At most 12 entries, the most recently added; when a 13th comes, the oldest added goes, never the lit one. Chips show in number order.
- **Undo.** The toast's Undo restores the track's settings, rack, the dice's FM device and the whole history as before the action, so the chip a roll added goes again and the next «New sound» reuses its number (and gives the same sound with the same locks).
- **Pure helpers.** `soundSnapshot`, `applySnapshot`, `keepCurrent`, `addRoll` and `nextRollNumber` in `src/material/dice.js`, covered in `check:sound-params`; the browser check covers the chips, the field and the numbers.

## Owner tests (checklist)

1. **Dice on a synth track.** Where: Compose, a built-in song with a bass track, track panel of the bass. Do: press the dice three times while the song plays. Right: each press changes the bass sound at the next bar and the toast shows "New sound #1", "#2", "#3"; the level, the notes and your other effects stay. Why: the dice must change only the sound, within the style.
2. **Lock.** Where: the same panel. Do: lock "Filter", press the dice twice. Right: the filter value does not move, the wave changes. Why: locks keep what you like.
3. **Undo and history.** Where: the same panel. Do: press Undo on the toast; then click chip #1, then type 2 in the number and wait a second. Right: Undo brings back the sound before the last press and its chip goes; chip #1 gives back the first sound (with any hand edit you made on it); typing 2 gives back sound #2 without pressing anything; «New sound» then makes the next new number. Why: every roll can be found again.
4. **Dice on drums.** Where: Compose, a song with a drum track. Do: press the drum dice with "Kit" locked. Right: the kit stays, kick, snare and hats change length, pitch or brightness; nothing clips (the master never turns red). Why: drum tones vary inside safe ranges.
5. **Old songs unchanged.** Where: Songs tab, open three built-in songs and one of yours. Do: play them in Classic and in Crescendo. Right: they sound exactly as yesterday. Why: nothing changes unless you press the dice.
6. **Saved radio session.** Where: Playlists, a radio session saved before this change. Do: play it. Right: same songs and same sound, no "may sound different" warning. Why: old sessions record no sound version, so they play as before.
7. **New radio session.** Where: Radio, one style you know well (for example industrial), then a soft one (ambient). Do: listen to two songs of each. Right: hats and leads move a little from hit to hit (filter, pan, length), in the style's character, never jumpy; ambient varies less than industrial. Why: seeded variation, tied to style and energy.
8. **Same sound everywhere.** Where: the radio song of test 7. Do: save it, open it in Compose, export it fast to WAV and play it again. Right: the variation is the same each time, in the same places. Why: randomness is seeded.
9. **Live coder code.** Where: a new radio song with the Live coder profile. Do: read the code as it grows. Right: lines such as `.lpf(rand.range(2400, 4000).rib(41, 4))` appear with their track's line, and the typing never errors. Why: the variation is part of the code a live coder writes.

## Risks / Trade-offs

- **Longer lines.** Variation adds up to three calls per line. Song functions fold repeated chains; the owner's "short code" rule may still want fewer targets (amount 0 or one target in Live coder). Measured in task 5.2.
- **`decay` on samples.** If superdough ignores `decay` on a sample without `sustain`, the writer always pairs them; if a kit's sample is shorter than the decay, the value has no effect, which is harmless.
- **`speed` changes length.** A lower tune makes a sample longer. The decay caps it.
- **CPU.** Signals evaluated per hit cost little; `perlin` and `rand` are pure functions of time. No new voices or nodes, except `distort`, already used today.
- **Two kinds of random values.** `idea.random` (absolute, by hand) and `vary` (relative, generated) coexist. The validator warns when both target the same control on one track.

## Open Questions

1. **Variation in new Classic and Crescendo radio songs.** Recommended: yes, since the profile governs growth and old sessions stay unchanged. Alternative: only Live coder songs get it.
2. **Where locks live.** Recommended: in the browser per song and track. Alternative: in the song file (`soundLocks`), which travels with the song but adds a format field.
3. **Gain as a default target.** Recommended: off by default, on only where a style lists it (hats and percussion), never on the kick.
4. **Dice rolls the style's filter and effects too.** Recommended: yes, each as its own lock group, with the level never rolled. Alternative: the dice changes only the instrument sound (wave, FM, kit, tones).
5. **Drum dice changes the kit.** Recommended: yes, as the "Kit" lock group, unlocked by default.

## Estimate

About 16 agent hours: dice and locks in Compose 4, drum tones 2.5, variation writer and validator 3, generator, option and steering 2, style fields 1, checks and level runs 2, docs, guide and knowledge 1.5.
