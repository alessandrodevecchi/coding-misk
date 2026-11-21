# Design

## Context

Round 13 left three defects (proposal). The owner's file c-0.2 has a hand-read true code (`tools/decode-span-truth.mjs`, truth in the private notes); the bench has 37 songs with known code, six hit songs, seven owner files and 26 real tracks.

The bench measured each fix on round 13's models (`r13m`: round 11's analyses with `kickShape` added). B changes the model (models `r14g`: `r13m` with `rotateGrid` applied, which changes only c-0.2); C is a writer change measured on `r14g` against the code before it. `ANALYSIS_VERSION` 22 → 23 once.

## A. A line is not a chord, third try: dropped

Per chord bar, the chroma (250-2000 Hz, window 3072 samples) at the middle of each 16th step; three measures:

- **flux**: the energy-weighted mean of 1 − cosine between consecutive steps' chroma;
- **peak flux**: the same on the spectrum's peaks only (a drum's broadband hit adds no peak);
- **held share**: the sum over pitch classes of the chroma share held on 75 % of the steps.

| Files | flux (median) | peak flux (median) | held share (peaks, median) |
| --- | --- | --- | --- |
| hit-pad-124, hit-voice-120 (clean pads) | 0.02-0.03 | 0.03 | 0.87-0.96 |
| bench pads and stabs (fresh-stab-122, fresh-supersaw-128, hit-stabs-124) | 0.20-0.25 | 0.24-0.50 | 0.43-0.44 |
| c-0.2, the acid line (all chord bars) | 0.46 | 0.56 | 0.24 |
| c-0.2 sections with the kick (0-51 s, 92-120 s) | 0.39-0.46 | 0.51-0.55 | 0.16-0.35 |
| c-0.2, line alone (51-92 s) | 0.61 | 0.66 | 0.11 |
| real-25 before 0:32 / from 0:32 (voice) | 0.25 / 0.29 | 0.32 / 0.38 | 0.24 / 0.28 |
| 26 real tracks (medians per file) | 0.16-0.45 | 0.18-0.78 | 0.08-0.51 |
| luci-rosse | 0.28 | 0.49 | 0.30 |

The line moves more than a pad, but the real tracks move as much: real-09, real-10 and real-13 read a peak flux of 0.62-0.78 and a held share of 0.08-0.14, more line-like than c-0.2. The voice of real-25 reads like a pad (0.29). A section threshold of 0.6 on the flux of blocks of 8 bars takes 2 of c-0.2's 8 blocks, and blocks of real-07, real-08, real-09, real-15, two more owner files and a bench arpeggio. No rule; c-0.2's false chords stay at 41 attacks, real-25's voice still reads as chords.

## B. The grid on the kick: ships

Rule `GRID_ROTATE`, `gridRotation` and `rotateGrid` (writer.js), applied at the end of level B (full.js), so the downbeat that aligns the code with the original moves too:

- per section with 4 drum bars or more, round 13's measure: the step p of the beat whose weakest beat's mean `kickShape` rise is highest; clear when 6 dB or more and 3 dB over the other steps;
- every clear section on the same p, p = 1 or 3 (a 16th after or before the grid; p = 2 is an offbeat bass or hat), clear sections holding half the song's drum bars or more;
- not when the claps already play a backbeat on the present grid (4 and 12 on half the drum bars and twice as often as 0 and 8): c-0.2's "claps" sit on every step, the sidechained bass's rise;
- the downbeat moves a 16th (later for p = 1); every bar's step rows (drums, bass, lead, bass hold, chord hits, `bassAttack`, `kickShape`) rotate across the bar lines. Round 12's kick click and round 13's full kick run first on the present grid and are baked in: rotated first, the click sits on the beat and the kick row on the bass's rise, and the written kicks fell on the bass (kick precision 0.92 → 0.26).

Unlike round 12's beat-tracker phase, the bars' own measures stay those of their bar (a 16th of a bar moves them little). Only c-0.2 moves among the 76 cached files (sections 16-28 and 52-67, 8.8 and 8.7 dB on step 1, 55 % of its drum bars); c-0.8 has one clear section on step 1 at 46 % of its drum bars and stays.

| Measure | Before → after |
| --- | --- |
| c-0.2, band error | 2.173 → 1.905 dB |
| c-0.2, kick precision / recall against its truth | 0.924 / 0.914 → 0.924 / 0.914 |
| c-0.2, the written kick row | `.x...x...x...x..` → `x...x...x...x...` |
| c-0.2, bass precision / recall (truth: 16ths) | 0.31 / 0.42 → 0.26 / 0.32 |
| owner files (7), band error | 2.476 → 2.438 dB |
| every other file | unchanged (not rotated) |

The bass against its truth loses a little: the bass fill reads the kick's steps, now on the beat. The band error and the code improve; it ships.

## C. Silent bars: ships

Causes (model bars):

- real-18's last bars (165-170): the chord reads with confidence 0.7-0.84 and a tonal share of 0.2-0.68, but the chord level rounds to 0.00 (-32 to -35 dB) and `TAIL_RULE.level` stopped the tail at bar 161.
- real-17's bars 1-3 and 42-43: no drums, the same root E as the pad heard right after, a tonal share of 0.05-0.13 and a chord level of 0.01-0.03: under the quiet rule's 0.2.

Rules:

- `TAIL_RULE.fade` (0.2): past the tail's own bars, bars with no drums whose chord reads with confidence and a tonal share of 0.2 or more continue it, whatever their chord level.
- `LEAD_IN` (`leadIns`): up to 4 bars with no drums before a run of 2 or more heard chord bars, on the run's root, with confidence 0.4, a tonal share of 0.05 and a chord level of 0.01, play the chord. Two narrowings found on the bench: a single heard bar is no run (an outro's lone bar joined its quiet bars and pulled the outro out of the drone rule: real-17's outro and real-16's went silent, real-16 11 → 14 silent bars), and the section's tonal test and quiet gain read only the bars heard on their own (a lead-in bar at 0.06 dragged real-16's outro under the tonal test); the key test reads them too, their root being the pad's.

| Measure | Before → after |
| --- | --- |
| real-18, silent bars | 4 → 0 (band 5.339 → 5.339 dB) |
| real-17, silent bars | 9 → 5 (band 2.786 → 2.779 dB) |
| real-16, silent bars | 11 → 9 (band 2.641 → 2.601 dB) |
| real-12, silent bars | 4 → 0 (band 0.986 → 0.986 dB) |
| 26 real tracks, silent bars | 104 → 89 |
| 26 real tracks, band error | 2.821 → 2.817 dB (worst real-09 +0.05, real-06 +0.015) |
| bench, hit songs, luci-rosse | the same written songs, byte for byte |

real-17 keeps 5 silent bars, among them bars 0-1 (C at a tonal share of 0.04, E at a confidence of 0.49 with no heard run 4 bars after it).

## Whole set, round 13 → round 14

| Set | Band error dB | Silent bars | Chords F1 | Kick F1 |
| --- | --- | --- | --- | --- |
| bench (37) | 2.143 → 2.143 | 22 → 22 | 0.563 → 0.563 | 0.921 → 0.921 |
| hit songs (6) | 2.272 → 2.272 | 2 → 2 | 0.792 → 0.792 | 1.00 → 1.00 |
| owner files (7) | 2.476 → 2.438 | 4 → 4 | – | – |
| real tracks (26) | 2.821 → 2.817 | 104 → 89 | – | – |

luci-rosse, real-05, real-18, hit-stabs-124, hit-dist16-130 and drumdrive-132 unchanged in band error.
