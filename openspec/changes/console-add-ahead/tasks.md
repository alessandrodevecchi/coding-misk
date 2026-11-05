## 1. Pending changes and entry moment (about 3 h)

- [x] 1.1 Pending map per boundary and instrument with a signed net count, the settle time of 250 ms and the late-press rule (D1, D3) in `src/radio/radio.js`; the `arr-pm` click calls it instead of `command`. Verify in the page: one click runs no task over 20 ms, "+ −" leaves an empty map.
- [x] 1.2 The limits checked against the song with the pending changes (track cap, "−" never on the last track, the existing reasons); a press beyond them is refused with the reason.
- [x] 1.3 Entry (D2): the default is the next phrase start of `plan.phrase` at least `ADD_LEAD` = 2 s plus the expected preparation time ahead, deterministic, the same with and without a voice track; later boundaries (half phrase, else next phrase) only for preparation or load; the readiness margin shared with Say now (`leadOf`, a third of a bar). Verify that `steerSong` and `steerOnAir` accept `more` and `less` on a half-phrase start (director moves stay on phrase boundaries) and that `npm run check:endless` fixtures do not move.
- [x] 1.4 Load monitor (D2): long tasks and skipped scheduler windows over the last 2 s, the expected entry cost from the last evaluation; a candidate is taken only when quiet, else the next one; the 30 s bound with the `[radio] entered under load` log. Verify with a long task injected before a boundary: the change waits one candidate.

## 2. Background preparation (about 3 h)

- [x] 2.1 Classic `steerSong` and the director's view (`directorView`) in `src/endless/grow-worker.js`, called through `growAway`; `steerAir` no longer calls `airView` on the main thread before the worker; the in-page fallback runs in its own task. Verify: the worker's song is JSON-equal to the page's for every case of the measurement table.
- [x] 2.2 A sliced `prepare` for Classic windows (build steps and `codeAt` a few per slice), as grown windows already have.
- [x] 2.3 Sounds of the new tracks only: the sound-list diff, `preloadFonts` and warm-up at gain 0, in slices, replacing the one-task `soundCode()` compile in `swap` (`src/main.js`).
- [x] 2.4 Commit when ready (record the commands as today, the session's arrange list for the session scope, `player.swap`), or push; guards with `growToken` and `windowSeq` so a newer batch, a skip, a stop or a new song drops the old job (D4, D6).

## 3. Console (about 2 h)

- [x] 3.1 Badge per instrument from the click: net count and a live countdown ("+1 · Enters in 6 s"), pulsing while preparing, a short highlight when the entry moves later (none with reduced motion), tooltip with the bar; the hardware theme's display and LED (D5).
- [x] 3.2 Queue: one row per instrument and boundary, pushed bar shown, ✕ until a third of a bar before, "Entering now" when disabled; cancel restarts the batch for the others.
- [x] 3.3 Strings in English and Italian in `src/i18n.js`; the radio console card in `src/guide.js` (both languages); `npm run check:guide`.

## 4. Docs (about 0.5 h)

- [x] 4.1 `docs/ENDLESS.md` (Steering: pending changes, merge, boundary, push), `docs/knowledge/decisions.md` (the click does no steering; net count per instrument), `docs/knowledge/checks.md` (the new check), `npm run knowledge`, `npm run check:knowledge`; DEVLOG entry in Italian.

## 5. Checks and measurement (about 2.5 h)

- [x] 5.1 `tools/check-add-lag.cjs` (D7): the cases of the design's table plus the 12-track case, in Classic, Crescendo and Live coder, CPU 1× and 4×; budget, badge time, entry bar (the default phrase start, the same bar on a replay, a half phrase only when pushed), the countdown at the click and after a push, waiting under an injected load and the 30 s bound, a song without a voice track, net results, cancel, push, replay. Record the numbers in `design.md` next to the "before" table and in `docs/knowledge/`.
- [x] 5.2 `tools/check-steering.cjs`, `tools/check-arrangement-levels.cjs` (stacking to 12 now goes through batches), `node --no-warnings tools/check-radio.cjs`, `tools/check-say-lag.cjs`, `npm run check:endless`, `npm run build`: all pass.
- [ ] 5.3 Owner's test on air: a session with quick "+" and "−" bursts in Classic and Live coder, listening for stutter (an item in the test checklist).

## Implementation notes (4 November)

- 1.3: `steerSong` does not take a `more` or `less` on a half-phrase start: the rewrite starts from the phrase start at or after the command's bar (`Math.ceil(at / phrase)`), so a change at bar 20 of an 8-bar phrase entered at 24. A later entry therefore goes to the next phrase start. Fixtures unchanged.
- 2.1: console batches run in a worker of their own (the growth worker made them wait behind the next song's growth, 13 to 24 s). A grown song's steering on air replays every standing command: with three standing commands a batch took 5 to 10 s, with nine about 17.5 s in Node and more in the page; late in such a song a batch moves several phrases or does not fit before the end (toast "too late"). Making the steering incremental is out of scope.
- 2.2: the Classic window has no plan to make; its build stayed under 10 ms in the measurements, so no slices were added.
- 2.3: the new tracks' sounds are warmed one per task (`warmTracks`); the whole-window `soundCode()` compile of `swap` is unchanged (it runs only when the window's title changes).
- 5.1: the CPU-4× budget is checked on the batches' own main-thread work (`addCost`); the page alone with nothing pressed already runs tasks of 60 to 180 ms at that rate on this machine, so the longest task is compared with that.

## 6. Locks (option A, approved by the owner on 5 November)

- [x] 6.1 The Arrangement locks (`lock-part`, `unlock-part`) and the mixer locks (`lock`, `unlock`) record a pending change in the batch of their boundary instead of calling `command` (D8); a lock and an unlock of the same instrument or track cancel out; the batch writes them after "−" and "+".
- [x] 6.2 The lock button's pending state (a ring and the tooltip "Locks on bar N · in 6 s"), the queue row, the strings in English and Italian, the radio console card in `src/guide.js`.
- [x] 6.3 `tools/check-add-lag.cjs`: a lock and an unlock late in a Classic and a Live coder song within the budget, lock plus "+" in one batch, lock then unlock cancels; `tools/check-steering.cjs --lock` and `tools/check-arrangement-levels.cjs --scenario` still pass.

Total: about 11 agent hours (was 9: the load monitor, later entries on a half phrase and the live countdown add about 2 h).
