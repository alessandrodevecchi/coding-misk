# Design

## Context

Round 11 left four defects the owner heard (proposal). The owner's file c-0.2 has a hand-read true code (`tools/decode-span-truth.mjs`, truth in the private notes); the bench has 37 songs with known code, six hit songs, seven owner files and 26 real tracks (stems from round 8 as a reference for the real tracks, never in the app).

All four fixes ended in the writer (`src/decode/writer.js`), on the analyses of round 11: every rule is measured on and off on the same models (`tools/decode-bench.cjs --models … --rules …`). `ANALYSIS_VERSION` 20 → 21 once, so stored analyses are read again with the round.

## D1. The measure: silent bars

`silentBars` in `tools/decode-hits.mjs`: per bar of the original's grid to the file's end, the original's level against its 90th percentile bar (music within 35 dB) and the code's against its own (silent more than 30 dB under, or past the code's end); `head` and `tail`, the silent bars of the first and last runs of music. In the bench's rows and log.

## D2. Silence: what caused it

Read on the four real tracks of the notes with their stems:

- the chord level gate (`chordsHeard`: 0.15 of the song's loudest bar, about -8 dB): intro and break pads 10 to 25 dB under the drops read no chords; their tones stand out of the band (round 11's tonal share 0.2 to 0.6), drums' noise never does (0.01 to 0.06);
- the key test: a break whose pad sits on the tonic with the other third (E major read in E minor), one root all along, failed both the key test and the power-chord test (which wants a second root): one real track's first 50 s were silent, its synth at -1 to -4 dB on the stems;
- the balance read a part's level from its first pattern: a quiet intro's pattern made it raise every other chord pattern (one real track +3.5 dB band error before this was fixed).

Not changed: an intro of drums the analysis hears no hits in, and the outros whose chords read under the tonal share.

## D3. Chords from a line's harmonics

A distorted or bright bass on one note rings at the note, its fifth (3rd harmonic) and its major third (5th harmonic): the chord read is the major chord on that note. Bar by bar this cannot be told from a true pad on the bass's root (the bench's held songs: a sawtooth bass under a pad on its root); the rule works per section and only on a driven or bright bass (fundamental share of the bass profile 0.65 or more: the acid lines, the distorted 16ths, the owner's file 0.70 to 0.87; plain sawtooth basses 0.33 to 0.58). Kept when a quarter of the bars read the note as a minor chord (a minor third is no harmonic: luci-rosse's Am stabs over its acid riff), or when the line moves over more than two roots (a bass following a progression, F G C, under synth chords that follow it: one real track lost 2.2 dB without this).

Not solved: c-0.2's Gm (the minor third comes from its acid line's own notes, which no measure tells from minor stabs), drumdrive-132's chord from the start, real-17's F5/E5 in the first drop (a loud synth on the stems), the voice of real-25 (no measure separates a voice from a pad: the moving top line holds all three chord tones on 0.03 of its chord bars).

## D4. The kick's click; a snare a 16th off

On c-0.2 a sidechained bass rises on the 16th before every kick, the grid's beat lands there, and the kick's click (a broadband hit) reads as a clap on every beat a 16th later. A clap on at least three beats a 16th after the beat, with no more than one clap on the beats, in half of a section's drum bars: those claps become the kick. Only after the beat: with the learned beat tracker's grid a top loop's hits a 16th before the beat read so too.

On real-25 a backbeat snare a 16th off the grid (its separated drums: one broadband hit on 5 and 13) was written as open hats, cymbals the owner heard at 0:23: hats on 3 and 11 or 5 and 13 alone in a section become claps.

The phase itself without the tracker: the strong snare-band hits that come back a beat later, the snare band's rise per 16th, the kick band's onsets were tried; none put c-0.2 on its kick. The tracker's phase is right on c-0.2 (0.410 s against the true 0.412 s); taking it from a 16th away (`BEAT_RULE.half` 0.2) writes four kicks a bar in the last drop and kick precision 0.61, recall 0.64, but worsens c-0.2 by 0.35 dB and c-0.8 by 0.65 dB band error: not taken.

## Verdicts

Before → after on the round 11 analyses; the per-fix numbers are all fixes against all fixes but that one.

| Fix | Target measure | Band error, real tracks (26) | Verdict |
| --- | --- | --- | --- |
| 1 quiet chords, tonic pads, balance | silent bars, real tracks 197 → 118 (first run 30 → 20) | 2.821 → 2.823; worst real-16 +0.15 | ships |
| 2 chords from a line | c-0.2 false chord onsets 58 → 41; hit-dist16 28 → 0 | 2.816 → 2.823; c-0.2 +0.14 | ships |
| 3 snare a 16th off | real-25 cymbals at 0:23 → claps; c-0.2 false claps 0-26 s 3.3 → 0 a bar | real-25 2.68 → 2.60 | ships |
| 4 kick's click | c-0.2 kick precision 0.26 → 0.65, recall 0.22 → 0.52; last drop 1 → 1 kick a bar | no change | ships (density not solved) |

Bench (37): band error 2.154 → 2.154, chords F1 0.553 → 0.553, kick, snare and hat F1 unchanged. Hit songs: chords precision 0.80 → 1.00, band error 2.243 → 2.272 (hit-dist16 1.57 → 1.75: the false chord had filled its mids). Owner files: 2.537 → 2.504.
