## 1. Check and timing script first (about 3.5 h)

- [ ] 1.1 `tools/check-steer-memo.mjs` and `npm run check:steer-memo` (D7): Classic, Crescendo and Live coder songs (a third at 10 minutes), seeded random sequences with pending presses, batches, cancels, replaced batches and a batch on top of a pending one; reused against full steering byte for byte after every press; deep freeze of kept values; the context changed halfway; replay in a fresh process. Written before the reuse, with the reuse switch as a stub, so it runs on today's code (all presses equal). Verify: the check passes on today's code in about 3 to 4 minutes; `docs/knowledge/checks.md` and the AGENTS.md tooling lines describe it.
- [ ] 1.2 `tools/steer-bench.mjs` (D8): the songs of the design at style length and 10 minutes, twelve presses, time per press and per part (director, transit, typing, compile), `STEER_MEMO=0/1` interleaved per press, hit rates, heap, load average at start and end. Verify: it reproduces the shape of the "Today" table; today's numbers on the reference machine are recorded in `design.md` next to the loaded ones; `docs/knowledge/checks.md` lists it.

## 2. Reuse per command prefix (about 3 h)

- [ ] 2.1 `steerSong` (D1): the prefix lookup and keep, the base key (`WeakMap`, or `baseKey` from the caller), the context version (`setSpokenContext`, language, `setNarratorMine`), off while `globalThis.codingMiskAhead` is set, least-recently-used bound of 128. Verify: `check:steer-memo` passes on Classic; `npm run check:endless` fixtures unchanged.
- [ ] 2.2 `steerOnAir` (D2): the loop state kept after each command or batch under its given and resolved forms, the key with `g0`, controls and chooser, bound of 64; `steerView` and `directorView` served by D1. Verify: `check:steer-memo` passes on Live coder and Crescendo; `node --no-warnings tools/check-radio-profiles.mjs` fixtures unchanged; `docs/ENDLESS.md` (Steering) describes the reuse and what makes a kept result stale.

## 3. Compile memo (about 1.5 h)

- [ ] 3.1 `compileNow` (D4): `compileSong`'s code kept by the content of `full` plus the context version, least-recently-used with a byte bound (48 MB, or the bound the owner sets), `parseCode` per call. Verify: `check:steer-memo` (with and without on a sample of bars), `npm run check:code`, `npm run check:mixer`, `PORT=5299 node tools/check-compact-code.cjs` unchanged; the hit rate and the cache size printed by `steer-bench`; the decision (content key, byte bound) added to `docs/knowledge/decisions.md`.

## 4. Worker wiring and the radio's estimate (about 2 h)

- [ ] 4.1 The radio computes `baseKey` once per item (and again on a new base: `rebias`, extend, regrown `g0`) and sends it with each steering; the console worker and the growth worker read it; `{ forget: baseKey }` when a song leaves the air or is skipped; a new session clears all; the main-thread fallback runs with the reuse off. Verify: `PORT=5299 node tools/check-steering.cjs` passes; a skip followed by presses on the next song gives the same results as a fresh worker (`check:steer-memo` replay case).
- [ ] 4.2 `expectedPrep` (D9): linear in the new commands of the batch, from the last measured steering of the song, `0.3 × growMs` per new command until one is seen, the 30 s bound kept. Verify: `PORT=5299 node tools/check-add-lag.cjs --profiles switch,crescendo --standing 8` shows the estimate under 1.5 times the measured preparation and the entry on the default boundary; `docs/knowledge/decisions.md` replaces "The steering of a grown song stays slow late in a song" with the measured result.

## 5. Gate and measurement (about 1.5 h, plus 3 h if the gate opens)

- [ ] 5.1 `steer-bench` on the reference machine after sections 2 to 4. Verify: the targets of D8 recorded in `design.md`; if press 12 on the 10-minute songs is under 1.5 s (90th percentile), skip 5.3.
- [ ] 5.2 Heap of the console worker after 20 presses on three 10-minute songs. Verify: under the bounds of D6; the bounds adjusted in code and `design.md` if one song's kept results pass 150 MB.
- [ ] 5.3 (Gate, D5) The written plan's per-step codes and typing plans kept by content across `liveCode` instances in one realm, byte bound as D4. Verify: `check:steer-memo`, `npm run check:live-code` and `npm run check:crescendo` unchanged; `steer-bench` again, numbers in `design.md`.

## 6. Integration (about 1.5 h)

- [ ] 6.1 Full set: `npm run check:endless`, `node --no-warnings tools/check-radio-profiles.mjs`, `npm run check:steer-memo`, `PORT=5299 node tools/check-steering.cjs`, `PORT=5299 node tools/check-add-lag.cjs --rate 4` (a 10-minute Live coder and Crescendo song with eight standing commands: batch ready within one phrase, entry not pushed by the steering), `PORT=5299 node --no-warnings tools/check-radio.cjs`, `npm run check:crescendo`, `npm run check:knowledge`, `npm run build`. Verify: all pass, fixtures unchanged, `DIRECTOR_VERSION` and `SHAPES_VERSION` unchanged.
- [ ] 6.2 Owner's test on air: a Live coder session on a 10-minute exact song with twelve console changes spread over it; each change enters on the phrase its badge shows. Verify: the item is in the owner's test checklist; DEVLOG entry in Italian with the measured numbers; `notes/alternative-proposte.md` marks the incremental recompute as done.

## Workflow follow-up

- `console-add-waves` fixes its head-distance thresholds (2 phrases) after this change lands, from a new run of its baseline.

Total: about 13 agent hours, 16 if the gate of D5 opens.
