## Context

`liveChanged()` in `src/main.js` calls `playable()`, which calls `crescendoOf()`, which runs `crescendoSong()` in the page. For a Live coder growth without a named pace and development, `crescendoSong()` tries up to 28 shapes; for each it measures the typing of every step (`typingLoad` in `src/live/typing-load.js`). Measured on luci-rosse: 4.6 s in all, 4.2 s of it in `typingLoad`, 1.5 s of that in `cloneState` (a JSON copy per compiled bar). `rushedSteps` and `rushLoad` run `typingLoad` twice on the same growth, and `typingLoad` computes the code of each bar twice (as the bar and as the bar before the next one).

The page already grows the song restored in Compose away from the page at start (`heldCompiled`, `growComposeAway`, `pageAway`), with a second worker that also grows the song cards' lengths.

## Goals / Non-Goals

**Goals:** the page never freezes on a growth in Compose; the same grown songs; less time per growth; no growth paid twice across reloads.

**Non-Goals:** changing which shape is kept or the written part's code (separate changes); the radio, which already grows in its worker.

## Decisions

### D1. A Compose worker of its own
Compose growths run in a third worker, so they never queue behind the song cards. A newer request terminates the worker and starts a new one: a growth cannot be stopped from inside, and a stale growth would hold the newer one for seconds. The answer is accepted only when its key is still the song's key (as `growComposeAway` does today).

### D2. One path for every change
`liveChanged()` uses the start path for every change: when the growth is not cached, `compiled` is the held song (as written, `pending`) and the growth goes away. `grownNow()` (Play and export) waits for the pending growth instead of growing in the page; without a worker it grows in the page as today.

### D3. The mark
A small drawn icon (circular, animated with CSS, still with `prefers-reduced-motion`) next to the profile chips, and on Play while Play waits. Tooltip: "The song is growing: it plays grown in a moment" (Italian: "Il brano sta crescendo: suona cresciuto tra un attimo").

### D4. One measure per growth
`typingLoad` keeps the code of each bar in a map for one call. `crescendoSong` measures once per tried shape and derives the rushed count and the rushed load from the same list; the free-duration loop reuses its last measure when it adds no bars. Results are identical by construction; `check:crescendo` proves it.

### D5. Counters
`crescendoSong(song, { ...opts, stats })`: when `stats` is an object, each tried shape pushes `{ development, pace, maxDetail, rounds, rushed, load, ms, bars }` and the total time is set. No object, no work. `tools/growth-probe.mjs` (`npm run growth:probe -- <song> [--profile switch] [--opening x] [--pace x] [--development x] [--duration free|fitted]`) prints them.

### D6. Stored growths
IndexedDB (`coding-misk-growths`), key: the Compose growth key (`crescendoKey`) plus a growth hash. Value: the grown song (10-12 KB for luci-rosse and kellerlicht). Cap 60 growths (about 0.7 MB), least recently used dropped first. The growth hash comes from `vite.config.js`: a hash of `src/song/`, `src/live/`, `src/endless/` and `styles/`, recomputed when one of them changes in dev, so a code change never serves an old growth. Reads and writes fail quietly (private window, blocked storage): the song grows again. The backup does not include them.

## Risks / Trade-offs

- A terminated worker loses its modules: the next growth pays the worker start (about 100-200 ms). Accepted.
- The held song plays as written if the owner exports during the growth: export waits like Play (D2).
- The hash covers more files than the growth needs, so some unrelated edits clear the store. Accepted: it only costs one regrowth per song.
