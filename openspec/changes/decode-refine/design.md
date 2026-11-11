# Design

## Context

See `proposal.md`. This change refines the Decode tab built by `track-to-code` (issue `#91`), from the owner's test notes of 8 November. Pointers are on `develop` at `11f4352`.

The owner split the work in two rounds: **part 1** (D6, D7, D8, D10) is done now; **part 2** (D1 to D5, the similarity work) waits and is written here so it is not lost. The recent tracks (the old D9) moved to the separate change `decode-library`. `track-to-code` is not archived yet: the deltas of this change are written against its specs, and this change is archived after it.

## Diagnosis: why the code does not sound like the original

### Files measured

| File                                      | Length       | What it is                                                 | Truth available                                                        |
| ----------------------------------------- | ------------ | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| `Luci Rosse.mp3`                          | 1:55         | the app's built-in song, exported by the app               | timeline JSON: tempo, sections, code per bar, hit times per instrument |
| `coding-misk-radio-ndikot-….mp3`          | 3:41         | one radio song ("Despertar Circuito"), exported by the app | the same                                                               |
| `third-party-1.webm`                      | 3:15         | a third-party electronic track with vocals                 | none                                                                   |
| `third-party-2.webm`                      | 3:30         | a third-party pop-dance track with vocals                  | none                                                                   |
| `decode-test-124`, `-90`, `-174`, `-long` | 0:30 to 4:00 | the bench's test songs (`tools/decode-songs.mjs`)          | the songs themselves                                                   |

The owner's files stay in the git-ignored `notes/decode-test-tracks/`. The measures ran in Node on the analysis (`src/decode/`) and, for the sound, on a fast export of each file's level B song from Compose (dev server, headless Chrome). The scratch scripts are not part of the change; task group 1 turns them into tools.

### What the analysis gets right

Tempo is exact on every file (124, 176, 140, 128 BPM; truth known for the two app exports). Level B's downbeat is within 25 ms on the app exports. The key is right in level B on both app exports (A minor, D minor). The bench's test songs score high too (`node tools/decode-measure.mjs --full`):

| Test song        | Tempo  | Key (B)    | Chords per bar (B) | Kick F1 | Clap F1 | Hat F1 |
| ---------------- | ------ | ---------- | ------------------ | ------- | ------- | ------ |
| decode-test-124  | 124 ok | A minor ok | 0.96               | 0.93    | 1.00    | 1.00   |
| decode-test-90   | 90 ok  | E minor ok | 0.88               | 0.78    | 1.00    | 0.85   |
| decode-test-174  | 174 ok | D minor ok | 0.69               | 0.89    | 0.98    | 0.86   |
| decode-test-long | 128 ok | A minor ok | 0.90               | 0.93    | 1.00    | 1.00   |

These songs have a pad, a bass and clean drums only: no lead, no distortion, no bass over the kick. The bench therefore says "decoded well" while the owner hears a different song.

### Sound of the code against the original

Each original was compared with the fast export of its level B code, on the original's bar grid. The measures:

- **Rhythm per band:** correlation of the onset strength per 16th step in the low (30-150 Hz), mid (150-2000 Hz) and high (5-16 kHz) bands.
- **Chroma:** cosine of the 12-note energy per beat, all notes (27-2000 Hz) and bass only (27-250 Hz).
- **Brightness:** median spectral centroid of the code over the original's.
- **Mid share:** the mid band's share of the energy (where leads, hooks and voices sit).
- **Arc:** correlation of the loudness per bar.
- **Floor:** an original against an unrelated file's code, to show what "no similarity" scores.

| File              | Rhythm low    | Rhythm mid   | Rhythm high  | Chroma       | Bass chroma  | Brightness | Mid share orig / code | Arc            |
| ----------------- | ------------- | ------------ | ------------ | ------------ | ------------ | ---------- | --------------------- | -------------- |
| Luci Rosse        | 0.14          | 0.19         | 0.46         | 0.89         | 0.89         | 0.57       | 0.25 / 0.13           | 0.02           |
| Radio song        | 0.29          | 0.57         | 0.60         | 0.73         | 0.63         | 1.21       | 0.68 / 0.41           | 0.72           |
| Vocal track 1     | 0.07          | 0.56         | 0.28         | 0.78         | 0.71         | 0.83       | 0.34 / 0.46           | 0.57           |
| Vocal track 2     | 0.37          | 0.19         | 0.05         | 0.71         | 0.66         | 0.34       | 0.51 / 0.38           | 0.48           |
| Floor (two pairs) | -0.03 to 0.03 | 0.01 to 0.13 | 0.00 to 0.03 | 0.60 to 0.61 | 0.55 to 0.58 |            |                       | -0.06 to -0.05 |

Harmony is above the floor everywhere. Low-band rhythm, brightness and the mid band are far off: the kick and bass do not land like the original's, the code is duller on three files out of four, and the mid band (top line) is missing.

### Analysis against the truth of the app exports

Drums against the timelines' hit times, on the model's bar grid:

| File       | Level   | Kick F1 (recall) | Clap F1 (false hits) | Hats F1 (recall) | Distinct drum grids |
| ---------- | ------- | ---------------- | -------------------- | ---------------- | ------------------- |
| Luci Rosse | A and B | 0.42 (27 %)      | 0.64 (41)            | 0.64 (47 %)      | 49 in 59 bars       |
| Radio song | A and B | 0.92 (83-85 %)   | 0.69 (257)           | 0.62 (46 %)      | 87 in 162 bars      |

Luci Rosse's 909 kick plays under a distorted acid bass on A1 (55 Hz); the kick detector loses it, so the level B code has a kick in its first section on one step only and none in the second. Level A also locks Luci Rosse's beat half a beat late (downbeat 1.718 s, 3.55 beats), because the intro has offbeat hats and a bass on the off steps.

What the written code holds against what the original plays:

|                  | Luci Rosse                                                                           | Radio song                                                                 |
| ---------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Original's parts | kick, clap, hats, open hat, crash, acid bass, square hook, riser, pad (last section) | kick, clap, hats, bass, arp, hook, riser                                   |
| Code's parts     | drums, bass, chords (Dm, 4 bars)                                                     | drums, bass, chords                                                        |
| Drum machine     | 909 with `crunch`, code: 808                                                         | 909 with `distort`, code: 808                                              |
| Kick pattern     | `bd*4`, code: one or no kick                                                         | `0,4,7,8,10,12`, code: `bd*4`                                              |
| Bass             | saw `a1` with resonant sweep and `machine`, code: `sine` `lpf(450-800)`              | `d2`/`c2` offbeat with octave jumps, code: `d3`/`c3` `sine` `lpf(400-550)` |
| Chords           | none                                                                                 | `Dm Dm C C`, code: `<D D C C D Dm F C>` (third flips)                      |
| Sections (bars)  | 8, 16, 18, 34, 38, 54; code: 18, 34, 39, 54                                          | 16, 128, 144; code: 8, 40, 96, 104, 120, 136, 144                          |

On the third-party files the same pattern holds: the 808 kit on three files of four (the low-end weight is 0.69 to 0.90 on every mastered track, above the 0.55 threshold), a `sine` or `square` bass with a low-pass at 450 to 800 Hz on all four, `triangle` chords at `gain(.3)`, major and minor flips (Vocal track 1 `<Am A Am Am A Dm Am A>`), and Vocal track 2's bass jumping over three octaves (`e3 f#3 bb3 a3 c4` next to `d1`) where the bass level is low (0.28) and YIN follows the voice. 24 of the 32 level B sections are named Verse.

### Causes, ranked

Ranked by how far each moves the measures above, on how many files:

1. **The top line is never written.** No lead, hook, arp or melody part exists (only drums, bass, chords). The mid band, where a listener recognises a song, is short by 0.12 to 0.27 of the energy on three files of four; the radio song's hook and arp (1184 notes) and Luci Rosse's hook are absent. Every file.
2. **Sounds do not match.** The kit threshold picks the 808 on almost every mastered track; the bass is always a plain `sine`, `square` or `sawtooth` with a fixed low-pass; chords are a quiet `triangle`; no distortion, resonance or space. Brightness ratio 0.34 to 1.21; the low-band rhythm stays at 0.29 on the radio song even with a kick F1 of 0.92, because the sine bass and the 808's long tail fill the band. Every file.
3. **Drums lost or noisy on dense mixes.** The kick under a loud bass (Luci Rosse recall 27 %), eighth-note hats read as quarters (recall 46 to 47 %), false claps (257 on the radio song) that turn into 49 to 87 distinct grids and spurious variations. Level A's half-beat lock on an offbeat intro. Two of two files with truth; likely on the others (Vocal track 1's low-band rhythm 0.07).
4. **Harmony details.** Key and roots are right; the chord's third flips between major and minor inside a section, and the bass lands an octave off or follows the voice when the bass is weak. Chroma 0.71 to 0.89 against a floor of 0.60.
5. **Arrangement.** Section bounds are near on clear changes but miss short ones (Luci Rosse's 2-bar cut at bar 16, the 4-bar break at 34 found at 39), and the kinds are mostly Verse. Parts play in 86 to 98 % of bars, so the code is "full" while the original builds. Lower weight: the arc is 0.48 to 0.72 on three files.
6. **Tempo and key** are not a cause.

The bench's test songs miss causes 1 to 3, which is why its scores looked good. Task group 1 adds test songs that have them.

## Code changes: measures

Edits counted between the code shown at consecutive bars (an edit bar has at least one changed line; size is the changed characters):

| File          | Level | Bars with an edit | Edits per minute | Average size | Edits of 12 characters or less |
| ------------- | ----- | ----------------- | ---------------- | ------------ | ------------------------------ |
| Luci Rosse    | A     | 47 %              | 14.7             | 53           | 10 of 27                       |
| Radio song    | A     | 93 %              | 41.0             | 42           | 19 of 150                      |
| Vocal track 1 | A     | 92 %              | 32.2             | 42           | 13 of 103                      |
| Vocal track 2 | A     | 90 %              | 28.8             | 32           | 16 of 99                       |
| Luci Rosse    | B     | 12 %              | 3.7              | 136          | 0 of 7                         |
| Radio song    | B     | 17 %              | 7.7              | 58           | 1 of 28                        |
| Vocal track 1 | B     | 13 %              | 4.7              | 171          | 3 of 15                        |
| Vocal track 2 | B     | 33 %              | 10.5             | 88           | 19 of 36                       |

Level A (the tab's default) changes the code almost every bar. Its causes: a bass line is written per bar (a loop must repeat exactly over 13 of 16 steps), a chord loop grows from 2 to 4 to 8 bars as it is heard, a drum grid changes after two to three bars of a new grid, and the sounds are measured on the bars heard so far, so the `lpf` numbers move with them. Level B is calmer but Vocal track 2's noisy drums and bass give a third of the bars an edit.

## Decisions

### D1. A similarity check on the rendered sound (part 2)

`tools/decode-similarity.cjs` (dev server) fast-exports a decoded song and compares it with its original by the measures of the table above: rhythm per band, chroma and bass chroma, brightness ratio, band shares, arc. It runs on:

- the bench's test songs, plus two new ones in `tools/decode-songs.mjs`: an acid track (909 kick under a distorted saw bass on A1, a square hook, a crash) and a track with an arp and a lead over syncopated drums;
- the app's own songs `luci-rosse` and one fixed radio seed, exported by the app, with their timelines as truth;
- the owner's files when `DECODE_OWNER_DIR` points to them (results printed, not stored).

Scores of the first two groups go to `tests/snapshots/decode-similarity.json`; a later run fails when a score drops by more than 0.05. The targets (spec: Similarity targets) apply to the app songs and the new test songs.

Alternative: listening only. Rejected: I cannot hear, and the owner's impression needs numbers to tune against.

### D2. The Lead part (top line) (part 2)

Level B finds the top line with Essentia.js's `PredominantPitchMelodia` (already in the package; misk-analyzer's YIN on the 200-2000 Hz band as fallback), one note per 16th step, quantised to the key's scale when within 40 cents, rests where the voicing confidence is low. Per section the writer keeps a loop of 1, 2 or 4 bars as for the bass and writes it as a `code` track `lead`: `n("<…>").scale("A3:minor")` with a sound by measure (D3). A section whose top line is voiced on less than 30 % of its steps has no Lead. Level A has no Lead: one bar of melody is too noisy, and the top line is the main point of level B.

The Lead also feeds the top line lines (D6): its voicing replaces the per-bar measure of part 1.

The owner answered open question 1: a sung melody is written as a Lead too, on a track muted by default, with the top line lines kept.

### D3. Sounds by measure, calibrated on the track (part 2)

Every measure is taken relative to the track's own distribution, not to absolute thresholds, because every mastered track is loud and heavy:

- **Drum machine:** kick decay time (time to −20 dB), kick spectral centroid and hat brightness against a table of the app's kits measured once in Node from their samples; the nearest kit wins. Distortion on the kick (the share of energy above 1 kHz in its first 30 ms) adds `.crunch(…)` or `.distort(…)` as the app's songs do.
- **Bass:** wave by the harmonic count (sine below 2 audible harmonics, square for odd-heavy, sawtooth otherwise); the filter cutoff by the bass band's centroid; a moving resonant peak (centroid range over a bar above 600 Hz) writes `.res(…)` with a sine range, as Luci Rosse's acid line does.
- **Chords and Lead:** level from the band's level against the drums' (no fixed `gain(.3)`), wave from brightness, `.room(…)` when the decay after a chord change is long.
- **Levels:** each part's `gain` set so the code's band shares are within 0.10 of the original's.

"Simple kit" does not change. Sounds still change only at a section change.

### D4. Drums on dense mixes (part 2)

- **Kick under the bass:** a kick is a low-band onset with a broadband click (2-6 kHz rise in the same 10 ms) or a pitch fall; a bass note is a low-band onset without either. On a steady track a low onset on the beat that repeats on every beat for a bar counts as a kick even when its pitch does not fall.
- **Hats:** the hat threshold follows the hat band's own median per section, so quieter offbeat hats between loud ones are kept.
- **Claps:** a clap needs the snare band's rise to stand out against the hats of that bar, not only of the track.
- **Grids in level B:** a section's main grid is the per-step majority over the section (a step on in at least 60 % of the bars), not the most common whole grid, so noise does not split it into many grids.
- **Level A phase and tempo relock:** when the first kicks arrive after an intro, misk-analyzer checks the beat phase again on the first 8 bars with kicks and moves the downbeat by half a beat when the kicks fall on the off steps. The code restarts at the next bar, as a tapped tempo does. Measured in part 1 (10 November): level A also locks the radio song at 117.46 BPM, two thirds of its 176, because its first 8.5 s hold only the intro; level B finds 176. The relock checks the tempo too. Until then the Tap button and Auto (D8) are the way out.

### D5. Harmony and bass (part 2)

- A chord's quality inside a section follows the section's majority for that root unless the other quality wins clearly (confidence above 0.8) in at least two bars.
- The bass keeps one octave range per section: its median note ± 7 semitones; a note outside moves by octaves into the range. A bar whose bass level is below 20 % of the section's loudest has no bass notes (avoids following the voice).

### D6. Top line lines: `vox(…)` and `melody(…)` (part 1)

The comment `// vox: …` becomes up to three lines at the end of the code, after a group header in the app's style:

```js
// ========== vox ==========
$: vox("reading from track").gain(0.8);
_$: vox("vocalizing").room(0.3);
```

or, for a track whose top line is a hook or a synth melody:

```js
// ========== melody ==========
$: melody("tracing the hook").room(0.3);
```

- **Where a top line is heard.** misk-analyzer adds a measure to every bar, `top.up`: the median, over the bar's frames, of the share of the tonal peaks' energy between 400 and 2000 Hz (no harmonic of a bass note) in all the frame's tonal energy (60 to 2100 Hz). Measured on the owner's files and the generated songs: a hook, an arp or a voice gives 0.25 to 0.7; bass, drums and a low pad 0.1 to 0.2 (Luci Rosse: the hook's bars 17 to 37 against the rest; a generated song: a hook section 0.78 against a pad section 0.15). In level B a section has a top line when the mean over its bars is at least 0.22; in level A when the last four bars reach 0.22, and it goes again below 0.18. Numbers in `TOP_RULE` (`src/decode/writer.js`).
- **`vox` or `melody`.** The measure cannot tell a voice from a synth (part 2's predominant pitch cannot either; only machine learning could). A track whose median share is at least 0.35, a top line through the whole track as a sung song has, gets `vox` lines; any other gets `melody` lines. On the owner's four files this splits the two vocal tracks from Luci Rosse and the radio song. A level A track decides on the bars heard so far, again only when the top line comes or goes.
- **Lines.** One to three lines, the number from the file's fingerprint; each label from a list of 20 per kind (`reading from track`, `modulizing from track`, `vocalizing`, `passing through song`, `tracing the voice`, …; `tracing the hook`, `reading the lead`, `catching the arp`, …) and one method from a short list of catalog functions harmless on silence (`gain`, `room`, `slow`, `late`, `pan`), drawn from the fingerprint and the kind. A track always shows the same lines; a section only turns them on (`$:`, where the top line is heard) or off (`_$:`). No top line in the whole track: no group. (First drawn per section too: in the browser the player's typing then deleted the old line bars before it typed the new one, so the group was empty for most of a section. With fixed labels a section change is one character.)
- **Silence.** `vox` and `melody` are app helpers (`HELPERS` in `src/song/writer.js`; `installHelpers` defines them as functions that give `silence`). The player never sees them: the code it evaluates and the mixer's line table are the code without the group (`withoutVox`), as for today's comment. Copy keeps the group and starts with `const vox = () => silence, melody = () => silence`, so pasted code evaluates. The group never reaches Open in Compose.
- `check:strudel` scans the decoded code of a generated song with a hook (Live and Full at every bar, and the copied code) as live builds.

Alternative: comment lines only (`// vox · reading from track`). Lowest risk, but the owner asked for lines that look like code. Alternative: a muted `s("vox")` line. Rejected: an unknown sample if unmuted. Alternative: one kind only, `vox` everywhere (the old open question 3). The owner asked for `melody` lines where a melody is heard.

### D7. The edit balance rule (part 1)

The rule, with its numbers in `EDIT_RULE` (`src/decode/writer.js`) so they can be tuned after the owner listens:

| Number                   | Default | What it does                                                                                                                                                         |
| ------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lineBars`               | 4       | bars at least between two edits of one line                                                                                                                          |
| `anyBars`                | 2       | bars at least between two edits of any line                                                                                                                          |
| `drumSteps`              | 3       | steps a drum grid must change by (or a row that enters or leaves)                                                                                                    |
| `bassShare`, `bassSteps` | 0.25, 3 | share of the note steps a bass loop must change by, and at least 3 steps in a bar (or another root on the loop's first bar)                                          |
| `chordShare`             | 0.375   | share of a chord loop's bars that must get a chord not close to the old one (close: the other quality, A for Am, or the relative, G for Em: the analysis swaps them) |
| `runBars`                | 2       | level B: bars a part must be heard, or not heard, to enter or stop inside a section                                                                                  |

**Level A** (`planA`): a plan for every bar from bar 0, so the code of a bar depends only on the bars up to it (and the one after, when the look ahead knows it).

1. A part enters when it is heard in this bar and the next, and stops when it is heard in neither; its line is muted or unmuted at once. The drums of `decode-test-124` still mute on bar 33 with each look ahead.
2. A part that enters is level A's section change: the sounds are measured again on the bars heard so far (all lines show them), and loops may grow again. Sounds change at no other bar.
3. Otherwise a line changes when its new value differs enough and the bar before already gave a value close to it (the change held two bars), or when any new value held the same for `lineBars` bars; in both cases `lineBars` and `anyBars` passed. (The second case came from the browser check: the first bar of the drums, heard alone, missed the kick on beat one, `~ bd!3`, and with the minimum difference only the line kept the miss for 33 bars.)
4. A loop of 2 bars or more, once written, sets the longest loop of its part until the next section change: it never grows again.

**Level B** (`writeFull`): sections are its section changes, always edited.

1. Inside a section a part's bars heard are made steady: gaps shorter than `runBars` between bars heard are filled, then islands shorter than `runBars` are left out. This also fixes a bug: the old one-bar smoothing worked on the bars as heard, so a part heard every other bar (x.x.x) became .x.x. and flickered on every bar (Vocal track 2, bars 15 to 19).
2. A drum variant starts only when `lineBars` passed since the drums' last edit and `anyBars` since any part entered or stopped; the way back to the main grid is always written.

**Measures** (`tools/decode-edits.mjs`): the code the tab shows at each bar (level A: the model up to the look ahead's horizon as the track plays; level B: the Full song with "Follow the song"), an edit being a bar whose code differs from the bar before. A mute or unmute alone (`$:` to `_$:`) counts as an edit but not in the size measures, where it would be one character. Baseline with the code before part 1, the same tool (10 November):

| File          | Level | Bars edited | Edits per minute | Average size | Small edits |
| ------------- | ----- | ----------- | ---------------- | ------------ | ----------- |
| Luci Rosse    | A     | 44 %        | 13.4             | 59           | 32 %        |
| Radio song    | A     | 94 %        | 27.2             | 16           | 50 %        |
| Vocal track 1 | A     | 94 %        | 32.5             | 43           | 39 %        |
| Vocal track 2 | A     | 94 %        | 29.7             | 26           | 18 %        |
| Luci Rosse    | B     | 11 %        | 3.2              | 114          | 0 %         |
| Radio song    | B     | 17 %        | 7.4              | 34           | 30 %        |
| Vocal track 1 | B     | 13 %        | 4.5              | 118          | 8 %         |
| Vocal track 2 | B     | 32 %        | 10.2             | 101          | 30 %        |

After part 1 (11 November):

| File          | Level | Bars edited | Edits per minute | Average size | Small edits | Section changes edited (B) |
| ------------- | ----- | ----------- | ---------------- | ------------ | ----------- | -------------------------- |
| Luci Rosse    | A     | 10 %        | 3.1              | 11           | 50 %        |                            |
| Radio song    | A     | 28 %        | 8.2              | 20           | 63 %        |                            |
| Vocal track 1 | A     | 15 %        | 5.3              | 32           | 36 %        |                            |
| Vocal track 2 | A     | 33 %        | 10.4             | 28           | 28 %        |                            |
| Luci Rosse    | B     | 9 %         | 2.7              | 124          | 0 %         | 100 %                      |
| Radio song    | B     | 12 %        | 5.2              | 42           | 16 %        | 100 %                      |
| Vocal track 1 | B     | 11 %        | 3.9              | 124          | 8 %         | 100 %                      |
| Vocal track 2 | B     | 25 %        | 7.9              | 102          | 35 %        | 100 %                      |

(The radio song's level A runs at 117.46 BPM: see D4. Vocal track 2 in level A: 18 of its 36 edits are the drums stopping and entering again for two bars or more.) Targets: 10-30 % of bars, 2-8 edits per minute at 120-130 BPM, an average of at least 20 characters, at most 15 % small edits, at least 90 % of the section changes in level B with an edit within one bar. The small edits target is the hardest: a chord loop edit is often a few characters (`G` for `Dm`), and it is a real edit. The numbers are a starting point, to tune after the owner listens to Luci Rosse and a song with a voice (open question 2).

### D8. Tap tempo key and Auto (part 1)

The **T** key taps the tempo while the Decode tab shows and a track plays, with no modifier and the focus outside text fields and the editor. A key press of T does not activate a focused button, so the conflict goes. A **Tap** button next to ½× and 2× counts on `pointerdown` (or a click from the keyboard) and shows the taps so far (1/4, 2/4…); it is disabled while the track does not play, and it also shows while the tempo is still being found. The space bar keeps play and pause only. Keys already used were checked: Space, Ctrl/Cmd+Enter, Ctrl/Cmd+., Escape everywhere; digits and P in the radio; pads in the sound browser; C and B in the live room window; Y, N and arrows in the soul display. T is free.

A small **Auto** button shows after a tapped, halved or doubled tempo and goes back to the tempo misk-analyzer finds (the worker forgets the given tempo and locks again on the first seconds of music, as on the first open); Full runs again when it was on, as after any new tempo.

Alternatives: B (free in the main window, used in the live room window), `\`. Enter is rejected: it activates buttons.

### D9. Recent tracks and reopening (moved)

Moved to the change `decode-library` (owner, 10 November), written separately.

### D10. Full by hand, also before Play (part 1)

The code already does it: the level switch shows as soon as a track is open, and Full runs the whole-file analysis whether the track plays or not (`tab.js`: the click on `data-dc-level="B"` calls `runFull('switch')`, which needs no playback; `play()` then starts in level B). Part 1 changes nothing there, and adds:

- Live stays the default for a first open; a track with a stored Full analysis still opens in Full.
- After 8 bars in Live, the tab proposes Full once per track: a note under the file row ("Full writes sections, one tempo for the whole track and calmer code: press Full…").

## Part 2: measures

Before and after each group of part 2, on the bench of group 6 (`tools/decode-measure.mjs --full`, the WAV files exported again in the part 2 worktree; level A "as played" is the model asked up to two bars ahead of the playhead, as the tab asks it).

### Group 7: drums on dense mixes (11 November)

| Measure | Before | After | Target |
| --- | --- | --- | --- |
| luci-rosse kick F1, level A / B | 0.46 / 0.45 | 0.93 / 0.93 | 0.8 |
| decode-test-acid kick F1, level A / B | 0 / 0.34 | 0.96 / 0.97 | 0.8 |
| luci-rosse hat F1 (B) | 0.60 | 0.88 | 0.8 |
| radio seed false claps | 99 | 25 | 40 at most |
| radio seed drum patterns per section (B) | 8 in one section | 1 | 2 at most |
| luci-rosse level A as played: downbeat | 1.69 s (half a beat late) | 13 ms from bar 6 | within 30 ms by bar 12 |
| radio song (owner's export) level A: tempo | 117.46 BPM throughout | 176 BPM from bar 9 (Node), bar 10 (browser) | 176 by bar 16 |

What changed against D4: the broadband click does not tell luci-rosse's kick from its distorted acid bass (both have their attack in the 1-5 kHz band), so the kick under the bass rests on the every-beat rule (`KICK_RULE`). Claps also need noise in the snare band (spectral flatness at least 0.3: claps 0.36 to 0.67, a lead's note over a kick 0.11 to 0.22) and a darkness of 1.3 times the lower third of the hats of the last 6 seconds (`CLAP_RULE`). Hats are on above half the median of the hats of the last 4 bars (`HAT_RULE`). The relock (`RELOCK_BARS`) takes a new tempo only with the backbeat (on decode-test-90 two thirds of the tempo won without it), moves the phase by half a beat when the kicks sit on the off 8ths, by a 16th when the hats sit on the odd 16ths only, and takes a whole tempo within 0.1 BPM (126.05 against 126 moved the acid song's grid a 16th off its kicks in a minute). The radio song's intro holds drums from bar 0: D4's "intro without drums" does not hold there, the relock still finds 176. Similarity: luci-rosse's low-band rhythm 0.54 to 0.75, the acid song's 0.62 to 0.88; their brightness falls (0.67 to 0.59, 0.74 to 0.50) because the right drums now play on the 808 (group 10 picks the kit).

## Risks / Trade-offs

- [The edit rule makes level A slow to follow real changes] → Parts entering or stopping never wait; the waits are 2 and 4 bars; level B is the right level for a track the user wants close.
- [The top line measure is coarse: a bright pad or a riser counts as a top line, a quiet voice does not] → The lines are decoration and play nothing; part 2 brings a real top line.
- [`vox` and `melody` are new app names] → `check:strudel`'s clash rule; they are no Strudel names; defined for copied code.
- [`ANALYSIS_VERSION` goes up] → Stored tracks are analysed again on the next open, with a note.
- (part 2) [The Lead adds a part that can be wrong, which sounds worse than no part] → Voiced share threshold per section; Lead on its own code track with mute and solo; similarity check per band.
- (part 2) [Sound calibration overfits the app's own exports] → Two new test songs plus the third-party files in the check; targets on bands, not on exact sounds.

## Migration Plan

Part 1: `ANALYSIS_VERSION` goes from 1 to 2 (the bars carry `top`). Stored records keep title, artist, tempo tapped and settings; models are made again, and the tab says "Analysed again: the analyser changed since last time." Songs already opened in Compose keep their code. Part 2 raises the version again.

## Open Questions

1. ~~A sung melody as a synth Lead?~~ Answered: yes, on its own track muted by default (part 2).
2. **Edit balance range.** Recommended: keep 10-30 % of bars and 2-8 edits per minute, and tune `EDIT_RULE` after the owner listens to Luci Rosse and a song with a voice in Live and Full.
3. ~~Vocal lines on an instrumental lead~~ Answered: `vox(…)` lines and `melody(…)` lines (D6). New: the split between them is a measure on four files; recommended: keep it until part 2, and tell the owner when a track gets the wrong kind.
4. ~~Tap key~~ Answered: T, with the Tap button and Auto.
5. ~~Default level~~ Answered: Live stays the default, Full is proposed after 8 bars, and Full can be picked before Play.
