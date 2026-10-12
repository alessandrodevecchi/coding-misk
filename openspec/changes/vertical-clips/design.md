# Design

## Context

The fast video (#53) renders a song or a joined session block by block (`renderInBlocks`, 240 s blocks, 8 s lead in, crossfades) and draws each frame from the timeline into the video composer, which lays out stage, code, soul and song card for a horizontal frame (`layoutAreas`). A song is rebuilt from its JSON, a saved session from its recipe (seed, options, steering) through the radio's `rebuild`, so the same source always gives the same audio and picture. The block render always starts at time 0 and `job.cut` already ends a render at an exact time with a fade (#5).

## Goals / Non-Goals

**Goals:**
- Vertical extracts that match the long video second for second.
- Random extracts that land on good moments, repeatable from a seed.
- One API for the screen and for agents.

**Non-Goals:**
- Cutting while a live session plays (save first).
- Cutting an existing video file (the extract is rendered again, not cut from a file).
- 60 fps and 4K extracts (later, with #52's qualities).
- Editing the extract after rendering (titles, stickers, music swaps).

## Decisions

- **Rendered again, not cut from a file.** The source is rebuilt and only the asked stretch renders. It costs a render, but needs no long video on disk, works on any layout and keeps full quality. The alternative (cutting the long MP4) would need the file and could not change layout.
- **Start time in the block render.** `renderInBlocks` gains `job.start`: blocks run from `start` to `cut`, the first block still renders from `start - LEAD`, so notes, reverbs and delays are already sounding at the first frame. The output time is shifted to 0. A fade in of 0.3 s and the existing fade out (0.5 s) avoid clicks. The video's frame clock, code typing, voice lines and soul use the source time (`start + t`) so the picture matches the long video.
- **Vertical layouts are areas, like the horizontal ones.** `layoutAreas` gains vertical layouts for a w×h with h > w: `v-code` (stage 1080×960 above, code below), `v-soul` (stage above, soul below), `v-bands` (stage 1080×1080 in the middle, bands 420 px above and below), `v-soul-bands` (soul in the middle). The composer draws the bands with the app's fonts: the coding-misk logo above (the app's wordmark, drawn in canvas: "coding" in neon script over the chrome "MISK", with the small equaliser following the music); tagline and full-video line below. No artist names (the artists are invented); the song title only when turned on in the settings. The song card is off in vertical layouts. Scenes draw at a logical height of 720 scaled up, so a square or tall stage shows the middle of each scene; scenes that read badly when narrow are noted in the checks.
- **Picker scores bars, not audio.** Random extracts are chosen before any render, from the song structure: each bar scores by how many tracks play in it and by its section (drop, peak, chorus above build and verse, intro and outro last, the first and last 8 bars of a session excluded). A seeded draw picks starts on bar lines among the best windows, without overlap. Pure and checked in Node; the same seed, source, count and length give the same extracts.
- **Sources.** Songs (built-in and saved), playlist sessions, and the recipe JSON saved by the radio export (loaded with a file picker). The recipe of a radio export and its timeline both already carry what is needed to rebuild the same session and to know its times.
- **Output.** One MP4 (WebM fallback) per extract, named `<title> · <mm-ss>.mp4`, and `<title> · extracts.json` with `{ source, seed, layout, items: [{ start, end, title, artist }] }`. Extracts of one batch render one after another in the same hidden render pages flow as the fast export.
- **Settings and screen.** Settings → Video gains a Vertical part: layout, tagline, full-video line, default length. Song cards and playlist sessions gain an Extracts action opening a small menu: count and length, or from and to (mm:ss), a seed field, Start. Progress and cancel as the fast export.
- **Console API.** `globalThis.codingMiskClips = { extract({ source, n?, length?, from?, to?, seed?, layout?, bands? }) → Promise<{ files, items }>, sources(), job }`, `source` being a song id, a playlist session id or a recipe object. The menu calls the same function.
- **Name.** "Extracts" ("Estratti") in the interface, since "Clip" already names the exact-length new song of the radio export (#5).

## Risks / Trade-offs

- [Narrow stage crops wide scenes] → the vertical layouts keep a square or wider stage; the browser check screenshots every visual in each vertical layout.
- [A batch of many extracts takes time] → each extract renders only its stretch plus 8 s; progress shows the extract number; cancel stops the batch.
- [Picker misses the best moment] → "from a time to a time" covers exact choices; the seed field lets the listener draw again.
- [Sessions saved before a director change sound different] → the existing warning for sessions saved with another director version applies (#38).
