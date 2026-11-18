# Design

## Context

Round 9's listening notes (eight tests) and the round 11 plan (private notes). Level B writes the chords from the per-bar chord of Essentia.js's HPCP (or misk-analyzer's), kept by `chordsHeard` (a confident chord over a fair chord level) and by the key test (`inKey`, power chords from round 8). Nothing measures how the chords are played.

## Decisions

### D1. The measure first (G)

`tools/decode-hits.mjs` adds two measures to the bench (`tools/decode-bench.cjs`, every row):

- **Hit density from the audio**, for every file, the real tracks too: per bar and band (low 30-150 Hz, mid 150-2000, high 5-16 kHz) the hits (a rise of 6 dB or more within three frames of 11.6 ms, at least 46 ms apart, above the file's floor 35 dB under its loud frames) and how held the band is (the bar's 25th percentile level against its 90th, dB); per band the mean absolute difference per bar of the hits (`hitErr`) and of the held measure (`heldErr`), and the bias. Levels in dB make it independent of the mix's gain.
- **Per-part onsets from the code**, for every bench song (its song is known): both songs evaluated by Strudel in Node (the voicing left out: Node cannot voice, the chord's hap keeps its onset), onsets per part (kick, snare, hats, bass, chords, lead) matched within 40 ms: precision, recall, hits per bar.

Six songs built for the defect (`HIT_SONGS`): stabs on eighths and on a sixteenth rhythm; the same progression held; a distorted bass on sixteenths alone; a distorted bass under a sung-like lead; a pad entering at bar 16; two equal drops around a pad break.

The owner's file c-0.2 was meant as a second ground truth, but its code was not found in the notes or the bench scripts: it is measured with the audio measure only.

### D2. Chord rhythm (A)

`chordHits` (src/decode/hit-measure.js): frames of 2048 samples a quarter step apart; in each frame the bins of the chord's pitch classes between 300 and 2500 Hz, each counted by how far its power stands over twice the larger of its neighbours six bins away (a partial is a narrow peak; a kick, a clap, a hat or noise is smooth across a few bins). A step is a hit when the step's first frames reach 0.35 of the bar's top from at most 0.6 of that (and at least half) just before. Measured on the hit songs: stabs on eighths read exactly `x.x.x.x.x.x.x.x.` with held 0.15-0.18; the sixteenth rhythm reads exactly; the pad reads no hits with held 0.61-0.72. Without the neighbours (a flat-spectrum excess) the kick's steps read as hits on both songs.

The writer (writeFull): per section, the chord bars' mean tonal share, held measure and hits on steps where no bass note starts (a bass on the chord's root rings in its tones; the measure also leaves out the tones the bar's bass rings at, its root, fifth and major third, when the chord keeps one); with a share of `CHORD_RULE.tonal` or more, under `CHORD_RULE.held`, at least `CHORD_RULE.hits` hits a bar and a steady rhythm, the struct is the steps hit in at least half the bars (on eight steps when every hit is on an even step), per block of four bars when the whole section is rhythmic. The struct's events last one step, as a stab does.

### D3. Where chords are (B)

The chord's tonal share (the peaks' energy at its tones over the band's whole energy) separates the hit songs (no chords 0.008-0.036, sawtooth stabs and pads 0.12-0.59) but not the app's detuned supersaw pads under loud drums (0.01-0.06): a rule "no chords under 0.045" left out real pads on the bench (chords recall 0.55 to 0.27) and was dropped. The share now only gates the rhythm (A): under 0.1 the measure says nothing and the chords stay held. For the same reason a rhythm must come back on its steps (`steady`): a detuned pad's beating reads hits at random.

A one-fundamental test (how much of the band's peaks one harmonic series explains) was tried for the voice and the bass's harmonics: a held pad over its root reads 0.73-0.93, a sung line 0.77-0.89; it does not separate, and is not used.

Power chords: round 8 writes a section's chords as power chords when they fail the key test as triads but their roots stay in the key. The rule "no power chords where the bass is heard on their roots and the chords never attack off the drums" (the fifth as the bass's own harmonic; real-16's distorted sound is a synth bass with its fifth, see the round 11 notes) left out the true chords of two bench songs (a two-feel song whose pad reads as power chords, and luci-rosse): chords F1 on the bench 0.54 to 0.51, nothing better on the real tracks. Dropped.

### D4. Repeated bass (C)

misk-analyzer leaves the bass empty on the kick's steps and marks a note held while the low band does not dip. `bassAttack` reads, per step, the energy at the harmonics of the bar's main bass note between 150 and 1200 Hz (peaks over their neighbours, as D2), its top at the step against its least just before. The writer fills an empty or held step where it rises past `BASS_RULE.attack`.

### D5. Twin sections (D)

Sections with the same main drum grid and bass loops that are the same line (`sameBassB`) are twins; a part one twin writes and the other does not is written in the other when the model hears it there on at least `TWIN_RULE.heard` of the bars (else it stays out: a twin can really drop a part).

### D6. Levels (E)

A ceiling of 0.5 on the chords' gain in the balance (the owner heard power chords at 0.85 cover a riff): the balance, whose gains are chosen together, then lowered the drums and the bass as well, and one real track went from 2.9 to 4.8 dB band error (the real set 2.82 to 2.89). Dropped; the kick's level is not changed in this round.

### D7. Verdict

A fix ships only when it improves the hit density (hits per bar and the held measure from the audio, and the parts' onsets where the code is known) without making the real tracks' band error worse by more than 0.3 dB on average, nor one track by more than 1 dB without a reason. The numbers per fix are in the round 11 notes. A ships with `steady` 0.65: at 0.5 and 0.6 it also wrote rhythms on supersaw pads and on two real tracks, whose hit density got worse.

## Risks

- A struct on a held pad whose level moves (a sidechained pad) reads as hits: the held measure guards it (a sidechained pad keeps most of its level).
- A real guitar playing power chords on the bass's roots loses its chords (D3); the bass carries the riff.
- Every number here was chosen on the hit songs and checked on the rest of the bench and the real tracks; the hit songs are tuning songs.
- A, as shipped, fires on clear repeating stabs only: on the real set it writes no rhythm; the held chord over fast hits of round 9's notes stays on most real tracks.
