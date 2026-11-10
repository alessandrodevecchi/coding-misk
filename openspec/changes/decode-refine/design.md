# Design

## Context

See `proposal.md`. This change refines the Decode tab built by `track-to-code` (issue `#91`), from the owner's test notes of 8 November. Pointers are on `develop` at `11f4352`.

## Diagnosis: why the code does not sound like the original

### Files measured

| File                                      | Length       | What it is                                                 | Truth available                                                        |
| ----------------------------------------- | ------------ | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| `Luci Rosse.mp3`                          | 1:55         | the app's built-in song, exported by the app               | timeline JSON: tempo, sections, code per bar, hit times per instrument |
| `coding-misk-radio-ndikot-….mp3`          | 3:41         | one radio song ("Despertar Circuito"), exported by the app | the same                                                               |
| `DJ-HEARTSTRING-….webm`                   | 3:15         | a third-party electronic track with vocals                 | none                                                                   |
| `David-Guetta-….webm`                     | 3:30         | a third-party pop-dance track with vocals                  | none                                                                   |
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
| Heartstring       | 0.07          | 0.56         | 0.28         | 0.78         | 0.71         | 0.83       | 0.34 / 0.46           | 0.57           |
| Guetta            | 0.37          | 0.19         | 0.05         | 0.71         | 0.66         | 0.34       | 0.51 / 0.38           | 0.48           |
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

On the third-party files the same pattern holds: the 808 kit on three files of four (the low-end weight is 0.69 to 0.90 on every mastered track, above the 0.55 threshold), a `sine` or `square` bass with a low-pass at 450 to 800 Hz on all four, `triangle` chords at `gain(.3)`, major and minor flips (Heartstring `<Am A Am Am A Dm Am A>`), and Guetta's bass jumping over three octaves (`e3 f#3 bb3 a3 c4` next to `d1`) where the bass level is low (0.28) and YIN follows the voice. 24 of the 32 level B sections are named Verse.

### Causes, ranked

Ranked by how far each moves the measures above, on how many files:

1. **The top line is never written.** No lead, hook, arp or melody part exists (only drums, bass, chords). The mid band, where a listener recognises a song, is short by 0.12 to 0.27 of the energy on three files of four; the radio song's hook and arp (1184 notes) and Luci Rosse's hook are absent. Every file.
2. **Sounds do not match.** The kit threshold picks the 808 on almost every mastered track; the bass is always a plain `sine`, `square` or `sawtooth` with a fixed low-pass; chords are a quiet `triangle`; no distortion, resonance or space. Brightness ratio 0.34 to 1.21; the low-band rhythm stays at 0.29 on the radio song even with a kick F1 of 0.92, because the sine bass and the 808's long tail fill the band. Every file.
3. **Drums lost or noisy on dense mixes.** The kick under a loud bass (Luci Rosse recall 27 %), eighth-note hats read as quarters (recall 46 to 47 %), false claps (257 on the radio song) that turn into 49 to 87 distinct grids and spurious variations. Level A's half-beat lock on an offbeat intro. Two of two files with truth; likely on the others (Heartstring's low-band rhythm 0.07).
4. **Harmony details.** Key and roots are right; the chord's third flips between major and minor inside a section, and the bass lands an octave off or follows the voice when the bass is weak. Chroma 0.71 to 0.89 against a floor of 0.60.
5. **Arrangement.** Section bounds are near on clear changes but miss short ones (Luci Rosse's 2-bar cut at bar 16, the 4-bar break at 34 found at 39), and the kinds are mostly Verse. Parts play in 86 to 98 % of bars, so the code is "full" while the original builds. Lower weight: the arc is 0.48 to 0.72 on three files.
6. **Tempo and key** are not a cause.

The bench's test songs miss causes 1 to 3, which is why its scores looked good. Task group 1 adds test songs that have them.

## Code changes: measures

Edits counted between the code shown at consecutive bars (an edit bar has at least one changed line; size is the changed characters):

| File        | Level | Bars with an edit | Edits per minute | Average size | Edits of 12 characters or less |
| ----------- | ----- | ----------------- | ---------------- | ------------ | ------------------------------ |
| Luci Rosse  | A     | 47 %              | 14.7             | 53           | 10 of 27                       |
| Radio song  | A     | 93 %              | 41.0             | 42           | 19 of 150                      |
| Heartstring | A     | 92 %              | 32.2             | 42           | 13 of 103                      |
| Guetta      | A     | 90 %              | 28.8             | 32           | 16 of 99                       |
| Luci Rosse  | B     | 12 %              | 3.7              | 136          | 0 of 7                         |
| Radio song  | B     | 17 %              | 7.7              | 58           | 1 of 28                        |
| Heartstring | B     | 13 %              | 4.7              | 171          | 3 of 15                        |
| Guetta      | B     | 33 %              | 10.5             | 88           | 19 of 36                       |

Level A (the tab's default) changes the code almost every bar. Its causes: a bass line is written per bar (a loop must repeat exactly over 13 of 16 steps), a chord loop grows from 2 to 4 to 8 bars as it is heard, a drum grid changes after two to three bars of a new grid, and the sounds are measured on the bars heard so far, so the `lpf` numbers move with them. Level B is calmer but Guetta's noisy drums and bass give a third of the bars an edit.

## Decisions

### D1. A similarity check on the rendered sound

`tools/decode-similarity.cjs` (dev server) fast-exports a decoded song and compares it with its original by the measures of the table above: rhythm per band, chroma and bass chroma, brightness ratio, band shares, arc. It runs on:

- the bench's test songs, plus two new ones in `tools/decode-songs.mjs`: an acid track (909 kick under a distorted saw bass on A1, a square hook, a crash) and a track with an arp and a lead over syncopated drums;
- the app's own songs `luci-rosse` and one fixed radio seed, exported by the app, with their timelines as truth;
- the owner's files when `DECODE_OWNER_DIR` points to them (results printed, not stored).

Scores of the first two groups go to `tests/snapshots/decode-similarity.json`; a later run fails when a score drops by more than 0.05. The targets (spec: Similarity targets) apply to the app songs and the new test songs.

Alternative: listening only. Rejected: I cannot hear, and the owner's impression needs numbers to tune against.

### D2. The Lead part (top line)

Level B finds the top line with Essentia.js's `PredominantPitchMelodia` (already in the package; misk-analyzer's YIN on the 200-2000 Hz band as fallback), one note per 16th step, quantised to the key's scale when within 40 cents, rests where the voicing confidence is low. Per section the writer keeps a loop of 1, 2 or 4 bars as for the bass and writes it as a `code` track `lead`: `n("<…>").scale("A3:minor")` with a sound by measure (D3). A section whose top line is voiced on less than 30 % of its steps has no Lead. Level A has no Lead: one bar of melody is too noisy, and the top line is the main point of level B.

The Lead also feeds the vocal lines (D6): where the top line is voiced the tab shows them.

Open question 1 asks whether a sung melody is written as a synth Lead too (recommended) or left to the vocal lines only.

### D3. Sounds by measure, calibrated on the track

Every measure is taken relative to the track's own distribution, not to absolute thresholds, because every mastered track is loud and heavy:

- **Drum machine:** kick decay time (time to −20 dB), kick spectral centroid and hat brightness against a table of the app's kits measured once in Node from their samples; the nearest kit wins. Distortion on the kick (the share of energy above 1 kHz in its first 30 ms) adds `.crunch(…)` or `.distort(…)` as the app's songs do.
- **Bass:** wave by the harmonic count (sine below 2 audible harmonics, square for odd-heavy, sawtooth otherwise); the filter cutoff by the bass band's centroid; a moving resonant peak (centroid range over a bar above 600 Hz) writes `.res(…)` with a sine range, as Luci Rosse's acid line does.
- **Chords and Lead:** level from the band's level against the drums' (no fixed `gain(.3)`), wave from brightness, `.room(…)` when the decay after a chord change is long.
- **Levels:** each part's `gain` set so the code's band shares are within 0.10 of the original's.

"Simple kit" does not change. Sounds still change only at a section change.

### D4. Drums on dense mixes

- **Kick under the bass:** a kick is a low-band onset with a broadband click (2-6 kHz rise in the same 10 ms) or a pitch fall; a bass note is a low-band onset without either. On a steady track a low onset on the beat that repeats on every beat for a bar counts as a kick even when its pitch does not fall.
- **Hats:** the hat threshold follows the hat band's own median per section, so quieter offbeat hats between loud ones are kept.
- **Claps:** a clap needs the snare band's rise to stand out against the hats of that bar, not only of the track.
- **Grids in level B:** a section's main grid is the per-step majority over the section (a step on in at least 60 % of the bars), not the most common whole grid, so noise does not split it into many grids.
- **Level A phase relock:** when the first kicks arrive after an intro, misk-analyzer checks the beat phase again on the first 8 bars with kicks and moves the downbeat by half a beat when the kicks fall on the off steps. The code restarts at the next bar, as a tapped tempo does.

### D5. Harmony and bass

- A chord's quality inside a section follows the section's majority for that root unless the other quality wins clearly (confidence above 0.8) in at least two bars.
- The bass keeps one octave range per section: its median note ± 7 semitones; a note outside moves by octaves into the range. A bar whose bass level is below 20 % of the section's loudest has no bass notes (avoids following the voice).

### D6. Vocal lines

The comment `// vox: …` becomes up to three lines at the end of the code, after a group header in the app's style:

```js
// ========== vox ==========
$: vox("reading from track").gain(0.8);
_$: vox("vocalizing").room(0.3);
```

- `vox(label)` is a new app helper registered in `src/song/writer.js` with the other helpers. It returns `silence`, so the line evaluates and plays nothing. The standalone prelude (Copy) defines it too, so pasted code still evaluates.
- Methods after it come from a short list of catalog functions that are harmless on silence (`gain`, `room`, `slow`, `late`, `pan`).
- Labels come from a list of about 20 phrases (`reading from track`, `modulizing from track`, `vocalizing`, `passing through song`, `tracing the voice`, `lifting the vocal`, `following the singer`, …), drawn by a seed from the file's fingerprint and the section, so a track always shows the same lines and sections differ.
- A line is `$:` where the model hears the top line (D2) and `_$:` where it does not; it changes at most at a section change. No top line in the whole track: no vox lines.
- The lines are written after `liveCode`, like today's comment, so they obey no comment option, and they never reach Open in Compose. `check:strudel` gets the decoded code of the test songs in its scan (`tools/strudel-code.mjs`).

Alternative: comment lines only (`// vox · reading from track`). Lowest risk, but the owner asked for lines that look like code. Alternative: a muted `s("vox")` line. Rejected: an unknown sample if unmuted.

### D7. The edit balance rule

The writer decides per part and bar whether the code changes, for both levels:

1. **Always edit** when a part enters or stops (mute or unmute), or at a section change or energy change of the model (a novelty peak of `src/decode/sections.js`).
2. **Otherwise edit a line** only when its new pattern differs enough and has held:
   - drums: at least 3 steps or a row that enters or leaves;
   - bass and Lead: at least 25 % of the note steps, or another root on the loop's first bar;
   - chords: another chord somewhere in the loop;
   - sounds: never outside a section change.
3. **Wait at least 4 bars** after the last edit of the same line, and at least 2 bars after any edit, unless rule 1 applies.
4. **Level A loops:** a loop of 2 or 4 bars replaces a one-bar loop once it repeated once; it never grows again inside the section.

Targets, measured on the files of D1 (spec: Balanced code changes):

| Measure                                     | Level A now      | Level B now  | Target        |
| ------------------------------------------- | ---------------- | ------------ | ------------- |
| Share of bars with an edited line           | 47-93 %          | 12-33 %      | 10-30 %       |
| Edits per minute at 120-130 BPM             | 14.7-41.0        | 3.7-10.5     | 2-8           |
| Average edit size                           | 32-53 characters | 58-171       | at least 20   |
| Edits of 12 characters or less              | 13-37 %          | 0-53 %       | at most 15 %  |
| Section changes with an edit within one bar | not measured     | not measured | at least 90 % |

The numbers are a starting point. Open question 2 asks the owner whether the range feels right after a listen.

### D8. Tap tempo key

The **T** key taps the tempo while the Decode tab shows and a track plays, with no modifier and the focus outside text fields and the editor. A key press of T does not activate a focused button, so the conflict goes. A **Tap** button next to ½× and 2× counts `pointerdown` and shows the taps so far (1/4, 2/4…). The space bar keeps play and pause only. Keys already used were checked: Space, Ctrl/Cmd+Enter, Ctrl/Cmd+., Escape everywhere; digits and P in the radio; pads in the sound browser; C and B in the live room window; Y, N and arrows in the soul display. T is free.

Alternatives: B (free in the main window, used in the live room window), `\`. Enter is rejected: it activates buttons.

### D9. Recent tracks and reopening

The list is hidden, not lost. `render()` draws "Recent tracks" only when no track is open (`src/decode/tab.js:573-580`), "Another file" calls the same picker as "Choose a file" (`:643`, `:179-188`), and nothing closes the open track, so after the first file the list never shows until a reload. The records are saved on open, during play and after Full (`:166-178`), with the file handle where the browser gives one.

- "Another file" opens a panel over the tab's controls with "Choose a file…" first, the recent tracks (title, artist, length, Full ready, Open, Remove) and Close. The open track keeps playing until another opens.
- Open reads the record from the list in memory and calls `requestPermission` first in the click, so the click's user activation is not spent on an IndexedDB read (`reopen()` awaits `store.get` first today, `:189-201`).
- A record with a current level B model opens in Full without analysing (today's path at `:146-148`). An analysis made old by a version change says so ("Full analysis made again: the analyser changed") instead of losing Full silently.
- When IndexedDB is unavailable (`store.ready === false`), the panel says "This browser keeps no recent tracks here" instead of the empty-list text.

## Risks / Trade-offs

- [The Lead adds a part that can be wrong, which sounds worse than no part] → Voiced share threshold per section; Lead on its own code track with mute and solo; similarity check per band.
- [Sound calibration overfits the app's own exports] → Two new test songs plus the third-party files in the check; targets on bands, not on exact sounds.
- [The edit rule makes level A slow to follow real changes] → Rule 1 never waits; the section-change coverage target.
- [`vox` is a new app name] → `check:strudel`'s clash rule and catalog coverage; defined in the standalone prelude.
- [`ANALYSIS_VERSION` goes up] → Stored tracks are analysed again on the next open, with a message (D9).

## Migration Plan

`ANALYSIS_VERSION` goes from 1 to 2. Stored records keep title, artist, tempo tapped and settings; models are made again. Songs already opened in Compose keep their code.

## Open Questions

1. **A sung melody as a synth Lead?** Recommended: yes, in Full, on its own muted-by-default code track, with the vocal lines kept. It is the part that makes a song recognisable; the owner can mute it.
2. **Edit balance range.** Recommended: 10-30 % of bars and 2-8 edits per minute, tuned after the owner listens to Luci Rosse and one vocal track in Live.
3. **Vocal lines on an instrumental lead.** The detector cannot tell a voice from a synth lead without machine learning. Recommended: show the vox lines wherever a top line is heard; they are decoration.
4. **Tap key.** Recommended: T, with the Tap button. Alternative: B.
5. **Default level.** With the Lead and the calmer code only in Full, should a track open in Full when the analysis takes under 10 s? Recommended: no, keep Live as the default and offer Full with a hint after 8 bars; it keeps Play immediate.
