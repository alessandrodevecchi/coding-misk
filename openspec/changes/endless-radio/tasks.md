# Tasks

## 1. Incremental director

- [x] 1.1 Add `createSession(recipes, seed)` with `next(options)` to the director and rewrite `generateSession` as a loop over it; verify `npm run check:endless` passes with the seed fixtures unchanged.
- [x] 1.2 Add a check that a session made song by song with an option change before song 3 gives songs 1 and 2 equal to an unchanged session, and the same songs twice for the same recorded changes; verify it in `check:endless`.
- [x] 1.3 Add the window builder: the song on air plus the next one, joined with a silent offset so bars equal stream bars; verify in `check:endless` that the window song is valid, that its code at a bar equals the song's own code at the same relative bar (apart from the offset lanes), and that an offset above 5000 bars works.
- [x] 1.4 Update `docs/ENDLESS.md` (incremental sessions, window) and `DEVLOG.md`; verify the documented check names exist.

## 2. Radio tab and controls

- [x] 2.1 Add the Radio tab (Italian and English strings, layout with the stage on top, controls and "now playing" card below, code panel and history), load the recipes in the browser; verify in the browser that the tab opens, every visual can be picked, and nothing plays until start.
- [x] 2.2 Add the controls (start and stop, skip, style multi-select with at least one style, chaos, energy, complexity, seed with replay, save, open in Compose), remembered in browser storage; verify in the browser that they render, keep their values after a reload, and refuse to unselect the last style.
- [x] 2.3 Add the "now playing" card (title, styles per part, key, tempo, shape with position, section, next changes) fed by the song on air; verify with a fixed seed that it shows the right values for the first song.
- [x] 2.4 Document the Radio tab in `README.md`, `README.it.md` and `docs/ARCHITECTURE.md`; verify the documented controls match the UI.

## 3. Continuous playback

- [x] 3.1 Add the `radio` player mode: play the window song with the live build, voice and tempo per bar, move the window at each song end, generate the next song in an idle callback after a song starts; verify in the browser that three consecutive song changes have no gap longer than one beat and no evaluation error.
- [x] 3.2 Make the radio and Compose exclusive (starting one stops the other) and make skip move to the next song on the next bar; verify both in the browser.
- [x] 3.3 Apply control changes from the next song and record them in the session recipe; verify in the browser that raising energy during song 1 leaves song 1 unchanged and generates song 2 with the new value.
- [x] 3.4 Add a browser check script that starts the radio with seed `aurora` and compares its first songs with `npm run endless -- --styles berlin-techno --seed aurora`, and plays across song changes measuring levels; verify it passes.

## 4. History and saving

- [x] 4.1 Add the history (last 50 songs in browser storage, newest first, survives reload); verify in the browser with a short fake limit that the oldest entry leaves.
- [x] 4.2 Add save (song on air or from the history into the user's library) and open in Compose (stops the radio, opens the song from its start); verify in the browser that a saved song plays in Compose as a live build.
- [x] 4.3 Add replay of the session recipe; verify in the browser that a replay with a recorded energy change gives the same songs.
- [x] 4.4 Update `docs/CONTEXT.md`, `AGENTS.md` (new check script) and `DEVLOG.md`; verify the commands run as written.

## 5. Integration

- [x] 5.1 Run the radio for at least 30 minutes with three styles and chaos 1, with the check script measuring levels and errors at every song change; verify no evaluation or page error and levels in the usual range.
- [x] 5.2 Run `npm run check:code`, `npm run check:songs`, `npm run check:endless`, `npm run build` and the level check of the built-in songs; verify all pass before merging into `develop`.
- [ ] 5.3 Hand the radio to the owner to try, and record the feedback in `DEVLOG.md` and issue #22.
