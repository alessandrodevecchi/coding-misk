## Context

- Devices (`src/song/rack.js`): `fold` (amount 0.1–3, curve sharp or soft; level `distortvol(max(1/g, P))` with `P = FOLD_PEAK[type]`), `ring` (freq 30–2000 Hz, amount 0–1; `.K(…)`, a Kabelsalat worklet per note, never louder), `fm` (index 0–4, harmonicity, wave, decay, sustain, a second operator). Fold and Distortion share superdough's distort stage: only the later one is heard, and the validator warns.
- Ring's measured cost (`docs/knowledge/sound-and-levels.md`, 2026-10-29): one or two tracks are fine in real time even on darksynth (143 notes/s): Ring on lead, bass and snare gave 0.46 s of underruns in 30 s on darksynth; Ring on all 12 tracks breaks real time. Fold on all 12 tracks: 1.8 s of underruns on darksynth.
- The director (`src/endless/director.js`, version 14): plans parts with roles (intro, groove, build, peak, break, drop, outro), detects the charge before a drop (`chargeOf`), and writes moves at phrase boundaries (`candidateMoves`: add, strip, variation, brighter, darker, dirtier, cleaner, more-space). Rack moves today use `delay`, `reverb`, `distort`, `crush`, `phaser` on melodic tracks. Fold on voices is drawn from its own stream (`rng.fork('fold/<index>')`) so the music does not move.
- The FM lab's three listening modes (`src/sounds/fm-lab.js`): Phrase (the card's part), Held note (one long note per bar), FM rise (the `.fm(…)` index as `saw.slow(4).range(0, top)` over 4 bars). These are the owner's "with phrase, held note, FM rise".
- Phrase length: 8 bars in most styles, 16 in ambient (`phrase` in the recipe).
- Steering (`steering.js`) rewrites a song from its plan and steps; locks and listener tracks are protected (`ctx.protect`).

## Goals / Non-Goals

**Goals:** a small, musical set of gestures; ranges that keep levels; a rate per style with good defaults; real time kept; fixtures moved only for a reason that the check proves.

**Non-Goals:** a per-track Ring worklet; gestures in Compose or in the radio console; new devices.

## Decisions

### D1. Five gestures

| Gesture                                  | When                                                                                          | Tracks                                             | What it writes                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Folded phrase** (with a phrase)        | groove, build or peak; 1 or 2 phrases                                                         | drums (not the busiest line), bass, lead, arp      | `rack` Fold at the start, `unrack` at the end                                           |
| **Fold rise into the drop**              | the charge phrase before a drop                                                               | bass or lead (else a drum)                         | Fold with a stepped amount, one value per bar (D3); `unrack` at the drop                |
| **Ringing held note** (with a held note) | intro, break or a quiet groove; one section                                                   | pad, texture, a lead with long notes               | `rack` Ring at a frequency from the key (D2); `unrack` at the next section              |
| **Metal hits**                           | a break                                                                                       | snare, clap, perc (never hats or the busiest line) | `rack` Ring for the break, `unrack` when the drums return                               |
| **FM rise with fold** (with an FM rise)  | the charge phrase before a drop, songs with a synth track that has (or may get) the FM device | that synth track; Fold on the kick or snare        | the FM index as a rise over the phrase (D3) and a folded drum; both removed at the drop |

The drop that follows a rise is the payoff: removing the effect at the drop makes the drop sound cleaner and bigger, the same idea as the director's breaks and charges.

| Option                                               | Notes                                                                                           |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **A (chosen)** a few named gestures placed as moves  | Musical shapes the owner can recognise and name in feedback; easy to count in checks            |
| B add `fold` and `ring` to the random "dirtier" pool | Simple, but effects appear anywhere, without a shape, and Ring's cost is uncontrolled           |
| C effects fixed per track for the whole song         | Less movement; the owner liked how the effects change the sound, which needs a before and after |

### D2. Ranges per track type

| Track type                | Fold amount, curve                                                                                         | Ring frequency                                             | Ring amount |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------- |
| drums (kick, snare, perc) | 1.5–2.5, sharp                                                                                             | 300–1200 Hz, not tied to the key (metal)                   | 0.5–1       |
| bass                      | 1.2–2.2, soft (sharp with chaos above 0.6)                                                                 | not used                                                   | not used    |
| lead, arp                 | 1.0–2.0, either                                                                                            | root × {2, 3, 1.5} (consonant) or root × 2.76 (bell-like)  | 0.3–0.7     |
| pad, texture              | 2.5–3, soft (a quiet pad folds only from 2.5)                                                              | root × {1, 2, 1.5}                                         | 0.3–0.6     |
| voice                     | 0.3–1.2, either (today's rule, unchanged)                                                                  | not used (it reads the left side only; words lose clarity) | not used    |
| FM rise top index         | 1.5–3 for lead and arp, 1–2 for bass (inside `fmInRange`: at most 4, one less per octave above the fourth) |                                                            |             |

The root is the song's key root in the octave around 110–220 Hz. Higher chaos widens the ranges toward their top; complexity does not change them.

### D3. Writing a rise

- **Fold rise:** Fold's amount as one value per bar, written in mini-notation (`.distort("<0.8 1.3 1.8 2.3 …>")` with `.distortvol("<…>")` of the same length), each step's level from `foldLevel`, so the level rule holds at every bar. The rack device gets an optional `steps` list instead of `amount`; the validator checks each step inside 0.1–3.
- **FM rise:** the FM device gets an optional `rise: { to, bars }`; it writes `.fm(saw.slow(bars).range(from, to'))` with `to' = to · 64 / 63` (the FM lab's rule, so the last sixteenth reaches `to`). The rise starts on a phrase boundary, a multiple of `bars`, so the saw starts from its bottom there.
- Ring stays a fixed frequency and amount per gesture: its frequency sits inside the `K(…)` expression and cannot follow a pattern without changing the device.

| Option                                          | Notes                                                                                        |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **A (chosen)** stepped Fold, smooth FM          | Fold's level needs a value per step; FM's index has no level rule, so the smooth saw is fine |
| B smooth Fold with one level for the whole rise | The level of the top amount makes the first bars too quiet                                   |
| C a new automation track in the song format     | General, but a format change for two uses                                                    |

### D4. Rate per style

A recipe may have `gestures: { songs: 0..1, weights: { foldPhrase, foldRise, ringHeld, metalHits, fmRise } }`. Without it, the genre family decides:

| Family (recipe `genre`)                 | Songs with gestures | Preferred gestures                              |
| --------------------------------------- | ------------------- | ----------------------------------------------- |
| hard: techno, industrial, drum-and-bass | 0.6                 | metal hits, Fold rise, folded phrase            |
| synth: synthwave                        | 0.5                 | FM rise with fold, Fold rise, ringing held note |
| club: house, trance                     | 0.35                | Fold rise, FM rise with fold                    |
| beats: hip-hop                          | 0.35                | folded phrase, metal hits                       |
| soft: ambient                           | 0.3                 | ringing held note only                          |
| acoustic: rock, metal, country, jazz    | 0.05                | folded phrase only (bass or drums)              |

Per song: draw whether it has gestures (`songs`), then one or two gestures by weight (a second one with chance 0.3 + 0.3 × chaos), each placed on the first part that fits its "When". A gesture that finds no fitting part or track is skipped, not replaced. Invented styles use their genre's family. The draws come from `rng.fork('gestures/<index>')`.

### D5. Safety and cost

- Fold and Distortion: a gesture skips a track with `distort`; while a track has Fold, the "dirtier" move does not add `distort` to it.
- Ring: at most two tracks at once (counting any Ring the listener or a saved pattern put there); never on the line with the most notes per bar, never on hats. On a song above 100 notes per second (measured by the arrangement check, estimated by the director from the patterns' steps), at most one Ring track.
- No gesture on locked tracks or listener tracks; a gesture already placed on a track the listener then locks stays as written.
- A gesture never changes the track count: it does not add or remove tracks.

### D6. Fixtures and the version

Gestures draw from their own stream, so a seed that draws no gesture gives the same song. Seeds that draw one change. `DIRECTOR_VERSION` becomes 15 with a comment line; `npm run check:endless -- --write-fixtures` rewrites the fixtures in the same commit. A director option `gestures: false` (checks only) turns them off, and `check:endless` compares every fixture with gestures off against a copy of the version 14 fixtures kept in `tests/` for this change: they must match exactly. That is the proof that nothing else moved.

## Risks / Trade-offs

- **Ring per note on dense styles:** D5 caps it; `tools/check-fm-effects.cjs` and `check-arrangement-levels.cjs` measure darksynth and industrial with gestures. If underruns grow, the first lever is the "above 100 notes per second" rule, then a lower rate.
- **Too much of a good thing:** with high rates many songs sound processed. The defaults are a guess; the recap tool's listening notes give the owner a place to say which gestures to keep.
- **Steering rewrites:** a listener's command that removes a track removes its gesture too; a gesture on a track the listener later changes stays as written. Acceptable for a first version.

## Open Questions

1. Drop "(trial)" from Ring's label now that the director uses it? Recommended: yes; the cost limits live in the director, and a per-track worklet is a later engine change.
2. Should the rates be the defaults above or more cautious (half) for a first listening round? Recommended: the defaults above, with a radio session per family for the owner to listen to, then tune.
3. Should the radio console show a gesture when it plays (for example in "Coming next")? Recommended: yes, a short label like "Fold rise" in Coming next, in a later small change, so the owner can tie what he hears to a name.
