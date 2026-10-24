## Why

Picking the Live coder profile in Compose, or changing the opening, pace or development of the growth shape, freezes the page for seconds: 4.6 s on luci-rosse, 11.6 s on settimo-cielo, 22.7 s on kellerlicht. The song grows in the page at the click. Most of that time goes into measuring the typing of each candidate shape, and the same code is computed several times in that measure. A growth is also forgotten at each reload, so the first click after a reload always pays the full price.

## What Changes

- **Growth in the background.** Every change in Compose that needs a new growth (profile, build style, growth, duration, growth shape, Fully narrated) is applied at once. The song stays as written while it grows in a worker, with a drawn "growing" mark next to the profiles. Play waits for the growth with the same mark on the Play button. A newer change cancels a growth still running.
- **Growth counters on demand.** The growth can report what it did (shapes tried, free-duration rounds, rushed steps, time per shape). Off by default at no cost; a command prints them for a song and a shape.
- **Less repeated work in the typing measure.** The code of each bar is computed once per measure, and a measure is not run twice on the same growth. The grown songs stay exactly the same.
- **Growths kept across reloads.** The growths made in Compose are stored in the browser, with a cap, the oldest dropped first, and cleared when the growth code changes.

The search over shapes (a target on the growth steps only, a cap, a seeded order) and a written part that reuses its code are separate changes: they change the grown songs.

## Capabilities

### New Capabilities

- `live-build/growth-in-background`: growth away from the page in Compose, its mark, the counters, the stored growths.

### Modified Capabilities

None in `openspec/specs/`.

## Impact

- **Code:** `src/main.js` (Compose growth requests, mark, Play waiting, stored growths), `src/endless/grow-worker.js` or a Compose worker, `src/live/typing-load.js` and `src/song/crescendo.js` (shared measure, counters), `vite.config.js` (growth source hash), `src/icons.js`, `src/i18n.js`, `src/style.css`, Guide.
- **Checks:** `check:crescendo` fixtures unchanged (same growths); a new `npm run growth:probe`; a browser check that the page answers within a frame budget while Live coder and the shape menus change, that Play waits, and that a reload reuses the stored growth.
- **Docs:** knowledge notes (profiles, checks, decisions), DEVLOG.
