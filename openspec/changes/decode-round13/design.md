# Design

## Context

Round 12 left five defects (proposal). The owner's file c-0.2 has a hand-read true code (`tools/decode-span-truth.mjs`, truth in the private notes); drumdrive-132 is a bench song with its code in `tools/decode-songs.mjs`; the bench has 37 songs with known code, six hit songs, seven owner files and 26 real tracks (stems from round 8 as a reference, never in the app).

A, C and D ended in the writer (`src/decode/writer.js`); C adds one measure to level B (`kickShape`, `src/decode/hit-measure.js`, called by `full.js`). The bench measured the writer on the round 11 analyses with that measure added by the same function (models `r13m`), each fix on top of the one before. `ANALYSIS_VERSION` 21 → 22 once.

## A. Silent endings: ships

Read on the two real tracks with their stems:

- real-18: the model's ending (`sections.js endingOf`: the bar after the last bar with a part heard or a level over 0.05 of the loudest bar, about -13 dB) fell at bar 153 of 171, while the pad fades from -15 to -35 dB until bar 165. The song was cut there. Rule `TAIL_RULE`, `tailEnd`: the song goes on over the bars after the ending whose chord reads with confidence 0.5, a tonal share of 0.2 (round 12's quiet chords) and a chord level of 0.01 or more (the model's rounding, about -23 dB), gaps of one bar, at least two bars; the last section grows.
- real-17: the outro (3:15 to the end) reads E on 6 of 8 bars with confidence, tonal share 0.06 to 0.21 (mean 0.13) and no drums; the stems have a synth from -9 to -28 dB. No bar passes the quiet chord rule (tonal 0.2), and the islands that do are shorter than two bars. Rule `DRONE_RULE`, `droneOf`: a section with no chord heard, drums on at most half its bars, one root in the key's scale on 60 % of the bars with confidence, mean tonal share 0.1 or more, writes a power chord on that root at the quiet gain.

| Measure | Before → after |
| --- | --- |
| real-17 silent bars (last run) | 15 (8) → 9 (1) |
| real-18 silent bars (last run) | 12 (12) → 4 (4) |
| 26 real tracks, silent bars | 118 → 104 (last run 37 → 22) |
| real-17 band error | 2.765 → 2.786 dB |
| real-18 band error | 5.339 → 5.339 dB |
| every other file | unchanged |

Left: real-18's last four bars (-32 to -35 dB, chord level 0.00), real-17's intro (0-3) and its bars 41-43.

## B. One line is not a chord: dropped

Two measures of how many pitches sound at once, on the chord bars of every file:

- **Tones together** (per frame of a bar, each chord tone's energy over its own top; the weakest tone's share of the frames where it sounds, or the frame's weakest over strongest tone): the bench's true pads and stabs read 0.03 to 0.25 (decode-test-124's pad 0.03 to 0.25, the stab song 0.08 to 0.22), c-0.2's acid line 0.02 to 0.22. In a mix the tones' peaks are too noisy per frame. No separation.
- **One note's harmonics** (per 16th step, the share of the 200-2500 Hz peaks that one note's harmonics 1 to 4 explain, its fundamental a peak): c-0.2's chord sections 0.54 to 0.71, the bench's pads and stabs 0.29 to 0.56, but the real tracks' chord sections 0.66 to 0.87 (a sung or synth lead over the chords is one note on top). A threshold that removes c-0.2's chords removes most real tracks' chords first; real-25's sections read 0.66 to 0.84, inside the real tracks' range.

No rule ships. c-0.2's false chord attacks stay at 41; real-25's voice still reads as chords.

## C. A full kick: ships; the grid phase: not taken

`kickShape` (level B, per bar with drum hits): the 90-250 Hz band's rise in dB at each 16th step's start over its least just before (frames of 512 samples, four to a step), and the same for 4-12 kHz. Averaged over a section's drum bars, a kick on every beat shows one step p of the beat whose weakest beat rises most. On c-0.2 that step is 1 (a 16th after the grid) in every section with a kick: 7.0 to 8.8 dB against at most 5.5 elsewhere; in its last drop 8.7 against 2.6.

Rule `FULL_KICK`, `fullKick` (after `kickClicks`): in a section whose drum bars' mean drums level is 0.6 or more, a step p rising 6 dB or more on the weakest beat and 3 dB over every other step, when another section of the song has four kicks a bar on p (`fourOnFloor`) and this one has fewer than three: four kicks on p and no other kick; claps a 16th before those kicks on three beats or more go (the sidechained bass's rise; kept, they played a flam with the moved kicks).

Tried first and narrowed: without the song's own four-on-the-floor the rule fired on offbeat basses and a dub skank (51 sections of 26 files, among them a boom-bap and a dub song); without the level gate it fired in breaks and quiet verses (two real tracks +0.44 and +0.32 dB, real-05 +0.37 dB).

| Measure | Before → after |
| --- | --- |
| c-0.2, kick precision / recall against its truth | 0.65 / 0.52 → 0.92 / 0.91 |
| c-0.2, kicks a bar in the last drop (92-120 s, truth 4) | 0.95 → 3.81 |
| c-0.2, false claps a bar at 28-51 s | 3.68 → 2.69 |
| c-0.2, band error | 2.33 → 2.17 dB |
| luci-rosse (bench / owner's file), band error | 1.045 / 1.446 → 0.984 / 1.408 dB |
| bench, kick F1 | 0.920 → 0.921 |
| 26 real tracks, band error | 2.824 → 2.821 dB (real-26 -0.10, real-20 +0.005) |

The grid's phase from the kick's attack without the beat tracker: not taken. The rule above puts the kicks on the true step without moving the grid; moving the grid itself a 16th was measured in round 12 (with the beat tracker's phase) and worsened c-0.2 and c-0.8 by 0.35 and 0.65 dB, because every bar's analysis moves with it.

## D. The early held chord: ships

drumdrive-132's code: drums (606, drive 2.5), a rolling bass from bar 0, a pad only in its second section (bar 16). The analysis keeps one section of 33 bars (only the pad enters), and the bars before 16 read the distorted drums' noise in the chord band as Gm and Ab with confidence 0.75 to 0.89, in the key: chords from the start. The tonal share does not separate (0.00-0.02 before, 0.01-0.04 with the pad: a detuned pad under loud drums); the tones' hold does (chordHeld 0.03-0.06 before, 0.07-0.29 after) with the chord level (0.68 → 0.92).

Rule `LATE_RULE`, `lateChords`: a section's first 8 bars or more (a multiple of 4) with a mean chordHeld under 0.07, followed by bars that hold twice as much with a chord level at least 1/0.85 of theirs, write no chords. It fires only on drumdrive-132.

| Measure | Before → after |
| --- | --- |
| drumdrive-132, chords from | bar 0 → bar 16 (the code: bar 16) |
| drumdrive-132, band error | 1.63 → 1.26 dB |
| bench, chords precision / F1 | 0.712 / 0.553 → 0.728 / 0.563 |
| every other file | unchanged |

## Whole bench, round 12 → round 13

| Set | Band error dB | Silent bars | Chords P / R | Kick F1 |
| --- | --- | --- | --- | --- |
| bench (37) | 2.154 → 2.143 | 22 → 22 | 0.712 / 0.549 → 0.728 / 0.549 | 0.920 → 0.921 |
| hit songs (6) | 2.272 → 2.272 | 2 → 2 | 1.00 / 0.77 → 1.00 / 0.77 | 1.00 → 1.00 |
| owner's files (7) | 2.504 → 2.476 | 4 → 4 | – | – |
| real tracks (26) | 2.823 → 2.821 | 118 → 104 | – | – |

No real track worse by more than 0.03 dB; luci-rosse, real-05, real-18, the stab and dist16 hit songs not worse.
