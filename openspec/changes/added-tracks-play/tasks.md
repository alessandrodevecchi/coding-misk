# Tasks

## 1. Measure

- [x] 1.1 Seeded radio songs in Node (Classic, Live coder, Crescendo; the checklist burst fx8; slow 10-minute songs): for each "+" track the bar its batch takes, the first bar it sounds, the bars heard in its entry phrase, the longest silence after it. Results in `design.md`.

## 2. Director

- [x] 2.1 In `directSong`, add to `brought` the listener tracks from `protect` whose bar is the half-phrase start before the boundary (D1). Verify: `npm run check:added-play` passes; it fails on the code before the change.

## 3. Checks

- [x] 3.1 `tools/check-added-play.mjs` and `npm run check:added-play`: "+" on the half-phrase start before a break (two kicks and a bass), with and without an energy command on the break's boundary; seeded batches with other commands under the cap. Every listener track plays every bar of its entry phrase, the director's drums leave on the break, the added kicks play at the drop.
- [x] 3.2 `npm run check:endless` (fixtures unchanged, `DIRECTOR_VERSION` stays 20), `npm run check:steer-memo`, `npm run check:radio-profiles`, `npm run check:live-code`, `npm run build`.
