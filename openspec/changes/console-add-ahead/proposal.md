## Why

In the owner's test fx8 (2 November), pressing "+" in the radio console's Arrangement group made the page stutter and Strudel logged a few "skip query: too late", so about seven notes dropped. The console is meant to be played live, on air, so a button press must never be heard. Measured on 3 November: the work happens on the click, not when the track enters. Each "+" or "−" rewrites the whole song on air on the main thread (up to 238 ms for one click, 345 to 583 ms per click in a quick burst), while the new track only enters at the next phrase, about 10 seconds later.

## What Changes

- **The click only records the wish.** "+" and "−" in the Arrangement group mark a pending change on the instrument at once and do no heavy work in the click's task.
- **Prepared in the background, like "Say now".** The song with the change is steered away from the page (the radio's growth worker, for Classic songs too), the window is made ready a little at a time, and the new track's samples and soundfonts load before its bar. Only the finished window reaches the player.
- **A predictable entry, later only when needed.** By default a pending change enters at the start of the next phrase that leaves enough time (2 seconds plus the preparation). The entry moves later, to a half-phrase or the next phrase start, only when the preparation is not finished or the page is busy enough that the entry could skip notes. There is no random variety. Under heavy load the wait is bounded at 30 seconds after the press; then the change enters on the next boundary where it is ready, and the page logs it. It is never lost and never enters half-ready.
- **Rapid presses merge.** Pending "+" and "−" on one instrument for one boundary add up to a net count ("+ +" is two tracks, "+ −" is nothing, "− −" is two fewer). Changes on different instruments for the same boundary enter together, in one window swap. A press made while a batch is being prepared joins it when at least 2 seconds are left, else it goes to the next sensible boundary.
- **Entry time at the click, counted down.** From the click each instrument with a pending change shows its net count and the time left ("+1 · Enters in 6 s"), counted down live. A later entry shows at once with a short highlight. The queue shows one row per instrument and boundary, each cancellable until a third of a bar before its bar. A cancel is prepared in the background too.
- **Removal is the same path.** "−" follows the same rules, so a removal causes no lag or skipped note either.
- **A load budget for the console.** From the click until two bars after the entry, no "skip query: too late" and no main-thread task over 100 ms at normal CPU speed. With the CPU slowed 4 times, no task over 100 ms from the click until the window is ready. A new browser check measures it.

Not in scope: making the steering itself faster (`stateAt` memoization, see design), other console commands (the same model can follow later), Ring's audio-thread cost on many tracks (measured, not the cause of fx8).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `endless/steering`: new requirements for how Arrangement "+" and "−" are prepared ahead, when they enter, how quick presses merge and cancel, what the console shows while they are pending, and the load budget.

## Impact

- `src/radio/radio.js`: the click handler of `arr-pm` buttons, `command`, `resteer`, `steerAir`, `airView`, `swapSoon`, the Arrangement group's badges and the queue rows.
- `src/endless/grow-worker.js` and `growAway` in `src/main.js`: Classic steering (`steerSong`) and the director's view (`directorView`) computed in the worker.
- `src/main.js`: the radio player's `swap` (soundfont preload in slices, sample warm-up for the new tracks only).
- `src/i18n.js` (new strings in English and Italian), `src/guide.js` (radio console card), `docs/knowledge/` (decisions, checks), `docs/ENDLESS.md` (Steering).
- Checks: new `tools/check-add-lag.cjs`; `tools/check-steering.cjs`, `tools/check-arrangement-levels.cjs`, `tools/check-radio.cjs` and `check:endless` must still pass. Replays stay identical: the recorded commands are the same as today's for the same net changes.
