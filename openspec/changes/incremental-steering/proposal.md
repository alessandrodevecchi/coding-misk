Refs: coding-misk/#82

## Why

Console changes ("+", "−", locks, energy) prepare away from the main thread (`console-add-ahead`), but on a grown song (Live coder, Crescendo) the preparation replays every standing command from the song's base on every press. Each press therefore costs the sum of all commands so far, and the whole session costs the square of them. Measured on 8 November on today's code (design, "Measurements"): on a 10-minute Live coder song a press costs 0.45 to 1 s with no command standing and 11 to 21 s with eleven standing; Crescendo is the same curve. The radio then expects the preparation to grow with the square of the commands (`expectedPrep`, 0.3 × growth × n²), so batches enter several phrases late (up to the 30 s bound) and late presses on long songs lag (owner note on test fx17: "c'è ancora un po' di lag con brani lunghi in radio e in divenire, es con durata exact da 10 min"). The separate change `console-add-waves` needs a batch head to enter within 2 phrases of its press, which is not reachable while the steering grows with the commands.

A prototype on today's code (design, "Prototype") reuses the work of the commands before a press and gives byte-identical output, with the cost of a late press back to about the cost of one command.

## What Changes

- **A command is steered once.** The result after each command (the director's song, plan and options, and on air the grown song, the written form, the plan and the resolved commands) is kept per realm, keyed by the song's base, the steering context and the exact commands up to it. A new press reuses the longest kept prefix and steers only the commands after it. The console's director view reuses the same results. A change in a command (cancel, another boundary, a new song) recomputes from that command on.
- **Code compiled once per song state.** While the steering measures the typing of a new command, the code of a song state already compiled is reused, keyed by the state's content, with a bound in bytes.
- **The written plan reused by content, behind a measurement gate** (owner decision of 5 November): only if the first two levels leave a late press over its target.
- **The radio's expected preparation follows the new cost.** `expectedPrep` stops scaling with the square of the commands, so a fast steering also gives an early boundary. This changes only when a live batch enters, never what a recorded command replays.
- **The same output, checked.** A new check steers many songs (Classic, Crescendo, Live coder; default length and 10 minutes) with seeded random command sequences pressed one at a time, with cancels and replaced batches, and compares every result with a full steering from scratch, byte for byte. Kept values are frozen in the check so a caller that changes one fails at once.
- **Targets** (design D8): the cost of a press no longer grows with the commands before it (press 12 under 1.5 times press 1 of the same song); on a quiet machine in Node, a press on a 10-minute Live coder or Crescendo song with eleven standing commands costs under 1.5 s (90th percentile), so about 6 s with the CPU slowed 4 times, under one 8-bar phrase, which leaves the 2-phrase target of `console-add-waves` reachable. A Classic press stays under 150 ms.

Not in scope: director checkpoints (dropped by the owner on 5 November, design "Rejected / later"); any change to what the director, the waypoints or the typing model choose; the batch rules, join window and waves (`console-add-waves`); growth speed (`growOnAir`); the window build and sound loading after the steering.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `endless/steering`: new requirements for incremental steering (results reused per command prefix, the same output as a full steering, what makes a kept result stale, memory bounded) and for the steering time and the expected preparation of a press late in a long song.

## Impact

- `src/endless/steering.js`: `steerSong` (results kept per command prefix).
- `src/endless/waypoints.js`: `steerOnAir` (the loop state kept after each command or batch), `directorView` and `steerView` (reuse).
- `src/song/compile-compact.js`: `compileNow` (the compiled code kept by state content).
- `src/live/written-plan.js`, `src/live/live-code.js`: only if the gate of D5 opens.
- `src/radio/radio.js`: `expectedPrep` (linear in the commands, from the measured steering), the base key sent with each steering, `forget` when a song leaves the air.
- `src/endless/grow-worker.js` and the console worker: the caches' lifetime per worker, the context version.
- New check `tools/check-steer-memo.mjs` (`npm run check:steer-memo`) and timing script `tools/steer-bench.mjs`. `npm run check:endless`, `tools/check-radio-profiles.mjs`, `tools/check-steering.cjs`, `tools/check-add-lag.cjs` and `tools/check-radio.cjs` must pass with unchanged fixtures; `DIRECTOR_VERSION` and `SHAPES_VERSION` stay.
- Unblocks the distance target of `console-add-waves` (head within 2 phrases of the press), whose thresholds are fixed after this change lands.
- Docs: `docs/ENDLESS.md` (Steering), `docs/knowledge/decisions.md` (the note "The steering of a grown song stays slow late in a song" replaced by the measured result), `docs/knowledge/checks.md`, `notes/alternative-proposte.md` (the backlog idea marked as done), DEVLOG.
