# Proposal

Refs: coding-misk/#82

## Why

The owner's note of 7 November: with many "+" presses, the director can leave one or two added kicks silent. The owner approved the proposal "a track added by hand plays at least in the phrase it enters".

Measured on 12 November with seeded radio songs in Node (`design.md`, Measurements), the only case where a "+" track does not play its whole entry phrase is this: a "+" on a half-phrase start (console-add-waves D6, slow songs) just before a break or the charge before a drop. The director keeps a listener track in the break only when it came in on the break's own boundary. A track that came in half a phrase earlier was taken out after 4 bars, with the other drums, and stayed silent through the break. Kicks were the usual case, because a break takes out the drums.

The other silences measured are designed: the later lines of a batch enter one or two phrases after its head (console-add-waves D5), a listener's drums sit out a break and come back after it (radio-arrangement D4), and after a break a listener track waits for room under the 12-track cap (after-tests-oct28 D8).

## What Changes

- **Director.** A listener track that comes in on the half-phrase start just before a boundary counts as brought in on that boundary. The break or the charge of that boundary leaves it in, as it already does for a track brought in on the boundary itself.
- **Check.** `npm run check:added-play` (no browser): "+" on the half-phrase start before a break, with and without a later command on the break's boundary, and seeded batches of "+" with other commands, under the console's cap. Every listener track plays every bar of its entry phrase; the break still takes out the director's drums; the added kicks play at the drop.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `endless/steering`: a listener track plays at least the phrase it enters.

## Impact

- `src/endless/director.js` (`directSong`, the set of tracks brought in on a boundary).
- New `tools/check-added-play.mjs` and the `check:added-play` script.
- Songs without console commands do not change: the endless fixtures stay the same, so `DIRECTOR_VERSION` stays at 20.
