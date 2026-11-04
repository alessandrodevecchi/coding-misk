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

### D2. A predictable default, later only when needed (owner answers 1 and the refinement)

The listener must be able to predict the entry: the default is fixed, and the song moves it later only for load or preparation. There is no random variety. In practice the entry is a few bars to about 10 seconds after the press, as with Say now.

- **Default.** The start of the next phrase of the song's plan (`plan.phrase`, the musical phrase, never the voice track) that is at least `ADD_LEAD` = 2 s plus the expected preparation time after the press. The expected preparation time is the last measured batch time on this page, 1 s before the first. The same press at the same point of the same song on a quiet page gives the same bar. Songs with and without a voice track behave the same.
- **Later boundaries.** Only when needed (below), the change moves to the next sensible boundary. A half-phrase start counts when the phrase has an even number of bars (4 bars in an 8-bar phrase, 8 in a 16-bar one); otherwise the next phrase start.
- **Ready.** The song, the window and the new tracks' sounds are ready a third of a bar before the candidate, the margin of `swapSoon` and `placeLine`.
- **Quiet.** A load monitor in the page keeps the last 2 s of long tasks (PerformanceObserver) and of Strudel's skipped windows (the scheduler's late ticks). A candidate is taken only when there was no task over 50 ms and no skipped window in those 2 s, and the expected entry cost fits the scheduler's margin. The expected cost is the last measured evaluation of this window's code times 1.5, against the scheduler's 100 ms look-ahead. Otherwise the change moves to the next sensible boundary (a push, shown at once on the badge with a short highlight, and in the queue).
- **Bound.** The wait ends 30 s after the press: the change then enters on the next boundary where it is ready, even under load, and the page logs `[radio] entered under load` with the bar (the check reports it). Readiness is never skipped, so the change never enters half-ready. This replaces the earlier cap of three pushes, which could force an entry while the page was busy.
- **Half-phrase entries and the director.** A command `at` on a half-phrase start is new for `more` and `less`. The rewrite keeps every director move on phrase boundaries; only the listener's track change starts at the half phrase (its clip starts there). Task 1.3 verifies that `steerSong` and `steerOnAir` accept it and that the seed fixtures do not move.

| Option                                                  | Notes                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **A (chosen)** next phrase with enough time; later only for load or preparation | Predictable at the click, and no lag first; half phrase only as a later step |
| B always the next phrase, never later                    | Predictable, but enters under load and skips notes                                                     |
| C the first bar 2 s ahead, as Say now                   | Fastest, but an instrument can enter on any bar, which can sound off                                   |

### D3. One batch per boundary, merged per instrument

- **Pending map.** `pending[boundary][part] = n`, a signed net count. "+" adds 1, "−" subtracts 1. A count of 0 removes the entry, so "+ −" leaves nothing.
- **Limits.** The net count is clamped by the rules of D1 checked on the song with every pending change of that boundary. A press beyond them is refused with the reason, as a disabled button gives today.
- **Settle time.** The batch starts preparing 250 ms after the last press of its boundary. A burst therefore costs one steering, and a single press waits a quarter second that nobody hears, since the boundary is seconds away.
- **Late presses (owner answer 3).** A press for a boundary whose batch is preparing or ready joins it and restarts the batch (the old job is dropped with the existing `growToken` and `windowSeq` guards) when at least `ADD_LEAD` = 2 s remain. Otherwise it goes to the next candidate's batch.
- **Order.** The batch is written as commands in a fixed order (instrument order of `INSTRUMENTS`, then "−" before "+"), each `|n|` times, all with the same `at`. Two presses in different orders give the same song.

| Option                                    | Notes                                                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **A (chosen, owner answer 2)** net count per instrument | "+ −" cancels, as the owner confirmed; one row per instrument; the record stays in today's command form        |
| B keep each press as its own command      | Today's behaviour: "+ then −" brings a track in and takes one out (possibly another one), and a burst costs one steering per press |
| C stagger: each press on its own boundary | No merge logic, but changes arrive one phrase apart, which is not what a live player means by a quick burst |

### D4. Preparation in the background

For a batch, in order, each step in its own task and guarded by a sequence number:

1. **Steering away from the page.** The batch's commands are added to the item's commands. The steering runs in the growth worker: `steerSong` for Classic (new message kind) and `steerOnAir` for grown songs, with the director's view (`directorView`: plan, opts, plain song) returned by the worker. `airView` therefore no longer runs on the main thread before the worker call. With no worker, the steering runs in the page in a task of its own, after the settle time (a fallback that stays slow but never on the click).
2. **The window.** `windowPlayable` with the steered song, prepared with `p.prepare(12, …)`. A Classic window gets a sliced `prepare` too: its `build` steps and `codeAt` made a few per slice.
3. **Sounds.** The sounds of the new tracks only (the diff of the window's sound list before and after) are loaded with `preloadFonts` and warmed at gain 0. The whole-window `soundCode()` compile, which runs in one task today, is replaced by this diff, made in slices.
4. **Commit.** When all three are ready, the boundary is more than a third of a bar away and the page is quiet (D2), the commands are recorded (`S.recipe.steering`, the session's arrange list when the scope is the session) and `player.swap(p)` hands the window over. Otherwise the batch waits for the next candidate (D2).

The entry bar keeps today's evaluation by the transport (21 to 29 ms measured). Evaluating the new code early is not needed at this cost (Risks).

### D5. What the console shows

- **Badge with a live countdown.** At the click, next to the instrument's name (where `×n` is today): "+1 · Enters in 6 s" (Italian: "+1 · Entra tra 6 s"), counted down every second from the planned bar and the tempo. While preparing, a slow pulse; when ready, a steady look. When the entry moves later, the new time shows at once with a short highlight (a 600 ms flash of the accent, none with reduced motion). The tooltip names the bar: "Enters on bar 81". The `×n` count keeps showing the tracks playing now. A narrow console may shorten it to "+1 · 6 s".
- **Queue.** One row per instrument and boundary: "bar 81 · +2 arp · 6 s" with ✕, replacing one row per press. A pushed row shows its new bar. A row that is entering (less than a third of a bar left) shows its ✕ disabled with the tooltip "Entering now".
- **Cancel.** ✕ removes the instrument's entry from the batch and restarts the batch's preparation for the others. When it was the last entry, nothing is prepared and the window on air stays as it is. A cancel never touches the music before its boundary, so it costs nothing heard.
- **Hardware theme.** The countdown shows on the instrument's small display, next to an LED lit while pending and blinking while preparing.

### D6. Record and replay

A batch is recorded when it commits, as today's commands: `|n|` commands of kind `more` or `less` for each instrument, with the batch's `at`. A replay rebuilds the same song with no change to `steerSong` or the seed fixtures. Presses that cancelled out, or a batch cancelled whole, leave nothing.

### D7. A new browser check

`tools/check-add-lag.cjs` (dev server on PORT): Classic, Crescendo and Live coder; the cases of the table above plus a 12-track song (11 tracks, then "+ arp" and "− bass"); CPU at 1× and at 4×. It checks the spec's budget, that the badge shows within 100 ms, the bar each change enters, the net result ("+ −" changes nothing, "+ + +" stops at the cap), cancel, a push (preparation slowed on purpose) and a replay. It reports the longest task and the skips per case, as `check-say-lag.cjs` does.

### After (4 November, `tools/check-add-lag.cjs`, same machine under load)

| Case | Classic | Crescendo | Live coder |
| --- | --- | --- | --- |
| "+ arp" late (bar 96 to 100): longest task, own work, "too late" | 92 ms (page), 11 ms, 0 | 0 ms, 4 ms, 0 | 0 ms, 7 ms, 0 |
| steering, ready after | 0.1 s, 1.3 s | 0.7 s, 1.0 s | 6.7 s, 7.2 s |
| burst of four: longest task, "too late" | 69 ms, 0 | 0 ms, 0 | 0 ms, 0 |
| CPU 4×, press until ready: own work, ready after | 7 ms, 1.2 s | 7 ms, 0.9 s | 24 ms, 3.7 s |
| 11 tracks, "+ arp" and "− bass" | 64 ms, 0 "too late" | | |
| nothing pressed, CPU 1× and 4× (15 s) | 56 and 125 ms | 0 and 0 ms | 59 and 88 ms |

Before: 112 to 583 ms per press on the click. The badge shows within 5 ms of the click in every case; the press itself costs at most 4 ms with the CPU slowed 4 times.

## Risks / Trade-offs

- [The worker and the page disagree on a song] → The worker already runs `steerOnAir` with the same modules. Classic `steerSong` is pure on its inputs. The check compares the worker's song with the page's for every case (JSON equal).
- [A change enters later than before under load] → Wanted by the owner: no lag first. The badge shows the bar and the seconds, and the 30 s bound keeps the wait finite.
- [The load monitor waits forever on a slow machine where every bar has a long task] → The 30 s bound; the check runs at CPU 4× to see how often it is reached.
- [Entry evaluation on a slower machine] → 21 to 29 ms at 1×. If the 4× run shows tasks over 100 ms on the entry bar, a follow-up evaluates the Classic window early (its clips already start the track on its bar, so the sound is the same). Measured in task 5.1, not assumed.
- [Steering still grows with the song] → It now runs away from the page once per batch, so the length of a song no longer reaches the click. A memoized `stateAt` stays out of this change (owner answer 4).
- [Other commands keep the old path] → Out of scope here. The pending-map model is generic, and Vary, Swap, Lock and the riser can move to it later.

## Migration Plan

No data migration. Sessions recorded before replay the same, because the recorded command form does not change. Rollback is reverting the change.

## Owner answers (3 November)

1. **Entry moment:** absence of lag first, the exact moment second. Refined: the default is the next phrase start that leaves enough time, deterministic; a later boundary only when load or preparation needs it (D2). Songs without a voice behave the same. The entry time shows at the click and counts down live, and a later entry shows at once (D5).
2. **"+" then "−" before the entry:** they cancel out (D3).
3. **A press during a batch's preparation:** it joins the batch when at least 2 s are left, else the next boundary (D3).
4. **Faster steering:** out of this change, no issue for now.
