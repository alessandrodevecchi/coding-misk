## Context

- **The path of a console press today.** The radio records the press as a pending change (`console-add-ahead`). It then sends the song's base (song, plan, options, grown song) and every command, the standing ones and the new ones, to the console worker (`player.steerAhead` → `steerOnAir`, with `view: true`). The worker steers from scratch and returns the grown song, the commands with their boundaries and the director's view (`steerView`). Classic songs go through `steerSong` the same way (`player.steerClassic`).
- **`steerSong`** (`src/endless/steering.js`) is a fold over the commands. It starts from a clone of the base song and runs `rewrite` once per command. Each `rewrite` runs `directSong` from the command's boundary to the end of the song, keeping the steps before it.
- **`directSong`** (`src/endless/director.js`) calls `stateAt(working(base, steps), at)` many times per boundary: before and after the listener's moves, the charge, the riser, and for every candidate move twice (`measure` for energy, `playing(stateAt(…))` for the count), plus `curveGap` when curves are set. `stateAt` (`src/song/build.js`) sorts the steps, deep-clones the whole song (`JSON.parse(JSON.stringify(…))`) and applies every step from bar 0 up to the bar.
- **`steerOnAir`** (`src/endless/waypoints.js`) loops over the commands. For command *i* it calls `steerSong` with commands 0..*i* (so the director's work is quadratic in the number of commands). It builds the transit song from the previous grown song (`transitSong`) and measures its typing (`typingFrom`), often several times per command: once per candidate boundary of a pending command and once per round that gives late moves more bars. `typingFrom` builds a fresh `liveCode` of the whole grown song. Its first `codeAt` makes the written plan of the whole song (`planWrittenSteps`), which compiles the code of every step (`compileNow` → `compileSong`).
- **`directorView` / `steerView`** run one more `steerSong` over all commands for the console's view.
- **Determinism.** Every random draw comes from a stream named by the seed, the song and the command index (`steer:${n}:${i}:moves`, `waypoint:${n}:${i}`). The output depends only on the inputs and the module-level context: the spoken context set in the worker (`setSpokenContext`), the language, `narratorMine.pick` and `globalThis.codingMiskAhead`. So the result after a prefix of commands is a pure function of (base, context, prefix). This is what makes reuse safe.

## Measurements (5 November)

Method: Node 20 scripts in the session scratchpad (`steer/base.mjs`, `cmp.mjs`, `probe.mjs`). The Live coder songs are radio songs grown as `tools/check-radio-profiles.mjs` grows them (`recipeOf(i, 'switch')`, seeds `grow-3`, `grow-4`). The presses simulate the radio: one `energy-up` per phrase from the arrival on, each sent as a pending command with all the standing ones, then `steerView`. The resolved commands are kept for the next press. **The machine was heavily loaded** (load average 27 to 49 on 10 cores, other jobs running), so absolute times are several times what a quiet machine gives. Compare the ratios, not the seconds. The table numbers are wall time per press (`steerOnAir` + `steerView`). Two processes ran side by side for the second and third columns.

### Baseline: per press, today

| Song (bars, growth, steps)   | Press 1 | 2    | 3    | 4    | 5     | 6     | 7      | 8      | 9       | Total   |
| ---------------------------- | ------- | ---- | ---- | ---- | ----- | ----- | ------ | ------ | ------- | ------- |
| grow-4 (120, 24, 19), run A  | 1.0 s   | 1.0  | 1.8  | 3.1  | 8.6   | 23.1  | 36.5   | 70.2   | 173.1   | 318.5 s |
| grow-4, run B (profiled)     | 5.0 s   | 8.4  | 14.5 | 16.1 | 39.1  | 100.3 | 183.0  |        |         | 366.3 s |
| grow-3 (72, 24, 9)           | 0.6 s   | 0.8  | 0.7  | 2.9  | 3.5   |       |        |        |         | 8.5 s   |
| grow-1 (152, 104, 25)        | 3.4 s   | 23.3 | 22.5 | 27.7 | 16.3  |       |        |        |         | 93.2 s  |

Classic (`steerSong` only, seed `grow-2`, 144 bars, 9 standing `energy-up`): 0.18, 0.05, 0.33, 0.55, 0.47, 1.28, 0.95, 1.44, 2.01 s.

- **The cost per press grows with the number of commands before it**, from about 1 s to 173 s on one song. The `console-add-ahead` note (2 s per command, 17.5 s for nine, on a quieter machine) is the same curve.
- **Where the time goes** (CPU profile, run B, 356 s in `steerOnAir`): the typing measurement `typingFrom` takes 296 s (83%). Of that, the written plan (`planWrittenSteps`) takes 232 s and `compileNow` → `compileSong` takes 186 s. The director (`steerSong` → `directSong`) takes 38 s (11%), of which `stateAt` is 52 s summed over all callers (`clone` 24 s self). The growth of the song (`sessionItems`, 25 s) is setup, not steering.
- **In Classic the director is the whole cost**: of 6.9 s, `stateAt` takes 5.7 s (82%), its `clone` 3.2 s, and `measure` 3.4 s.

### Prototype: the same presses with reuse (not committed)

A copy of `src/` in the scratchpad (`steer/proto/`) with three switches. The first two keep the result of `steerSong` per command prefix and the loop state of `steerOnAir` after each command (D1, D2). The third keeps `compileSong`'s code per state content in `compileNow` (D4). D5 was not prototyped.

**Fair comparison** (`steer/inter.mjs`). One process, and for each press the full steering today runs first, then the steering with D1 + D2 + D4, right after it under the same load. The caches are filled only by the reuse runs. Load average 20 to 40. Seconds per press (`steerOnAir` + `steerView`):

| Song (bars, steps)  | Mode   | 1    | 2    | 3    | 4    | 5    | 6    | 7     | 8     | 9     | Total  |
| ------------------- | ------ | ---- | ---- | ---- | ---- | ---- | ---- | ----- | ----- | ----- | ------ |
| grow-3 (72, 9)      | today  | 0.23 | 0.88 | 0.92 | 2.23 | 2.50 |      |       |       |       | 6.8 s  |
|                     | reuse  | 0.14 | 0.38 | 0.23 | 0.53 | 0.08 |      |       |       |       | 1.4 s  |
| grow-4 (120, 19)    | today  | 1.09 | 1.17 | 2.86 | 7.33 | 3.63 | 7.97 | 23.03 | 10.81 | 17.88 | 75.8 s |
|                     | reuse  | 0.47 | 0.58 | 0.96 | 0.70 | 0.90 | 1.44 | 2.77  | 0.56  | 1.32  | 9.7 s  |
| grow-8 (152, 23)    | today  | 0.20 | 1.16 | 3.22 | 3.79 | 6.88 | 6.62 | 16.09 | 8.62  | 10.14 | 56.7 s |
|                     | reuse  | 0.10 | 0.71 | 0.46 | 0.97 | 0.56 | 0.42 | 0.68  | 0.91  | 2.10  | 6.9 s  |

- **The output is the same.** For each of the 23 presses, the grown song, the resolved commands and the director's view are equal with and without reuse (a hash of their serialized form). An earlier run of 7 presses with D1 + D2 + D4 and 12 presses with D1 + D2 alone, in separate processes, was equal too.
- **The cost no longer grows with the commands before.** Press 9 drops from 17.9 to 1.3 s and from 10.1 to 2.1 s. The totals are 6 to 8 times lower. The reuse run comes right after the run today on the same press, so it may gain a little from a warm JIT. The check of task 1.2 measures each mode in its own process.
- **What is left is the new command's own typing measurement.** Breakdown in a separate run with D1 + D2 on grow-4 (press 1 to 7): the director 0.02 to 0.65 s, the transit 0.01 to 0.24 s, and `typingFrom` 0.8 to 47 s, over 1 to 7 calls per press (one per candidate boundary and round). With D4 the same calls take 0.9 to 6.4 s. The compile memo hit 1702 of 2229 compiles (76%). With D1 + D2 + D4, the profile puts 52 of the 60 s left in the typing measurement in the written plan (`planWrittenSteps` → `pass`). `compileNow` takes 37 s, mostly the content key's `JSON.stringify` and the misses. D4 is the larger part of the gain: D1 + D2 alone was 3.3 times faster in total on grow-4, and D1 + D2 + D4 was 16 times faster (separate runs, not interleaved).
- **Classic with D1 alone** (`steer/cls.mjs`, interleaved, 5 songs of 96 to 144 bars, nine mixed presses): press 9 drops from 151 to 1360 ms today to 4 to 59 ms. Every result was the same. Once the prefix is reused, the director's `stateAt` replay is no longer the bottleneck of a press. It still costs on the first press of a song and after a cancel early in the song (see "Rejected / later").

## Goals / Non-Goals

**Goals:**
- The same output as today for every input, checked over many songs and command sequences.
- The cost of a press depends on the new command, not on the number of commands before it.
- A late press on a Live coder song steered in under 1.5 s in Node on a quiet machine (the reference machine is the owner's Mac with no other jobs; the timing script of task 1.2 records the load average). In the page, a batch late in a Live coder song is ready within one phrase.
- A Classic press under 150 ms in Node, late in a 144-bar song with nine standing commands.
- Memory bounded per worker.

**Non-Goals:**
- Changing any choice of the director, the waypoints or the typing model (the fixtures do not move, and `DIRECTOR_VERSION` and `SHAPES_VERSION` stay).
- The window build, sound loading and entry rules of `console-add-ahead`.
- Faster growth (`growOnAir`) or a faster compiler in general.

## Decisions

### D1. `steerSong` keeps its result per command prefix

`steerSong` looks up the longest prefix of its commands with a kept result and runs `rewrite` only for the commands after it. It keeps the result after each command it runs. The key is the base key plus the commands of the prefix, serialized (`JSON.stringify`, the exact objects `rewrite` receives).

- **Base key.** A hash of the base song, plan and options, the seed and the song index `n`. It is computed once per base object (a `WeakMap` from the song object to its key). In the worker each message has fresh objects, so the page sends a `baseKey` with the request: a hash the radio computes once per item when its base is set, and again when the base changes (a new song, `rebias`, an extended song). Without a `baseKey` the worker hashes the base itself.
- **Context version.** A counter raised by `setSpokenContext` when the context changes, by the language and by `setNarratorMine`. It is part of the key. `globalThis.codingMiskAhead`, which only checks set, turns the reuse off while it is set.
- **Kept values are never changed.** `rewrite` already builds new objects. The check freezes every kept value deeply (D7), so a caller that writes into one fails at once. Outside the check nothing is frozen, because freezing costs time.

*Alternative considered:* a key from object identity only. That does not survive the worker's structured clone, and the console worker is where the reuse matters.

### D2. `steerOnAir` keeps its loop state per command prefix

After each command the loop's state is kept: the grown song `N`, the written form `Wprev`, the plan `P`, the director's result `R` and the resolved commands `done`. The key is the base key (with the grown song `g0`, the controls `C` and the chooser) plus the resolved commands so far and the command as given (`pend`, `q`, `min` included). After a pending command is resolved, the same state is also kept under the resolved form (without `pend`, with its boundary). The radio sends the resolved form on the next press, so the next press finds it. A typed line (`say-live`) is part of the prefix like any other command.

- `steerView` and `directorView` call `steerSong` with the same resolved commands, so with D1 they find the result at once. The prototype measured 0 to 26 ms for them.
- A command that changes (cancelled, moved to another boundary, edited) changes the key from that command on. The commands before it still match.

### D3. Director checkpoints: dropped from this change

Evaluating the director's moves from a checkpoint per boundary (the backlog idea) is not part of this change. The owner decided this on 5 November. See "Rejected / later" below.

### D4. `compileNow` keeps the compiled code per state content

`compileNow` gets the code of `full` (the bar's state with the shown muted tracks) from a cache keyed by its content, and calls `compileSong` only on a miss. The cache is a `Map` with least-recently-used eviction, at most 3000 entries, per realm (each worker and the page). `parseCode` still runs per call, because its result is mutable and cheap.

- The key is `JSON.stringify(full)`. The prototype showed it is cheaper than a compile but not free. If it shows in the profile, the key moves to a hash of the bar's step prefix plus the shown tracks, from the caller.
- `compileSong` reads module context too (the language, voice context and my-phrases pick for spoken lines). The context version of D1 is part of the key.

### D5. The written plan reused by content (behind a gate)

After D1, D2 and D4, the timing script (task 5.1) measures a late press on the check songs. If the 90th percentile is still over 1.5 s on a quiet machine, `planWrittenSteps` keeps its per-step results across `liveCode` instances of the same steering. These are the code of a step for a given active plan (the `early` map, today per instance) and the typing plans (`typings`, today per instance). The keys are their content, with the same bound and eviction as D4. If the gate stays shut, D5 is left out and the design records the measured numbers.

### D6. Lifetime and invalidation

- **Per realm, per worker.** The caches live in the module where they are used. The console worker keeps them across presses, which is where reuse pays. The growth worker and the page have their own.
- **Bounds.** D1: at most 128 prefix results. D2: at most 64 loop states, each holding a grown song. D4: 3000 codes. Each is a least-recently-used `Map`. Task 5.2 records the heap after a session of 20 presses on three songs and moves the bounds if needed.
- **`forget`.** When a song leaves the air or is skipped, the radio sends `{ forget: baseKey }` to the console worker, which drops that base's D1 and D2 entries. A new session (`startSession`) clears all.
- **What changes a key:** the base (new song, regrown `g0`, extended song, session bias), the context version (spoken context, language, my phrases), the controls and the chooser (`AIR_CHOOSER` version), and any command in the prefix.
- **Turned off** while `globalThis.codingMiskAhead` is set (the growth probe's overrides), and by `STEER_MEMO=0` in Node for comparisons.

### D7. A check that compares with a full steering

`tools/check-steer-memo.mjs` (`npm run check:steer-memo`, no browser):

- **Songs**: 20 Classic songs (styles in turn, seeds `memo-<i>`), 5 Crescendo and 10 Live coder songs grown as `check-radio-profiles` grows them (`ONLY`/`SEEDS` to widen it).
- **Sequences**: per song, 6 to 10 presses from a seeded mix of the console's kinds: `energy-up`, `energy-down`, `more`, `less`, `lock-part`, `unlock-part`, `vary`, `swap`, `curve`, `darker`, `more-space`, `mute`, `volume`, `riser`, `say-live`, `extend`. Each press is pending (`pend`, `q`) as the radio sends it. After some presses, a command in the middle is cancelled, or a pending batch is replaced.
- **The comparison**: after each press, the result with reuse (one long-lived cache, as in the worker) against a full steering with the reuse off, in the same process. Both are serialized and compared byte for byte (`steerOnAir`'s song, commands, plan, options and `plain`; `steerView`; Classic `steerSong`'s song, plan and options). Kept values are deeply frozen, so a mutation throws.
- **Directly**: `compileNow` with the cache against without, on a sample of bars.
- It also runs with the context changed halfway (language, spoken context), to check the context version.
- **Time**: about 3 minutes, so it is a quick check, not part of `check:endless`.

### D8. Timing script and targets

`tools/steer-bench.mjs` repeats the measurement of this design: the songs above with nine presses, the time per press and per part (director, transit, typing, compile), today against with reuse (`STEER_MEMO=0/1`). It prints the load average at the start and the end. The targets, on a quiet machine:

| Measure                                                      | Target      |
| ------------------------------------------------------------ | ----------- |
| Live coder, press 9 (8 standing), 90th percentile over songs | < 1.5 s     |
| Live coder, press *k* against press 1 at the same bar       | < 1.5 times |
| Classic, press 9, 144-bar song                               | < 150 ms    |
| Page, `check-add-lag.cjs --standing 8 --profiles switch`     | batch ready within one phrase; the entry not pushed by the steering |

## Risks / Trade-offs

- [A kept value changed by a caller corrupts later results] → the check freezes kept values. `rewrite` and the waypoint steps already build new objects. A mutation found by the check is fixed at the caller.
- [A missing input in a key gives a stale result] → the key covers every argument and the module context that the steering reads. The check changes the context halfway. Any module-level state found later goes in the context version.
- [Memory in the console worker: grown songs are large] → bounds and `forget`, measured in task 5.2.
- [The content keys of D4 cost time] → measured, with a cheaper key from the caller as a fallback.
- [The page still waits for the first press of a song: nothing is kept yet] → the first press costs what one command costs today, which is already the cheap case.

## Migration Plan

No data changes. Replays give the same songs. The reuse can be switched off (`STEER_MEMO=0` in Node, a constant in the worker) if a problem shows on air.

## Rejected / later

- **Director checkpoints (former D3).** `directSong` would keep the song state at the start of each boundary and evaluate each candidate move from it (`stateFrom`, copy on write), instead of `stateAt` from bar 0. It was dropped from this change on 5 November (owner: "lascerei perdere"). With the reuse per command prefix, Classic press 9 already took 4 to 59 ms under load, and the director is 0.02 to 0.65 s of a Live coder press. The idea still helps the first press of a long song and a cancel early in a song, and touches the director's hottest loop, so it can come back as its own change if the timing script shows those cases matter.
- **Memoizing `stateAt` by (song, bar).** The working song changes with every step taken, so the key would be the whole step list. The hit rate is low, and the key costs about as much as the replay.

## Owner decisions (5 November)

1. **The reuse runs in the workers and in Node only.** The page's main thread, which steers only as a fallback and for `airView`, keeps the reuse off.
2. **D5 stays in this change, behind its gate.** It is built only if the timing script still shows a late press over 1.5 s on a quiet machine.
3. **The bounds are 128 / 64 / 3000** (D1, D2, D4). Task 5.2 measures the heap and may move them.
4. **No change to `addPrep` or `ADD_LEAD`.** The estimate already follows the measured time.
5. **The reference machine is the owner's Mac with no checks running** (load average under 4), recorded by the timing script. Under load the script reports ratios only.
6. **Director checkpoints are dropped** (see "Rejected / later").
