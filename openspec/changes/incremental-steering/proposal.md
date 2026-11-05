## Why

Console changes ("+", "−", locks, energy) now prepare away from the main thread (`console-add-ahead`), but the preparation itself is slow late in a song. On a grown Live coder song, `steerOnAir` replays every standing command from the start on every press. For each command it rewrites the song again (`steerSong` → `rewrite` → `directSong` → `stateAt`, which clones the state from bar 0) and measures the code's typing again (`typingFrom` → `liveCode` → the written plan of the whole song, which compiles the code of every step). The cost grows with the number of commands. The `console-add-ahead` notes measured about 2 s per energy command in Node, 17.5 s for nine, and 5 to 7 s per command in the page. Measured on 5 November on a loaded machine: from 1.1 s for the first press to 17.9 s for the ninth on one song. With the reuse below, a prototype gave the same output and took 0.5 to 2.8 s per press. A change then enters several phrases late, or not at all before the song ends.

The backlog idea was to memoize `stateAt`. The profile shows that it is only part of the cost: in a Live coder steering, the director's rewrite is 11% of the time and the typing measurement is 83%. Making the steering fast needs incremental work at three levels, each giving the same result as today.

## What Changes

- **A command is steered once.** The result after each command of a song (the director's song, plan and options, and on air the grown song, the written form and the boundary chosen) is kept, keyed by the song and the exact list of commands up to it. A new press reuses the kept result of the commands before it and steers only the new one. The director's view (`directorView`, `steerView`) reuses the same results. A change in a command (cancel, a different boundary, a new song) recomputes from that command on.
- **The director writes from a checkpoint (kept if it pays).** `directSong` keeps the song state at the start of each boundary and evaluates each candidate move from that state, instead of replaying every step from bar 0 for each candidate. This is the backlog idea. With the reuse per command it matters less, so it stays only if the timing script shows a real gain.
- **Code compiled once per state.** The code of a song state is compiled once and reused while the steering measures the typing (`compileNow`). The key is the state's content, and the cache has a size bound.
- **The written plan reused where its input is the same (behind a measurement gate).** If the first three levels still leave a late press over its target, the written plan's per-step codes and typings are kept by their content across the measurements of one steering and across presses.
- **The same output, checked.** A new check steers many songs (Classic, Crescendo and Live coder, many seeds) with mixed command sequences, presses one at a time with cancels in between. It compares every result with a full steering from scratch, byte for byte. Kept results are frozen in the check so a caller that changes one fails at once.
- **Targets.** On a quiet machine in Node: a late press on a Live coder song with eight standing commands is steered in under 1.5 s, and the cost of a press does not grow with the number of commands before it. A Classic press stays under 150 ms. In the page, a console batch late in a Live coder song is ready within one phrase, so it enters on the first phrase start that `console-add-ahead` offers.

Not in scope: changing what the director or the steering chooses; a different typing model; the window build and sound loading after the steering (`console-add-ahead`); growth speed (`growOnAir`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `endless/steering`: new requirements for incremental steering (results reused per command prefix, the same output as a full steering, invalidation) and for the steering time of a press late in a song.

## Impact

- `src/endless/steering.js`: `steerSong` (results kept per command prefix).
- `src/endless/waypoints.js`: `steerOnAir` (the state after each command kept), `directorView` and `steerView` (reuse).
- `src/endless/director.js`: `directSong` (state checkpoints per boundary, one state per candidate).
- `src/song/build.js`: a `stateFrom(checkpoint, steps, bar)` helper next to `stateAt`. `stateAt` itself is unchanged.
- `src/song/compile-compact.js`: `compileNow` (the compiled code kept by state content).
- `src/live/written-plan.js`, `src/live/live-code.js`: only if the gate of D5 opens.
- `src/endless/grow-worker.js`, the console worker and `src/main.js` (`growAway`): the cache's lifetime per worker, the context version, a `forget` message for songs that left the air.
- New check `tools/check-steer-memo.mjs` (`npm run check:steer-memo`) and a timing script `tools/steer-bench.mjs`. `npm run check:endless`, `tools/check-radio-profiles.mjs`, `tools/check-steering.cjs`, `tools/check-add-lag.cjs` and `tools/check-radio.cjs` must still pass with unchanged fixtures.
- Docs: `docs/ENDLESS.md` (Steering), `docs/knowledge/decisions.md` (the note "The steering of a grown song stays slow late in a song" is replaced by the measured result), `docs/knowledge/checks.md`, DEVLOG.
