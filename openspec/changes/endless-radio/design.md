# Design

## Context

- **Director** (`endless-director`): `generateSession(recipes, options)` in `src/endless/director.js` returns every song of a session at once. It is pure and deterministic, with named seeded streams consumed song after song. Recipes are read from `styles/` by Node tools only.
- **Player** (`src/main.js`): one Strudel editor; `playSong(sg, bar, mode)` loads the code of a bar and sets `scheduler.lastEnd`; the `transport()` loop sets the tempo per bar from `song.meta.bpm`, runs `liveBuild()` for songs with steps (typing animation, evaluation just before the step's bar) and stops at `meta.bars`. Modes today: `track` (the song open in Compose) and `free` (a song played from the library).
- **Layout** (`index.html`): the stage (`#stagewrap`, with the comment overlay `#say`) sits above every tab; the editor (`#edhost`) sits next to the tabs. Tabs are sections shown by `showTab`.
- **Phase 0 experiment**: Strudel keeps time beyond cycle 5000, and lanes written as `<0!N 1!M>` play correctly at large offsets.
- **Library**: the user's own songs are stored in the browser; built-in songs come from `songs/`.

## Goals / Non-Goals

**Goals:**
- One continuous stream with seamless song changes, using the existing live build engine and compiler unchanged.
- The radio produces the same songs as the command line for the same seed and options.

**Non-Goals:**
- Crossfades and morphs (#23), steering buttons, tempo and key lock (#24), agents and live voice (#25), MCP (#26), continue a Compose song in the radio (#29), audio recording (#30), studio visual (#28).

## Decisions

**1. Incremental director: a session object that makes one song at a time.**
`createSession(recipes, seed)` returns an object with `next(options)` that generates the next song with the options given and keeps the streams and the variety history between calls; `generateSession` becomes a loop over it, so the command line output and the seed fixtures stay identical. Alternative: generate a whole session ahead and regenerate on every control change; rejected because a change would rewrite songs already announced, and generation time would grow with the session.

**2. The stream is one absolute timeline of bars.**
Each song gets a start bar on the stream (the end of the previous one). The radio plays a "window song": the song on air and the next one, joined like `--join` does, preceded by a silent offset so its bar numbers equal the stream's absolute bars. Lanes then read `<0!offset 1!n ...>`, which the phase 0 experiment showed to work. When a song ends, the window moves: the finished song leaves, a new next song is generated and joined. Alternative: restart the scheduler at bar 0 for every song (simple, but a gap and a restart at each change, and it breaks the later crossfades of #23). Alternative: one ever-growing joined song (code and memory grow with the session).

**3. A third player mode, `radio`, in the existing transport.**
The radio uses `playSong`, `liveBuild` and the tempo map like the other modes, with a playable object built from the window song. The transport, in radio mode, moves the window instead of stopping at the end, and on the first bar of a new song updates the "now playing" card and the history. Code for a bar is computed per window, so the editor shows the song on air and the typing animation works across a song change (the next song's first step is typed during the last bar of the previous one). Starting Compose playback stops the radio and the other way round, because they share the one editor and scheduler.

**4. Recipes in the browser through the bundler.**
The radio loads `styles/*.json` with `import.meta.glob`, as songs are loaded today, and validates them with the recipe validator; invalid recipes are left out with a console warning.

**5. Generation off the beat.**
The next song is generated right after a song starts on air, in an idle callback, so it never coincides with a step evaluation. A generation takes well under a second today; if it ever becomes slow, it can move to a Web Worker because the director is pure.

**6. Controls apply from the next song; the recipe records them.**
The session recipe is `{ seed, options, changes: [{ song, options }] }`. Replay walks the same `next(options)` calls with the recorded options, so the same songs come out. "Skip" moves the window to the next song at the next bar without generating anything new for the skipped one, so the following songs do not change.

**7. History and save use the existing library.**
The history (last 50) is a list in browser storage with each song's full JSON, so any entry can be saved or opened without regenerating it. "Save" adds the song to the user's library with the same path as saving a song in Compose; "open in Compose" stops the radio and loads it like a library song.

**8. Layout.**
Stage on top (shared), then a two-column area: controls on the left, "now playing" card on the right (one column on narrow screens), then the code panel (the existing editor shown in the radio tab, collapsible), then the history. The "on air" state shows on the start button. The studio visual and its on-air light are a later issue (#28).

## Risks / Trade-offs

- [Window code at large offsets gets long lane strings] → Lanes are written with run lengths (`0!5000`), which stay short; checked by the phase 0 experiment. A test plays a window at an offset above 5000 bars.
- [Song change while the typing animation runs] → The next song's first step is typed in the bar before the change, as any other step; covered by a browser check of three consecutive changes.
- [Browser storage fills with 50 full songs] → A generated song is a few kilobytes; 50 songs stay well below the storage limit. Entries are dropped oldest first.
- [Tempo change between songs] → The tempo map is per bar, so the new tempo starts on the new song's first bar; a jump is audible, as planned until transitions (#23).
- [Determinism drift between radio and command line] → One code path (`createSession`) for both, and a check that compares the first songs of the radio with the command line for a fixed seed.
