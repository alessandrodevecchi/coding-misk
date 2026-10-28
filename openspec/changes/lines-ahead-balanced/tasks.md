## 1. Measure before

- [x] 1.1 `growth:probe -- all` on `develop`: lines typed ahead in total and per song, rushed steps (growth and written part), most muted lines shown, the shape kept per song. Verify: DEVLOG entry with the numbers (0 lines ahead expected)

## 2. Balanced default limits (D1)

- [x] 2.1 `AHEAD` in `src/live/written-plan.js` becomes `{ atOnce: 2, bars: 32, muted: 8, margin: 2, section: false }`; the `globalThis.codingMiskAhead` override stays. Verify: `growth:probe -- all` gives 2 lines (switch-prima-luce 176 to 192, crescendo-filo-di-luce 182 to 190)
- [x] 2.2 The D8 case of `check:live-code` reads its limits from `AHEAD` (no limit 4 written in the check) and finds a line ahead with the default limits, without the override. Verify: `check:live-code` passes, and fails with the old `AHEAD`

## 3. Lines typed ahead in the growth (D2, D3, D4)

- [ ] 3.1 `codeWith` returns line info (header, key, kind, text) for growth steps too. Verify: growth code unchanged with an empty plan (`check:live-code`, `check:crescendo` quick)
- [ ] 3.2 The plan measures growth steps as written steps, hosts lines ahead from the first step after bar 0, takes targets in the growth and the written part within the look-ahead, and leaves out lines their step would still type. Verify: `growth:probe -- all` lists lines ahead hosted by growth steps (2 to 7 expected in about 6 songs for written-part targets, plus growth targets)
- [ ] 3.3 The shape search scores shapes without lines ahead; the plan runs on the kept shape. Verify: the shape kept per song equals task 1.1 for every built-in song
- [ ] 3.4 `growth:probe` reports lines ahead split by hosting part (growth, written), the longest muted wait, and per song the rushed steps and most muted lines shown

## 4. Checks (D5)

- [ ] 4.1 `check:live-code` D8 case: a line ahead hosted by a growth step on a song the probe picks shows muted from its step to its target, and the target does not type it again; the limits hold at every step of every built-in song (at once, one per track, one per step, muted lines, not at bar 0, not at a rushed step, look-ahead). Verify: the case fails on the code before task 3.2
- [ ] 4.2 `check:typing`, `check:mixer -- --full`, `check-compact-code.cjs` (own dev server port, `BROWSER=none --strictPort`), `check:code` (Classic unchanged), `check:strudel`

## 5. Versions and fixtures

- [ ] 5.1 Live coder fixtures (`node tools/check-crescendo.mjs --write-fixtures`) and `SHAPES_VERSION` raised in `src/song/shapes.js` in the same commit; the Crescendo fixtures do not move (stop and report if they do); `DIRECTOR_VERSION` and the radio fixtures unchanged. Verify: `check:crescendo -- --full` passes
- [ ] 5.2 `npm run durations` in the same commit. Verify: `check:durations`

## 6. Docs and after numbers

- [ ] 6.1 Knowledge base: `live-build.md` (lines ahead in the growth), `decisions.md` (Balanced limits row; remove "also in the growth" as rejected), `status.md` (the D8 line), `checks.md` (probe fields); `npm run knowledge`, `npm run check:knowledge`
- [ ] 6.2 `growth:probe -- all` after: lines ahead in total and per song, before and after, in the DEVLOG (Italian); screenshots for the owner of a growth step with a line ahead and its target step
- [ ] 6.3 `npm run check:crescendo` quick level before each commit
