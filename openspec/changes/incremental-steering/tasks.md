## 1. Check first (about 3 h)

- [ ] 1.1 `tools/check-steer-memo.mjs` and `npm run check:steer-memo` (D7): songs, seeded mixed sequences with pending presses, cancels and replaced batches; reused against full steering byte for byte after every press; deep freeze of kept values; the context changed halfway. Written before the reuse, with the reuse switch as a stub, so it runs on today's code (all presses equal) and stays the reference.
- [ ] 1.2 `tools/steer-bench.mjs` (D8): the songs of the design, nine presses, the time per press and per part (director, transit, typing, compile), `STEER_MEMO=0/1` interleaved per press, the load average at start and end. Record today's numbers on a quiet machine in `design.md` next to the loaded ones.

## 2. Reuse per command prefix (about 2.5 h)

- [ ] 2.1 `steerSong` (D1): the prefix lookup and keep, the base key (`WeakMap`, or `baseKey` from the caller), the context version (`setSpokenContext`, language, `setNarratorMine`), off while `globalThis.codingMiskAhead` is set, least-recently-used bound of 128. Verify: `check:steer-memo` passes on Classic; `npm run check:endless` fixtures unchanged.
- [ ] 2.2 `steerOnAir` (D2): the loop state kept after each command under its given and resolved forms, the key with `g0`, controls and chooser, bound of 64; `steerView` and `directorView` served by D1. Verify: `check:steer-memo` passes on Live coder and Crescendo; `node --no-warnings tools/check-radio-profiles.mjs` fixtures unchanged.

## 3. Compile memo (about 1 h)

- [ ] 3.1 `compileNow` (D4): `compileSong`'s code kept by the content of `full` plus the context version, least-recently-used bound of 3000, `parseCode` per call. Verify: `check:steer-memo` (with and without on a sample of bars), `npm run check:code`, `npm run check:mixer`, `npm run check:compact-code` style checks unchanged; the hit rate printed by `steer-bench`.

## 4. Worker wiring (about 1 h)

- [ ] 4.1 The radio computes `baseKey` once per item (and again on a new base: `rebias`, extend, regrown `g0`) and sends it with each steering; the console worker and the growth worker read it; `{ forget: baseKey }` when a song leaves the air or is skipped; a new session clears all. The main-thread fallback runs with the reuse off (owner decision 1). Verify: `tools/check-add-lag.cjs --profiles switch --standing 8` and `tools/check-steering.cjs` pass.

## 5. Gate and measurement (about 1.5 h, plus 3 h if the gate opens)

- [ ] 5.1 `steer-bench` on a quiet machine after sections 2 to 4. If the Live coder press 9 is under 1.5 s (90th percentile), skip 5.3.
- [ ] 5.2 Heap of the console worker after 20 presses on three songs; adjust the bounds of D1, D2 and D4 if one song's kept results pass 150 MB.
- [ ] 5.3 (Gate, D5) The written plan's per-step codes and typing plans kept by content across `liveCode` instances in one realm; `check:steer-memo` and `npm run check:crescendo` unchanged; `steer-bench` again.
- [ ] 5.4 In the page: `tools/check-add-lag.cjs --profiles switch --standing 8`, the batch ready within one phrase and the entry not pushed by the steering; record the numbers in `design.md`.

## 6. Checks and docs (about 1.5 h)

- [ ] 6.1 `npm run check:endless`, `node --no-warnings tools/check-radio-profiles.mjs`, `npm run check:steer-memo`, `tools/check-steering.cjs`, `tools/check-add-lag.cjs`, `node --no-warnings tools/check-radio.cjs`, `npm run check:crescendo`, `npm run build`: all pass, fixtures unchanged.
- [ ] 6.2 `docs/ENDLESS.md` (Steering: reuse per command prefix, what makes a kept result stale), `docs/knowledge/decisions.md` (replace "The steering of a grown song stays slow late in a song" with the measured result; the decision to key on content and command prefix), `docs/knowledge/checks.md` (the new check and script), `npm run knowledge`, `npm run check:knowledge`; AGENTS.md tooling lines; DEVLOG entry in Italian.
- [ ] 6.3 Owner's test on air: a Live coder session with ten console changes spread over a long song; each change enters on the phrase the badge shows (an item in the test checklist).

Total: about 10.5 agent hours, 13.5 if the gate of D5 opens (was 13.5 and 16.5 with the director checkpoints, dropped by the owner).
