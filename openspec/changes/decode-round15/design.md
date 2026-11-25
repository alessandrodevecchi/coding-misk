# Design

## Context

Base: `feat/95-modulation` (`34da440`), with the Sweep, LFO and Pump devices and the modulated test songs (`MOD_SONGS`, VALIDATION). The bench measured each correction on the same models: round 14's analyses (`r14g`) for the files that did not change, and one new analysis of every file with the round's level B (`r15a`, which also holds the measures of A and C). Writer rules were switched on and off with `decode-bench.cjs --rules`. Sets: tuning 14, validation 24 (the ten modulated songs among them), fresh 9, hit songs 6, the owner's files 7, real tracks 26.

## D. A cleaner envelope measure: fixed in the fast export, the measure stays

Per bar, the pumped song against its still take (1.4-2.8 kHz, 8 phases of the beat): the Pump without a kick dips about 6 dB and climbs back over the beat, as designed, but the dip moves a quarter beat later in each bar and comes back every 4 bars. Folded over the whole file the dips cancel, so the envelope error saw 0.62 dB.

Cause: `src/render/page.js` called `superdough(value, t, duration, cps, cycle)` with the note's time in seconds as `cycle`. superdough starts an LFO's (and a tremolo's) wave at `cycle / cps × rate`; with seconds there, each note started at `t × rate`, a quarter beat further each bar at 124 BPM. The live player passes `hap.whole.begin`; the fast export now passes the hap's cycle too. Only the modulated test songs use LFO or tremolo devices; they were exported again.

| Song against its still take, mid band (dB) | Before the fix | After |
| --- | --- | --- |
| mod-pump-bare | 0.62 | 2.02 |
| mod-gate-bare | | 1.17 |
| mod-trem / mod-trem-bare | 2.7 (mean of bands) | 2.43 / 1.32 |
| mod-pump (with the kick: duck, unaffected) | | 0.70 |

The 1 dB scale is reached with the measure as it is. The plan's measure (the mid band less the part explained by the low band, a per-file fit of mid on low) was tried after the fix and dropped: mod-pump-bare 2.02 → 1.82, mod-pump 0.70 → 0.79, mod-gate 0.76 → 1.13, mod-trem-bare 1.32 → 1.35; no clearer separation, and every baseline would move. The validation set's baseline with the new exports: envelope error 4.16 dB mean, 2.37 mid (before: 4.29 and 2.38).

## B. A song without drums: ships

The pump was not the cause: the still takes without drums (`mod-pump-bare-still`) read the same four kicks. Level B's every-beat rule follows the low band's rise of the offbeat bass and the pad's low notes, scaled to the track's own (absent) kicks, on all five drumless songs. A per-section contrast of the kick's attack (90-250 Hz and 4-12 kHz on the kick steps against the other steps) does not separate them from the real tracks, whose kicks often sit under a loud sidechained bass (real tracks down to -5.4 dB). A song-wide test does:

| Files | Kick bars with another drum row | Median click (4-12 kHz rise, dB) |
| --- | --- | --- |
| drumless test songs (pump, gate, LFO, sweep) | 0.00-0.44 | -4.9 to 3.3 |
| drumless tremolo song (the tremolo reads as hats) | 1.00 | -1.1 |
| bench songs with drums | 0.79-1.00 | 6.9-30 |
| real tracks, owner's files | 0.65-1.00 (two at 0.65 and 0.69) | -0.8 to 29 |

Rule `DRUMLESS = { cover: 0.8, others: 0.5, click: 6 }` (full.js `drumless`, after `kickShape`, before the grid rotation): kick rows on 80 % of the bars or more, other rows on fewer than half of them, median click under 6 dB.

| Measure | Before → after |
| --- | --- |
| False kicks on the four drumless songs | 64 each (3.8-4 a bar) → 0 |
| Envelope error, mean of bands, those four | 4.45 / 2.55 / 2.39 / 3.25 → 1.63 / 1.97 / 1.01 / 0.92 dB |
| Envelope error, mid band | 2.11 / 1.39 / 0.69 / 0.68 → 0.99 / 1.42 / 0.55 / 0.56 dB |
| Held-note error | 9.80 / 9.97 / 11.65 / 10.71 → 10.44 / 10.24 / 11.62 / 10.39 |
| Band error | 4.59 / 4.48 / 5.46 / 7.17 → 9.23 / 5.19 / 6.15 / 7.77 dB |
| 26 real tracks, 7 owner's files, tuning, fresh, hit songs, the other modulated songs | identical (no song changed) |

Written reason for the band error of the drumless songs (validation songs, not real tracks): the kick's click and the 909's top filled the 2.8-11 kHz octaves the decoded pad, written darker than the original's, leaves empty (mod-pump-bare 2.8-5.6 kHz: -8.8 → -18.4 dB). The code no longer plays a part the original lacks; its pad's brightness is a separate defect. The low band's hit error rose too (9.75 → 11.31 on mod-pump-bare): the original's low band rises 14.8 times a bar with the bass and the pad, and the written kicks matched some of those rises.

## A. The pump measured: dropped

Measure: per bar with a chord, the chord tones' peaky energy (as `chordHits`, 300-2500 Hz, the bass's harmonics left out) at 16 frames a beat, folded over beats 2 to 4 (`pulse`). Rule (`PUMP_RULE`, writer): over the bars with a chord and a kick, the least level in frames 1-5 at least 3 dB under the beat's second half, that half within 3 dB, back within 1 dB by frame 8; depth `1 - 10^(-dip/20)`, recovery from the frames. It fires on mod-pump (depth 0.39, recovery 0.09 s; truth 0.6 and 0.15), six real tracks and two owner files, and on no other bench song. Songs without a kick: none (their grid's phase cannot be trusted: the drumless songs' grids sit half a beat off).

| Measure | Without → with |
| --- | --- |
| mod-pump envelope error, mid / mean | 6.80 / 6.09 → 7.07 / 6.18 dB |
| mod-pump held-note error | 10.52 → 10.93 |
| mod-pump band error | 6.13 → 6.15 dB |
| 26 real tracks: band / held / envelope mid | 2.817 → 2.829 / 13.916 → 13.907 / 1.911 → 1.896 (real-20 band +0.22) |
| 7 owner's files: band | 2.438 → 2.455 |

The only song with a known pump gets worse on all three of its measures; the real tracks move by hundredths. Dropped, as the sound-modulation bench predicted: a Pump on decoded chords that do not play like the original's pad does not bring the envelope closer.

## C. A measured sweep: dropped

Measure: per bar with a chord, the centroid of the chord tones' partials (250-8000 Hz, 8 frames). Rule (`SWEEP_RULE`, writer): the log brightness less the mean of the bars with the same chord, against the bar's place in a loop of 4, 8 or 16 bars from its clip's start; a fit with r² ≥ 0.5 moving 0.5 octave or more is a looping Sweep.

| Files | Best fit (P = 8) |
| --- | --- |
| mod-sweep, mod-sweep-bare (truth: 300 → 5000 Hz over 8 bars, loop) | r² 0.54 / 0.58, +0.69 / +0.62 octave |
| decode-test-174, fresh-stab-122, held-505-drive (no sweep) | r² 0.54 / 0.53 / 0.52 |
| real tracks, owner's files (real-25 and c-0.2 among them) | under 0.5, nothing written |

With a progression of four chords, removing each chord's register leaves only the difference between the loop's two halves: a filter that opens and a phrase whose second half is brighter read alike. The written sweep (865 → 1399 Hz on mod-sweep) moved its measures the wrong way (held 13.49 → 13.54, band 1.94 → 1.95 dB). Dropped.

## Totals, round 14 → round 15

| Set | Band error dB | Envelope error dB | Held-note error |
| --- | --- | --- | --- |
| tuning (14) | 2.172 → 2.172 | 4.876 → 4.876 | 9.438 → 9.438 |
| validation (24) | 3.394 → 3.670 | 4.157 → 3.861 | 11.030 → 11.054 |
| fresh (9) | 1.540 → 1.540 | 4.346 → 4.346 | 8.452 → 8.452 |
| hit songs (6) | 2.272 → 2.272 | 4.319 → 4.319 | 9.634 → 9.634 |
| owner's files (7) | 2.438 → 2.438 | 4.239 → 4.239 | 12.602 → 12.602 |
| real tracks (26) | 2.817 → 2.817 | 4.729 → 4.729 | 13.916 → 13.916 |

(Validation's "before" uses the modulated songs exported again with the export fix.) Kick F1 of the validation set 0.713 → 0.871.
