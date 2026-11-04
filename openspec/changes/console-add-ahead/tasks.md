## 1. Pending changes and entry moment (about 3 h)

- [ ] 1.1 Pending map per boundary and instrument with a signed net count, the settle time of 250 ms and the late-press rule (D1, D3) in `src/radio/radio.js`; the `arr-pm` click calls it instead of `command`. Verify in the page: one click runs no task over 20 ms, "+ −" leaves an empty map.
- [ ] 1.2 The limits checked against the song with the pending changes (track cap, "−" never on the last track, the existing reasons); a press beyond them is refused with the reason.
- [ ] 1.3 Entry (D2): the default is the next phrase start of `plan.phrase` at least `ADD_LEAD` = 2 s plus the expected preparation time ahead, deterministic, the same with and without a voice track; later boundaries (half phrase, else next phrase) only for preparation or load; the readiness margin shared with Say now (`leadOf`, a third of a bar). Verify that `steerSong` and `steerOnAir` accept `more` and `less` on a half-phrase start (director moves stay on phrase boundaries) and that `npm run check:endless` fixtures do not move.
- [ ] 1.4 Load monitor (D2): long tasks and skipped scheduler windows over the last 2 s, the expected entry cost from the last evaluation; a candidate is taken only when quiet, else the next one; the 30 s bound with the `[radio] entered under load` log. Verify with a long task injected before a boundary: the change waits one candidate.

## 2. Background preparation (about 3 h)

- [ ] 2.1 Classic `steerSong` and the director's view (`directorView`) in `src/endless/grow-worker.js`, called through `growAway`; `steerAir` no longer calls `airView` on the main thread before the worker; the in-page fallback runs in its own task. Verify: the worker's song is JSON-equal to the page's for every case of the measurement table.
- [ ] 2.2 A sliced `prepare` for Classic windows (build steps and `codeAt` a few per slice), as grown windows already have.
- [ ] 2.3 Sounds of the new tracks only: the sound-list diff, `preloadFonts` and warm-up at gain 0, in slices, replacing the one-task `soundCode()` compile in `swap` (`src/main.js`).
- [ ] 2.4 Commit when ready (record the commands as today, the session's arrange list for the session scope, `player.swap`), or push; guards with `growToken` and `windowSeq` so a newer batch, a skip, a stop or a new song drops the old job (D4, D6).

## 3. Console (about 2 h)

- [ ] 3.1 Badge per instrument from the click: net count and a live countdown ("+1 · Enters in 6 s"), pulsing while preparing, a short highlight when the entry moves later (none with reduced motion), tooltip with the bar; the hardware theme's display and LED (D5).
- [ ] 3.2 Queue: one row per instrument and boundary, pushed bar shown, ✕ until a third of a bar before, "Entering now" when disabled; cancel restarts the batch for the others.
- [ ] 3.3 Strings in English and Italian in `src/i18n.js`; the radio console card in `src/guide.js` (both languages); `npm run check:guide`.

## 4. Docs (about 0.5 h)

- [ ] 4.1 `docs/ENDLESS.md` (Steering: pending changes, merge, boundary, push), `docs/knowledge/decisions.md` (the click does no steering; net count per instrument), `docs/knowledge/checks.md` (the new check), `npm run knowledge`, `npm run check:knowledge`; DEVLOG entry in Italian.

## 5. Checks and measurement (about 2.5 h)

- [ ] 5.1 `tools/check-add-lag.cjs` (D7): the cases of the design's table plus the 12-track case, in Classic, Crescendo and Live coder, CPU 1× and 4×; budget, badge time, entry bar (the default phrase start, the same bar on a replay, a half phrase only when pushed), the countdown at the click and after a push, waiting under an injected load and the 30 s bound, a song without a voice track, net results, cancel, push, replay. Record the numbers in `design.md` next to the "before" table and in `docs/knowledge/`.
- [ ] 5.2 `tools/check-steering.cjs`, `tools/check-arrangement-levels.cjs` (stacking to 12 now goes through batches), `node --no-warnings tools/check-radio.cjs`, `tools/check-say-lag.cjs`, `npm run check:endless`, `npm run build`: all pass.
- [ ] 5.3 Owner's test on air: a session with quick "+" and "−" bursts in Classic and Live coder, listening for stutter (an item in the test checklist).

Total: about 11 agent hours (was 9: the load monitor, later entries on a half phrase and the live countdown add about 2 h).
