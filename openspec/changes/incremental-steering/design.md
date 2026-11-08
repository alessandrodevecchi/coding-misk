## Context

See proposal.md for why. This section describes today's path (develop `6895b24`).

- **A console press.** The radio records the press as a pending change (`console-add-ahead`) and sends the song's base (song, plan, options, grown song) with every command, standing and new, to a worker. A grown song (Live coder, Crescendo) goes to the console worker (`player.steerAhead` → `steerOnAir`, with `view: true`), which returns the grown song, the commands with their boundaries and the director's view (`steerView`). A Classic song goes to the growth worker (`player.steerClassic` → `steerSong`, since `a9448aa`).
- **`steerSong`** (`src/endless/steering.js`) is a fold over the commands. It starts from a clone of the base song and runs `rewrite` once per command. Each `rewrite` runs `directSong` from the command's boundary to the end of the song. `directSong` calls `stateAt` many times per boundary, and `stateAt` (`src/song/build.js`) clones the song and applies every step from bar 0.
- **`steerOnAir`** (`src/endless/waypoints.js`) loops over the commands, one at a time (`one`) or as a batch of console changes (`group`, `console-add-ahead`). For command _i_ it calls `steerSong` with commands 0.._i_, builds the transit song from the previous grown song (`transitSong`) and measures its typing (`typingFrom`). A pending command or batch measures the typing once per candidate boundary (a batch also bisects how many lines fit), and `settle` measures again for each round that gives late moves more bars. `typingFrom` builds a fresh `liveCode` of the whole grown song; its first `codeAt` makes the written plan of the whole song (`planWrittenSteps`), which compiles the code of every step (`compileNow` → `compileSong`).
- **The loop state** after a command or batch is `N` (the grown song so far), `Wprev` (the written form), `P` (the plan), `R` (the director's result) and `done` (the resolved commands). The final riser and typed-line passes (`riserAir`, `sayAir`) run after the loop on `done`.
- **Determinism.** Every random draw comes from a stream named by the seed, the song index and the command index (`steer:${n}:${i}:moves`, `waypoint:${n}:${i}`). The output depends only on the inputs and the module context: the spoken context (`setSpokenContext`), the language, `narratorMine.pick` and `globalThis.codingMiskAhead`. So the loop state after a prefix of commands is a pure function of (base, context, prefix), which makes reuse safe.
- **The radio's estimate.** `expectedPrep` (`src/radio/radio.js`) sets a batch's first boundary from the expected preparation. For a grown song it takes the largest of `0.3 × growMs × n²` and the last steering time scaled by `(n / n_seen)²`, bounded by 30 s. A faster steering does not move the first of these two terms.

## Measurements (8 November)

Method: Node scripts in the session scratchpad (`incremental/bench.mjs` for today's code, `incremental/cmp.mjs` for the prototype, `incremental/mem.mjs` for memory). Songs are radio songs grown as `tools/check-radio-profiles.mjs` grows them (`recipeOf(i, profile)`, seeds `grow-<i>`), at the style's length and with `length: 10` (exact 10 minutes). Grown songs: twelve `energy-up` presses spaced evenly from the arrival to a phrase before the end, each sent pending with all the standing commands, then `steerView`; the resolved commands are kept for the next press, as the radio does. Classic: twelve `energy-up` commands, one per phrase from the second phrase. One run also uses a mixed sequence (`energy-up`, `more arp`, `darker`, `more pad`, `energy-down`, `less arp`, `more-space`, `more hook`, `brighter`, `less pad`). The machine was shared: load average 4 at the start and 13 to 18 during most runs on 10 cores. Compare ratios, not seconds.

### Today: time per press with k − 1 commands standing

Each cell is the range over the songs measured (`steerOnAir`; `steerView` adds 1 to 5% and is listed apart below).

| Song                                    | k = 1          | 3           | 6           | 9           | 12           |
| --------------------------------------- | -------------- | ----------- | ----------- | ----------- | ------------ |
| Classic, style length (112 to 144 bars) | 21 to 25 ms    | 47 to 55 ms | 77 to 118   | 119 to 166  | 132 to 218   |
| Classic, 10 min (288 to 320 bars)       | 42 to 83 ms    | 121 to 192  | 196 to 434  | 331 to 559  | 483 to 797   |
| Live coder, style length (72 to 152)    | 0.15 to 0.33 s | 0.6 to 1.1  | 2.4 to 3.1  | 2.3 to 4.2  | 2.4 to 5.0   |
| Live coder, 10 min (320 bars)           | 0.45 to 1.0 s  | 2.8 to 10.1 | 4.5 to 7.5  | 6.7 to 18.7 | 11.2 to 21.1 |
| Live coder, 10 min, mixed sequence      | 0.58 s         | 4.1         | 12.7        | 23.4        | 21.1         |
| Crescendo, style length (104 to 152)    | 0.57 to 1.04 s | 0.9 to 3.2  | 1.1 to 6.8  | 1.4 to 10.6 | 1.7 to 14.5  |
| Crescendo, 10 min (320 to 328 bars)     | 0.6 to 1.9 s   | 1.9 to 6.4  | 3.7 to 10.0 | 5.2 to 34.9 | 8.0 to 29.7  |

- **The cost of a press grows with the commands before it.** On a 10-minute Live coder song, press 12 costs 11 to 21 s against 0.5 to 1 s for press 1. The whole session is quadratic. Two songs with one press per phrase show the same curve (`out-live10.txt`: 0.45 s to 13.0 s and 1.0 s to 21.1 s).
- **Classic is no longer the problem.** Since the 5 November measurements the Classic steering moved to the growth worker and stays under 0.8 s at twelve commands on a 10-minute song. It still grows linearly per press.
- **`steerView`** costs 1 to 5% of a press (up to 0.75 s on a 10-minute song with twelve commands), because it runs `steerSong` over all the commands once more.
- **The radio adds its own delay.** With `expectedPrep` at `0.3 × growMs × n²`, a 10-minute song (growth of a few seconds) reaches the 30 s bound at about six commands, whatever the steering costs.

### Where the time goes

CPU profile of one 10-minute Live coder song, twelve presses, 79 s in `steerOnAir`:

| Function (total time, callers included)          | Time           | Share    |
| ------------------------------------------------ | -------------- | -------- |
| `typingFrom` (the typing measurement)            | 65.6 s         | 83%      |
| of which `planWrittenSteps` (written plan)       | 53.0 s         | 67%      |
| of which `compileNow` → `compileSong`            | 47.8 s, 33.3 s | 60%, 42% |
| `settle` (rounds of extra bars, typing included) | 41.7 s         | 53%      |
| `steerSong` → `rewrite` → `directSong`           | 12.0 s         | 15%      |
| `stateAt` (all callers)                          | 16.3 s         | 21%      |

The largest self times are `cloneState` (18.2 s, called per compile through `sceneLayers`), `clone` in `build.js` (7.9 s), `unrle` (3.3 s) and `stateAt` (3.1 s). What is recomputed without a change, per press: the director's rewrite of every standing command (each from bar 0 of the base), the transit and the typing measurement of every standing command, and the compile of every step state of the written plan, although only the commands from the new one on can differ.

### Prototype: the same presses with reuse

A copy of today's `src/` in the scratchpad (`incremental/proto/`) with three switches: the result of `steerSong` per command prefix (D1), the loop state of `steerOnAir` per command or batch (D2) and `compileSong`'s code per state content in `compileNow` (D4). D5 was not prototyped. For each press the full steering runs first with the reuse off, then the same press with the reuse on, in one process; the caches are filled only by the reuse runs.

| Song                          | Mode  | k = 1          | 3            | 6            | 9            | 12           |
| ----------------------------- | ----- | -------------- | ------------ | ------------ | ------------ | ------------ |
| Classic, style length (3)     | today | 21 to 66 ms    | 87 to 211    | 153 to 797   | 232 to 739   | 165 to 751   |
|                               | reuse | 17 to 26 ms    | 28 to 68     | 20 to 106    | 10 to 13     | 2 to 7       |
| Classic, 10 min (3)           | today | 108 to 311 ms  | 195 to 1137  | 309 to 1865  | 749 to 1130  | 1048 to 4199 |
|                               | reuse | 96 to 183 ms   | 67 to 322    | 68 to 406    | 69 to 274    | 64 to 255    |
| Live coder, style length (3)  | today | 0.18 to 0.27 s | 0.5 to 2.5   | 1.9 to 4.1   | 3.9 to 5.1   | 2.8 to 5.0   |
|                               | reuse | 0.11 to 0.23 s | 0.15 to 2.7  | 0.25 to 0.66 | 0.16 to 0.24 | 0.05 to 0.21 |
| Live coder, 10 min (1)        | today | 0.86 s         | 11.0         | 6.0          | 10.7         | 10.9         |
|                               | reuse | 0.53 s         | 1.6          | 1.3          | 0.76         | 0.53         |
| Live coder, 10 min, mixed (1) | today | 0.93 s         | 9.6          | 19.1         | 18.5         | 15.4         |
|                               | reuse | 0.50 s         | 1.5          | 2.1          | 0.56         | 0.47         |
| Crescendo, style length (2)   | today | 0.46 to 1.27 s | 0.8 to 3.1   | 6.5 to 7.9   | 3.1 to 12.4  | 2.4 to 11.4  |
|                               | reuse | 0.22 to 0.69 s | 0.17 to 0.69 | 0.36 to 0.82 | 0.15 to 0.98 | 0.03 to 0.24 |
| Crescendo, 10 min (1)         | today | 1.0 s          | 10.9         | 7.3          | 8.9          | 10.0         |
|                               | reuse | 0.54 s         | 2.7          | 0.33         | 0.22         | 0.09         |

The "today" cells here are the grown song plus the view, measured next to the reuse run under load 13 to 18, so they are higher than in the first table.

- **The output is the same.** Every one of the 168 presses above (14 songs, 12 presses each) gave the same `steerOnAir` result and `steerView` byte for byte (`JSON.stringify`) with and without reuse.
- **The cost no longer grows with the commands before.** Late presses on 10-minute songs drop from 10 s to 0.1 to 0.8 s. What is left is the new command's own work: one `rewrite`, the transits and the typing measurements of its candidate boundaries.
- **The new command's own typing is still the expensive part** on a long song: 1.3 to 5.9 s for some early pending presses under load 18, the most with new tracks to type (several candidate boundaries, each a `typingFrom` over the whole grown song). The compile memo hits 57 to 66% of compiles. This is where D5 would act.
- **Memory** after twelve presses on a 10-minute Live coder song: 12 kept loop states (24 keys, given and resolved form) take about 0.5 MB as JSON, the `steerSong` results 0.2 MB, and the compile cache 1194 entries with 11.9 MB of keys and 11.5 MB of code. The heap grew by 43 MB. The compile cache, not the kept states, is what needs a bound, and its keys are as large as its values.

The 5 November prototype on the older code (before the batches of `console-add-ahead` and the Classic worker) gave the same picture: 6 to 8 times lower totals, every result equal, and `typingFrom` 83% of a Live coder press.

### After the change (8 November)

`node --expose-gc tools/steer-bench.mjs --songs 3` (energy-up presses, as "Today" above), load average 5 to 7 on 10 cores, so not the reference machine: compare ratios. Press 12 (press 11 or 12 on the shorter songs), with the kept results against a full steering in the same run:

| Song                                    | Reuse, press 12  | Full, press 12   |
| --------------------------------------- | ---------------- | ---------------- |
| Live coder, style length (80 to 152)    | 4 to 129 ms      | 55 to 2026 ms    |
| Live coder, 10 min (176 to 320 bars)    | 11 to 822 ms     | 160 to 21595 ms  |
| Crescendo, style length (64 to 152)     | 1 to 86 ms       | 18 to 5480 ms    |
| Crescendo, 10 min (160 to 328 bars)     | 2 to 231 ms      | 130 to 17504 ms  |
| Classic, style length (112 to 144)      | 1 to 6 ms        | 83 to 173 ms     |
| Classic, 10 min (288 to 320 bars)       | 19 to 36 ms      | 275 to 404 ms    |

- **Targets of D8.** Press 12 on the 10-minute grown songs: 0.82 s at the 90th percentile (target 1.5 s; about 3.3 s with the CPU slowed 4 times). Classic, 10 minutes: 19 to 36 ms (target 150 ms). Press 12 against press 1: under 1.5 times on 10 of 12 grown songs; 2.5 and 4.2 times on two songs whose press 1 was fast (51 and 196 ms). The rest is the new command's own typing measurement (`typingFrom`, 804 of 822 ms on the slowest song), which grows with the written steps of the song, not with the standing commands. The slowest single press was 2.4 s (press 9 of a 10-minute Live coder song).
- **The gate of D5 stays shut**: the 90th percentile is under 1.5 s, so the written plan is not reused by content.
- **Memory (task 5.2).** One process as a worker, 20 presses on each of three 10-minute songs (two Live coder, one Crescendo, mixed commands), nothing forgotten: the heap grew by 81, 91 and 85 MB after each song, the compile cache at its 48 MB bound (1048 to 1940 entries), 64 loop states, 33 to 98 prefix results. With `forget` at each new song: 81, 90, 59 MB. After `forget('*')`: 7 MB. The bounds stay.
- **`check:steer-memo`**: 35 songs, 311 steerings compared byte for byte (251 reused a kept prefix), 35 replays with nothing kept, 216 s with 5 workers. A key without the song index, the chooser or the context version fails it.

The baseline of `console-add-waves` (`baseline/run.sh`, instrumentation adapted to this code, dev server at normal CPU speed, load 4 to 7), before (results of 8 November on `6895b24`) and after:

| Profile    | Earlier commands | Batches | Head within 2 phrases, before → after | Worst head (phrases) | Batches moved | Median steering |
| ---------- | ---------------- | ------- | ------------------------------------- | -------------------- | ------------- | --------------- |
| Classic    | none             | 8       | 8 → 8                                 | 1.82 → 1.03          | 1 → 0         | 0.0 → 0.0 s     |
| Classic    | standing         | 8       | 8 → 8                                 | 1.90 → 0.90          | 1 → 0         | 0.1 → 0.0 s     |
| Crescendo  | none             | 8       | 8 → 8                                 | 0.92 → 0.92          | 0 → 0         | 0.7 → 0.2 s     |
| Crescendo  | standing         | 7       | 6 → 6                                 | 2.69 → 2.70          | 2 → 2         | 2.4 → 0.4 s     |
| Live coder | none             | 6       | 5 → 5                                 | 2.83 → 2.83          | 4 → 3         | 0.3 → 0.2 s     |
| Live coder | standing         | 8       | 4 → 5                                 | 11.77 → 3.84         | 6 → 6         | 4.4 → 0.3 s     |

Moves by reason, all batches: before typing 9, not ready 12 (11 in one batch), busy page 3; after typing 12, not ready 1, busy page 0. The 11-move chain is gone: that batch now enters 1.8 phrases after its press (a typing move), with a steering of 1.7 s instead of 12.2 s. Every move left but one comes from the head's typing rule, which is `console-add-waves`' to change. The estimate at the first press (D9) against the preparation measured on grown songs: within 1.5 times or under on 15 of 29 batches, over it on 14, all of them preparations of 0.1 to 0.4 s where the estimate stays at 0.7 to 1.7 s (the 0.5 s margin and the rest of the preparation); the largest underestimate was 0.7 s for 1.1 s.

A first run of the kit showed the first "+" after eight other commands steering 7 to 8 s: those commands had been steered in the growth worker, so the console worker had nothing kept. The song on air is now steered in the console worker for every command (`player.steerOnAir`, never cancelled by a newer console change); the second run above is after that.

## Goals / Non-Goals

**Goals:**

- The same output as today for every input, checked over many songs and random command sequences.
- The cost of a press depends on the new command, not on the number of commands before it.
- The targets of D8, including a 10-minute song.
- Memory bounded per worker.
- A press's expected preparation in the radio that follows the new cost, so the speed reaches the listener.

**Non-Goals:**

- Changing any choice of the director, the waypoints or the typing model: the fixtures do not move, and `DIRECTOR_VERSION` and `SHAPES_VERSION` stay. No version bump is needed because the reuse returns values equal to a full steering; a bump would only be needed if a fix found by the check changed today's output, which is out of scope.
- The batch rules (`console-add-ahead`, `console-add-waves`), the window build and sound loading.
- Faster growth (`growOnAir`) or a faster compiler in general.

## Design options

The options were compared on what they skip, what their key costs and how they can go wrong.

- **A. Kept results per command prefix (chosen: D1, D2).** The loop state after each command or batch is kept, keyed by the base, the context and the exact commands up to it. A new press finds the longest kept prefix and steers only the rest. Skips the director's rewrite, the transit and the typing measurement of every standing command. The key is cheap (the base hashed once, the commands serialized). Equality with a full steering follows from the fold being pure.
- **B. Director state kept per phrase, keyed by the commands up to that phrase.** Recompute only from the first phrase the new command touches. In the director this is the same reuse as A, since the commands are applied in order and each rewrites from its own boundary on. A command inserted before standing ones (a cancel, a replay with an earlier boundary) still invalidates everything after it in both. A per-phrase key adds the phrase to the key without saving work, so A keeps the command as the unit.
- **C. A cache of the written form and of the compiled code per phrase or per state (chosen in part: D4, and D5 behind its gate).** The written plan of a grown song compiles every step state, and most states are the same from one measurement to the next. Keyed by content, this is safe whatever the caller. It is the only option that speeds up the new command's own typing measurement, which is what remains after A.
- **D. Persistence on the worker side (chosen: D6) versus results sent back by the page.** The kept results live in the worker that steers. The page sends a short `baseKey` and the commands, and a `forget` when a song leaves the air. Sending the kept states back and forth would copy a grown song per command through structured clone on every press, for no gain while the worker lives. A worker restart only costs one full steering.
- **E. Director checkpoints and a `stateAt` memo (rejected).** Evaluating moves from a per-boundary state, or memoizing `stateAt` by (song, bar), was dropped by the owner on 5 November. With A, the director is 15% of a cold press and almost nothing on a warm one. See "Rejected / later".

**Recommendation:** A + C (D4 now, D5 only if the gate opens) + D, with the radio's estimate made linear (D9). A alone removes the growth with the commands; D4 roughly halves the new command's own typing; D9 lets the entry come early.

## Decisions

### D1. `steerSong` keeps its result per command prefix

`steerSong` looks up the longest prefix of its commands with a kept result and runs `rewrite` only for the commands after it. It keeps the result after each command it runs. The key is the base key plus the commands of the prefix, serialized (`JSON.stringify`, the exact objects `rewrite` receives).

- **Base key.** An id given per realm to the exact content of the base song, plan and options (`baseId` over their JSON, a `Map` from the content to the id, the 12 most recent kept), then the seed and the song index `n`. _Implemented (8 November) instead of a hash or a `baseKey` from the page:_ a hash can collide and give another song's result, and a key the page assigns goes stale if one place that changes the base forgets to change it. The worker names the base once per steering (`steerOnAir` passes the id to its `steerSong` calls); the JSON of a 10-minute grown song costs a few ms, against hundreds per press. The page tags each steering with its song of the session (`owner`, `<session>:<n>`), used only by `forget` (D6).
- **Context version.** A counter raised by `setSpokenContext` when the context changes, by the language and by `setNarratorMine`. It is part of the key. `globalThis.codingMiskAhead` turns the reuse off while it is set.
- **Kept values are never changed.** `rewrite` already builds new objects. The check freezes every kept value deeply (D7), so a caller that writes into one fails at once. Outside the check nothing is frozen, because freezing costs time.

_Alternative considered:_ a key from object identity only. It does not survive the worker's structured clone, and the console worker is where the reuse matters.

### D2. `steerOnAir` keeps its loop state per command or batch

After each unit of the loop (one command, or one batch of console changes) the loop state is kept: `N`, `Wprev`, `P`, `R` and `done`. The key is the base key (with the grown song `g0`, the controls `C` and the chooser) plus the resolved commands so far and the unit as given (`pend`, `q`, `min`, `batch` included). After a pending unit is resolved, the same state is also kept under its resolved form (without `pend`, with the boundaries), because the radio sends the resolved form on the next press. A typed line (`say-live`) and a riser on the grown song are part of the prefix like any other command; the final `riserAir` and `sayAir` passes run on `done` after the loop as today.

- `steerView` and `directorView` call `steerSong` with the same resolved commands, so with D1 they find the result at once (0 to 6 ms in the prototype).
- A command that changes (cancelled, moved to another boundary, edited) changes the key from that command on. The commands before it still match.
- Two pending batches on top of each other (`console-add-waves`, a second wave prepared while the first is pending) are two units: the second reuses the state after the first.

### D3. Director checkpoints: dropped

Not part of this change (owner, 5 November). See "Rejected / later".

### D4. `compileNow` keeps the compiled code per state content

`compileNow` gets the code of `full` (the bar's state with the shown muted tracks) from a cache keyed by its content, and calls `compileSong` only on a miss. `parseCode` still runs per call, because its result is mutable and cheap.

- **Key.** `JSON.stringify(full)` plus the context version (`compileSong` reads the language, the voice context and the my-phrases pick for spoken lines). The prototype shows keys of about 10 kB on a 10-minute song.
- **Bound in bytes (owner decision of 8 November).** The cache is a least-recently-used `Map` per realm bounded at 48 MB of keys plus code (counted as string lengths, about bytes for this text), not by entries, because the entry size grows with the song. A 10-minute session of twelve presses filled 23 MB; the heaviest song measured on 8 November reached the bound (1747 entries).
- _Alternative considered:_ a hash as the key, to save memory. A collision would return the code of another state and break the same-output guarantee, so the full content stays the key. If memory becomes the limit, the caller can pass a cheaper exact key (the bar's step prefix plus the shown tracks).

### D5. The written plan reused by content (behind a gate)

After D1, D2 and D4, the timing script (task 5.1) measures the presses of D8 on a quiet machine. If the 90th percentile of a press on a 10-minute song is still over 1.5 s, `planWrittenSteps` keeps its per-step results across `liveCode` instances in one realm: the code of a step for a given active plan (the `early` map, today per instance) and the typing plans (`typings`, today per instance), keyed by content, with the byte bound of D4. If the gate stays shut, D5 is left out and the design records the measured numbers.

### D6. Lifetime and invalidation

- **Per realm, per worker.** The caches live in the module where they are used. The console worker and the growth worker keep them across presses, which is where reuse pays. The page's main thread, which steers only as a fallback and for `airView`, keeps the reuse off (owner decision 1).
- **Bounds.** D1: 128 prefix results. D2: 64 loop states, each holding a grown song (about 40 kB as JSON on a 10-minute song). D4: 48 MB. Bases: 12, an evicted base drops its D1 and D2 entries. Each is a least-recently-used `Map`. Task 5.2 records the heap after a session of 20 presses on three 10-minute songs and moves the bounds if needed.
- **`forget`.** When a song leaves the air (the natural change, a skip, the end of a hand-coded song), the radio sends `{ forget: owner }` to the console and growth workers, which drop that song's bases with their D1 and D2 entries and the compile entries made while steering it. A new session sends `{ forget: '*' }`, which clears all.
- **A dropped console change no longer stops the console worker** (_added on 8 November_). `cancelAhead` stopped the worker so the next steering did not wait behind a long one; it now only leaves the answer out, because a new worker starts with nothing kept and steers every command again, while the queued steering reuses what the dropped one steered.
- **What changes a key:** the base (new song, regrown `g0`, extended song, session bias), the context version (spoken context, language, my phrases), the controls and the chooser (`AIR_CHOOSER` version), and any command in the prefix.
- **Turned off** while `globalThis.codingMiskAhead` is set (the growth probe's overrides), and by `STEER_MEMO=0` in Node for comparisons.

### D7. A check that compares with a full steering

`tools/check-steer-memo.mjs` (`npm run check:steer-memo`, no browser):

- **Songs**: 20 Classic songs (styles in turn, seeds `memo-<i>`), 5 Crescendo and 10 Live coder songs grown as `check-radio-profiles` grows them, a third of each at exact 10 minutes (`ONLY`/`SEEDS` to widen it).
- **Random sequences**: per song, 6 to 12 presses from a seeded mix of the console's kinds: `energy-up`, `energy-down`, `more`, `less`, `lock-part`, `unlock-part`, `vary`, `swap`, `curve`, `darker`, `more-space`, `mute`, `volume`, `riser`, `say-live`, `extend`, `pattern`. Presses are pending (`pend`, `q`, `min`) as the radio sends them, some in batches; after some presses a command in the middle is cancelled, a pending batch is replaced, or a second batch is pending on top of the first.
- **The comparison**: after each press, the result with reuse (one long-lived cache, as in the worker) against a full steering with the reuse off, in the same process, byte for byte (`steerOnAir`'s song, commands, plan, options and `plain`; `steerView`; Classic `steerSong`'s song, plan and options). Kept values are deeply frozen, so a mutation throws.
- **Directly**: `compileNow` with the cache against without, on a sample of bars.
- **Context**: one run changes the language and the spoken context halfway.
- **Replay**: the final commands of each song steered in a fresh process (nothing kept) equal the live result.
- **Time**: about 3 to 4 minutes, so it is a separate check, not part of `check:endless`.

### D8. Timing script and targets

`tools/steer-bench.mjs` repeats the measurement of this design (the songs above, twelve presses, at style length and 10 minutes): the time per press and per part (director, transit, typing, compile), today against reuse (`STEER_MEMO=0/1`, interleaved per press), the hit rates, the heap, and the load average at the start and the end. The targets, on the owner's Mac with no checks running (load under 4):

| Measure                                                                                     | Target                                                              |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Live coder and Crescendo, 10 min, press 12 (11 standing), 90th percentile over songs        | < 1.5 s                                                             |
| Live coder and Crescendo, any length, press 12 against press 1 of the same song             | < 1.5 times                                                         |
| Classic, 10 min, press 12                                                                   | < 150 ms                                                            |
| Page, `check-add-lag.cjs --standing 8 --profiles switch,crescendo --rate 4`, 10-minute song | batch ready within one phrase; the entry not pushed by the steering |
| `console-add-ahead` estimate (D9) on the same run                                           | under 1.5 times the measured preparation                            |

The 4× CPU row follows from the first one: 1.5 s in Node is about 6 s with the CPU slowed 4 times, under one 8-bar phrase at 160 BPM (12 s). That leaves the 2-phrase head distance of `console-add-waves` reachable: 2 s of lead plus the preparation fit before the second phrase start after any press.

### D9. The expected preparation follows the new cost

`expectedPrep` drops the square. For a grown song it uses the last measured steering of this song (`steerSeen.ms`), scaled by the number of new commands in the batch and not by the standing ones, and `0.3 × growMs` per new command until a steering is seen. The 30 s bound stays.

_Implemented (owner decision of 8 November)._ Today `expectedPrep` was never called: `addAt` used the page's last batch time (`addPrep`), which caused the 11-move "not ready" chain of `console-add-waves` (finding 2). Now `addAt(item, after, k)` leaves `ADD_LEAD` plus `expectedPrep(item, k)`:

- Classic: this song's last preparation (`item.addPrep`), else the page's.
- Grown: `1.3 × steerPer × k + addRest + 0.5` s, at most 30 s. `steerPer` is this song's last batch steering divided by the commands the worker steered (it reports them, `work`); before one, `0.3 × growMs`. `addRest` is the rest of this song's last preparation (window, plan, sounds), else the page's, 0.5 s at first. Only console batches measure it (the growth worker's queue would inflate it).
- A batch moved while its steering still runs (`pushBatch`, a retarget) holds the estimate up (`addHold`, the elapsed time × 1.25, or × 1.2 + 0.5) until a batch of the song is ready.
- `k` is 1 at the first press, the batch's commands on a push or a retarget. This changes only when a live batch enters (the boundary is recorded with the command), so recorded recipes and replays are unchanged. It reverses owner decision 4 of 5 November, which assumed the estimate would follow the measured time; the `growMs × n²` term does not (see Context).

## Risks / Trade-offs

- [A kept value changed by a caller corrupts later results] → the check freezes kept values. `rewrite` and the waypoint steps already build new objects. A mutation found by the check is fixed at the caller.
- [A missing input in a key gives a stale result] → the key covers every argument and the module context that the steering reads. The check changes the context halfway and replays in a fresh process. Any module-level state found later goes in the context version.
- [Memory in the workers: compile keys are large] → the byte bound of D4, the entry bounds of D1 and D2, `forget`, and the heap measured in task 5.2.
- [The content keys of D4 cost time] → measured by the timing script; a cheaper exact key from the caller is the fallback.
- [The first press of a song and a cancel early in the song still cost a full steering] → that is the cheap case today (0.5 to 1 s on a 10-minute song); director checkpoints can come back as their own change if the timing script shows it matters.
- [The faster estimate (D9) lets a batch aim at a boundary the steering then misses] → the existing push to the next phrase start still applies, and the estimate keeps a 1.3 factor and 0.5 s margin as today.

## Migration Plan

No data changes. Replays give the same songs. The reuse can be switched off (`STEER_MEMO=0` in Node, a constant in the workers) if a problem shows on air; D9 can be reverted on its own.

## Rejected / later

- **Director checkpoints (former D3).** `directSong` would keep the song state at the start of each boundary and evaluate each candidate move from it (`stateFrom`, copy on write), instead of `stateAt` from bar 0. Dropped on 5 November (owner: "lascerei perdere"). With D1, a warm Classic press on a 10-minute song takes 64 to 255 ms under load, and the director is 15% of a cold Live coder press.
- **Memoizing `stateAt` by (song, bar).** The working song changes with every step taken, so the key would be the whole step list. The hit rate is low, and the key costs about as much as the replay.

## Owner decisions (8 November)

The open questions below were answered on 8 November:

1. **Compile cache bound:** by bytes, 48 MB per worker, least recently used first (replaces the 3000 entries of decision 3).
2. **`expectedPrep` linear (D9): yes, in this change.** The estimate for a grown song is measured on that song and grows with the batch's new commands only; `addAt` uses this song's estimate, not the page's last batch time.
3. **Target:** a press on a 10-minute grown song with 11 commands standing costs under 1.5 s (90th percentile) on a quiet machine in Node, about 6 s with the CPU slowed 4 times.
4. **`check:steer-memo` is its own script**, not part of `check:endless`: run before a merge that touches the steering, the director, the waypoints or the compiler.

## Owner decisions (5 November)

1. **The reuse runs in the workers and in Node only.** The page's main thread keeps it off.
2. **D5 stays in this change, behind its gate.**
3. **The bounds are 128 / 64 / 3000** (D1, D2, D4). Task 5.2 measures the heap and may move them. _Proposed on 8 November: D4 bounded at 48 MB instead of 3000 entries (open question 1)._
4. **No change to `addPrep` or `ADD_LEAD`.** _Proposed on 8 November: `expectedPrep` made linear (D9, open question 2); `addPrep` and `ADD_LEAD` stay._
5. **The reference machine is the owner's Mac with no checks running** (load average under 4), recorded by the timing script. Under load the script reports ratios only.
6. **Director checkpoints are dropped.**

## Open questions (8 November, answered)

Answered by the owner on 8 November (see "Owner decisions (8 November)"); kept as asked.

1. **Bound of the compile cache.** 3000 entries (decision 3) can reach about 60 MB on a 10-minute song, because one key is about 10 kB. Recommended: a bound of 48 MB per worker, counted as string length.
2. **`expectedPrep` linear (D9).** Recommended: yes, in this change; without it a faster steering still waits up to 30 s on long songs.
3. **Targets on a 10-minute song.** Recommended: press 12 under 1.5 s in Node on a quiet machine (90th percentile), which gives about 6 s with the CPU slowed 4 times.
4. **The new check in the regular set.** Recommended: `check:steer-memo` as its own script (3 to 4 minutes), run before a merge that touches the steering, the director, the waypoints or the compiler, and not inside `check:endless`.
