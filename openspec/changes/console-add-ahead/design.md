## Context

- **The "+" and "−" path today** (`src/radio/radio.js`). The `arr-pm` button's click calls `command({ kind: 'more' | 'less', part })` in the same task. `command` picks the boundary (`applyBar` for Classic, `airBoundaries` for grown songs: the next phrase, 8 bars in most styles), pushes the command, then calls `resteer`:
  - Classic: `steerSong` runs on the main thread. It rebuilds the song from its plan plus every standing command (`rewrite` → `directSong` → `stateAt`, which clones the state step by step from bar 0).
  - Grown (Crescendo, Live coder): `steerAir` first calls `airView` → `directorView` → the same `steerSong`, on the main thread. Only after that does it send the waypoint steering to the growth worker (`player.steer` → `growAway`).
  - Then `swapSoon(windowPlayable(), bar)` builds the window. A grown window's written plan is made in 12 ms slices (`p.prepare`), but a Classic window is built in one go. `renderNow()` redraws the console.
  - When the window reaches the player, `swap` warms the voice samples. In a task of its own it loads soundfonts (`preloadSounds`, which compiles the whole window's code in one task when `soundCode` exists). On the entry bar the transport evaluates the new code.
- **The "Say now" model** (`sayLine` and `placeLine`, `#82`). The click only queues a waiting row. The sample comes from the voice helper. The line is then tried on the song, and the window with it is prepared in slices. It is committed when ready a third of a bar before its bar, or pushed to the first bar `SAY_LEAD` (2 s) ahead again. After `SAY_PUSHES` (3) pushes it is finished at once. This change reuses that model for the Arrangement buttons.
- **The growth worker** (`src/endless/grow-worker.js`) already runs `steerOnAir` for grown songs. Classic steering never goes there.

## Measurements (3 November)

Method: `tools/check-say-lag.cjs` style. Headless Chrome on the owner's Mac with other jobs running (load average 4 to 8). Radio, `berlin-techno`, seed `add-ahead-<profile>`, talk 0, CPU not slowed. The page's long tasks (PerformanceObserver), Strudel's "skip query: too late" (a scheduler window dropped because the main thread was busy) and a CPU profile were recorded from the click until two bars after the entry. Each case was pressed in a fresh phrase, one after the other in the same song, so later cases run later in the song with more commands standing. The script is in the session scratchpad. Its cases become `tools/check-add-lag.cjs` (task 5.1).

"Click" is the first 1.5 s after the first press. "Entry" is ±1.2 s around the boundary. The track enters 9.6 to 11.8 s after the click in every case (the next 8-bar phrase at 128 BPM).

| Case (presses 120 ms apart)              | Song bar | Classic: click tasks (longest / sum) | Classic: "too late" | Live coder: click tasks (longest / sum) | Live coder: "too late" |
| ---------------------------------------- | -------- | ------------------------------------ | ------------------- | --------------------------------------- | ---------------------- |
| nothing pressed (baseline)               | 2        | none                                 | 0                   | none                                    | 0                      |
| + arp                                    | 10       | none                                 | 0                   | none                                    | 0                      |
| + pad                                    | 19       | none                                 | 0                   | none                                    | 0                      |
| + + arp                                  | 27       | 58 / 58 ms                           | 0                   | 89 / 160 ms                             | 0                      |
| + + + pad                                | 35       | 125 / 307 ms                         | 0                   | 186 / 458 ms                            | 3                      |
| − arp                                    | 43       | 185 / 238 ms                         | 2                   | 238 / 238 ms                            | 2                      |
| − − pad                                  | 51       | 273 / 550 ms                         | 8                   | 291 / 556 ms                            | 7                      |
| + then − melody                          | 59       | 237 / 472 ms                         | 5                   | 422 / 817 ms                            | 11                     |
| + − + texture                            | 67       | 273 / 777 ms                         | 10                  | 484 / 1357 ms                           | 18                     |
| + arp, − bass, + pad, + texture          | 75       | 345 / 1268 ms                        | 18                  | 583 / 1647 ms (3 presses, − bass refused) | 25                   |

- **Every skipped window comes from the click.** The few counted after the first 1.5 s are the tail of the last click's task. No skip was logged around any entry bar.
- **The profile of the click tasks** (Classic, the 4-instrument burst, 1252 ms in total): `command` → `resteer` → `steerSong` → `rewrite` → `directSong` 1213 ms, of which `stateAt` 1168 ms (`clone` 717 ms, the energy `measure` 566 ms). Live coder: the same chain under `steerAir` → `airView` → `directorView`, 1535 ms. The window, the console and the evaluation are small next to it.
- **The cost grows with the song.** One "− arp" costs 185 to 238 ms on bar 43, where the first "+ arp" on bar 10 cost nothing measurable. `stateAt` replays every step from bar 0, and every click steers the whole song again with every standing command.
- **Each press of a burst pays the full cost again.** Three presses make three full rewrites, one per click. This matches fx8: a few presses, a few hundred ms each, about 7 notes lost.
- **The entry bar is cheap at this speed.** The transport's evaluation of the new code took 21 to 29 ms (window code of 4.6k to 11.3k characters). The tasks on the entry bar were 51 to 66 ms. No skip was logged there.
- **The time between the click and the boundary is long enough to prepare.** The phrase is 9.6 to 11.8 s away, and one full steering costs at most 0.6 s even late in the song.

### Ring and Fold on a 12-track song

Method: as `tools/check-fm-effects.cjs`. A radio song stacked to 12 tracks with "+", its window code taken on the stacked bar, the device written on some tracks or on every line (`all(x => x…)`), each variant played 20 s in real time with the CPU not slowed.

| Style (notes/s)         | Variant       | Evaluate | Long tasks (longest) | "too late" | Audio underruns   |
| ----------------------- | ------------- | -------- | -------------------- | ---------- | ----------------- |
| berlin-techno (42/s)    | plain         | 35 ms    | 0                    | 0          | 0                 |
|                         | Ring 1 track  | 46 ms    | 0                    | 0          | 0                 |
|                         | Ring 3 tracks | 45 ms    | 0                    | 0          | 0                 |
|                         | Fold 3 tracks | 43 ms    | 0                    | 0          | 0                 |
|                         | Ring all 12   | 46 ms    | 0                    | 0          | 0                 |
|                         | Fold all 12   | 41 ms    | 0                    | 0          | 0                 |
| darksynth (118/s)       | plain         | 69 ms    | 2 (104 ms)           | 2          | 0                 |
|                         | Ring 1 track  | 76 ms    | 0                    | 0          | 1 (0.01 s)        |
|                         | Ring 3 tracks | 79 ms    | 0                    | 0          | 0                 |
|                         | Fold 3 tracks | 91 ms    | 0                    | 0          | 0                 |
|                         | Ring all 12   | 71 ms    | 4 (120 ms)           | 2          | 1881 (10.0 s of 20) |
|                         | Fold all 12   | 80 ms    | 0                    | 0          | 6 (0.03 s)        |

- Ring and Fold cost almost nothing on the main thread: about 10 ms more per evaluation, and no long tasks of their own. They did not cause fx8.
- Ring's cost is on the audio thread, one worklet per note. On a dense song with Ring on every one of 12 tracks the sound breaks (half of the time in underruns), as measured on 29 October. The director's gestures (`director-fold-ring`) allow at most two Ring tracks at once, a load that stayed clean here. Fold on every track is near the limit on darksynth (6 underruns in 20 s).
- The two long tasks of the plain darksynth run (104 ms, 2 skips) also appear without any press. A dense 12-track song alone is close to the budget on a busy machine, which is one more reason to keep the click free.

## Goals / Non-Goals

**Goals:** a press costs nothing on the main thread; a change enters musically and complete; quick presses merge instead of multiplying the work; the same path for "+" and "−".

**Non-Goals:** making `steerSong` itself faster (a later issue, see Risks); moving other console commands to this path in this change (the queue model allows it later); Ring as one worklet per track.

## Decisions

### D1. The click records a pending change only

The `arr-pm` click calls a new `pend(kind, part)`. It checks the same reasons as today (`whyNot`, the track cap, "−" on the last track) against the song as it will be with the pending changes. It updates a pending map and redraws only the Arrangement group's badges and the queue (`renderSteer(true)`), with no `command`, no `resteer` and no window. A batch timer starts or restarts (D3).

| Option                                            | Notes                                                                                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **A (chosen)** pending map, steering in the batch | The click is O(1); a burst steers once                                                                    |
| B keep `command` on the click, only move `steerSong` to the worker | Still one steering per press, and the window and the render stay on the click              |
| C a faster `steerSong` (memoized `stateAt`)       | Helps every command, but still grows with the song and still runs per press; worth doing later on its own |

### D2. Boundary: the next phrase that leaves 2 s and is ready

The target is the first phrase boundary (`applyBar` or `airBoundaries`, as today) that starts at least `ADD_LEAD` = 2 s after the press. This matches Say now's `SAY_LEAD`. The batch must be ready a third of a bar before it, the same margin as `swapSoon` and `placeLine`. When it is not ready, the batch moves to the next phrase (a push, shown in the queue). After `ADD_PUSHES` = 3 pushes it is finished at once, as `SAY_PUSHES` does. Phrase rather than bar: a new instrument entering mid-phrase sounds wrong, and today's spec already says "from the next phrase". Owner question 1 offers the bar.

### D3. One batch per boundary, merged per instrument

- **Pending map.** `pending[boundary][part] = n`, a signed net count. "+" adds 1, "−" subtracts 1. A count of 0 removes the entry, so "+ −" leaves nothing.
- **Limits.** The net count is clamped by the rules of D1 checked on the song with every pending change of that boundary. A press beyond them is refused with the reason, as a disabled button gives today.
- **Settle time.** The batch starts preparing 250 ms after the last press of its boundary. A burst therefore costs one steering, and a single press waits a quarter second that nobody hears, since the boundary is seconds away.
- **Late presses.** A press for a boundary whose batch is preparing or ready restarts the batch (the old job is dropped with the existing `growToken` and `windowSeq` guards) when at least `ADD_LEAD` remains. Otherwise it goes to the next boundary's batch.
- **Order.** The batch is written as commands in a fixed order (instrument order of `INSTRUMENTS`, then "−" before "+"), each `|n|` times, all with the same `at`. Two presses in different orders give the same song.

| Option                                    | Notes                                                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **A (chosen)** net count per instrument   | "+ −" cancels as the owner expects; one row per instrument; the record stays in today's command form        |
| B keep each press as its own command      | Today's behaviour: "+ then −" brings a track in and takes one out (possibly another one), and a burst costs one steering per press |
| C stagger: each press on its own boundary | No merge logic, but changes arrive one phrase apart, which is not what a live player means by a quick burst |

### D4. Preparation in the background

For a batch, in order, each step in its own task and guarded by a sequence number:

1. **Steering away from the page.** The batch's commands are added to the item's commands. The steering runs in the growth worker: `steerSong` for Classic (new message kind) and `steerOnAir` for grown songs, with the director's view (`directorView`: plan, opts, plain song) returned by the worker. `airView` therefore no longer runs on the main thread before the worker call. With no worker, the steering runs in the page in a task of its own, after the settle time (a fallback that stays slow but never on the click).
2. **The window.** `windowPlayable` with the steered song, prepared with `p.prepare(12, …)`. A Classic window gets a sliced `prepare` too: its `build` steps and `codeAt` made a few per slice.
3. **Sounds.** The sounds of the new tracks only (the diff of the window's sound list before and after) are loaded with `preloadFonts` and warmed at gain 0. The whole-window `soundCode()` compile, which runs in one task today, is replaced by this diff, made in slices.
4. **Commit.** When all three are ready and the boundary is more than a third of a bar away, the commands are recorded (`S.recipe.steering`, the session's arrange list when the scope is the session) and `player.swap(p)` hands the window over. Otherwise the batch is pushed (D2).

The entry bar keeps today's evaluation by the transport (21 to 29 ms measured). Evaluating the new code early is not needed at this cost (Risks).

### D5. What the console shows

- **Badge.** Next to the instrument's name (where `×n` is today): "+1", "+2", "−1" in the accent colour, with a slow pulse while preparing and a steady look when ready. The tooltip reads "Enters on bar 81, in 6 s" (Italian: "Entra alla battuta 81, tra 6 s"). The `×n` count keeps showing the tracks playing now.
- **Queue.** One row per instrument and boundary: "bar 81 · +2 arp" with ✕, replacing one row per press. A pushed row shows its new bar. A row that is entering (less than a third of a bar left) shows its ✕ disabled with the tooltip "Entering now".
- **Cancel.** ✕ removes the instrument's entry from the batch and restarts the batch's preparation for the others. When it was the last entry, nothing is prepared and the window on air stays as it is. A cancel never touches the music before its boundary, so it costs nothing heard.
- **Hardware theme.** The badge is a small LED next to the knob label, lit while pending, blinking while preparing.

### D6. Record and replay

A batch is recorded when it commits, as today's commands: `|n|` commands of kind `more` or `less` for each instrument, with the batch's `at`. A replay rebuilds the same song with no change to `steerSong` or the seed fixtures. Presses that cancelled out, or a batch cancelled whole, leave nothing.

### D7. A new browser check

`tools/check-add-lag.cjs` (dev server on PORT): Classic, Crescendo and Live coder; the cases of the table above plus a 12-track song (11 tracks, then "+ arp" and "− bass"); CPU at 1× and at 4×. It checks the spec's budget, that the badge shows within 100 ms, the bar each change enters, the net result ("+ −" changes nothing, "+ + +" stops at the cap), cancel, a push (preparation slowed on purpose) and a replay. It reports the longest task and the skips per case, as `check-say-lag.cjs` does.

## Risks / Trade-offs

- [The worker and the page disagree on a song] → The worker already runs `steerOnAir` with the same modules. Classic `steerSong` is pure on its inputs. The check compares the worker's song with the page's for every case (JSON equal).
- [A change now enters later than before for a press under 2 s before the phrase] → Today such a press entered on that phrase anyway, but often with skipped notes. The badge shows the bar, so the listener knows.
- [Entry evaluation on a slower machine] → 21 to 29 ms at 1×. If the 4× run shows tasks over 100 ms on the entry bar, a follow-up evaluates the Classic window early (its clips already start the track on its bar, so the sound is the same). Measured in task 5.1, not assumed.
- [Steering still grows with the song] → It now runs away from the page once per batch, so the length of a song no longer reaches the click. A memoized `stateAt` (open question 4) would also make the worker answer faster on long songs.
- [Other commands keep the old path] → Out of scope here. The pending-map model is generic, and Vary, Swap, Lock and the riser can move to it later.

## Migration Plan

No data migration. Sessions recorded before replay the same, because the recorded command form does not change. Rollback is reverting the change.

## Open Questions (for the owner, with the recommended option)

1. **Entry: next phrase or next bar?** Recommended: **next phrase that leaves at least 2 s** (today's musical rule, and about 10 s to prepare). Alternative: the first bar at least 2 s ahead, like Say now. It is faster to hear, but an instrument entering mid-phrase can sound off.
2. **"+" then "−" on the same instrument before the entry: cancel or both?** Recommended: **they cancel** (nothing changes). Alternative: today's behaviour, which brings the new track in and takes another one out.
3. **A press during a batch's preparation: join it or wait for the next phrase?** Recommended: **join while at least 2 s are left**, else the next phrase.
4. **Make the steering itself faster in this change?** Recommended: **no, open a separate issue** (memoized `stateAt`). This change already removes the cost from the click.
