# Tasks

Estimate: about 25 agent hours (22 to 30), in the order below: the stage layer with styles, size modes and the audio safety check (about 8 h), the "Stage videos" folders (about 4.5 h), the Decode track video (about 3 h), the session video (about 1.5 h), the fast video and fragments with the speed work (about 6 h), strings, Guide, docs and final checks (about 2 h). The owner's rough expectation was 20 to 26 h; the fast video's optimisations (design D13) add about 1.5 h to a plain single pass. Start after `decode-library` and `fix/91-library-silent-video` are merged (group 3 needs the silent clock). Each group ends with a short run in the app (dev server in the worktree: `BROWSER=none npm run dev -- --port 5251 --strictPort`).

## 1. The stage layer, render styles, size modes and audio safety (about 8 h)

- [x] 1.1 A test video made by the repo: `tools/make-test-video.mjs` writes a few seconds of numbered, coloured frames (WebM and MP4 with an audio tone, plus a 9:16 and a silent one) into git-ignored `.cache/stage-video/`, made by the app's own drawing, no third-party content (about 0.5 h).
- [x] 1.2 `src/music.js`: `['video', 'Video']` in `LOOKS`, `RENDER_GAIN.video`; `src/song/validate.js` warns for a song look `video`; `src/main.js` `songLook` keeps Video when chosen (D1); the radio look accepts Video (about 0.5 h).
- [x] 1.3 `src/visuals/stage-video.js`: the one muted `<video>` element (D6), sources by D3 (a test hook for a file until group 2), the time rules (D4: the track video follows the file time with drift correction; a stage video starts at 0, loops natively, pauses with the music, never seeks), the shuffle bag and the song change (D5), the visibility rule and the release after the grace (60 s hidden, 30 s after another look, D9), `frame()` → element or null (about 2.5 h).
- [x] 1.4 Pure helpers with a Node check (`npm run check:stage-video`): `videoRect` for Fill, Fit and Stretch (D7), the video time for track and stage videos, the shuffle bag (each once, no repeat in a row), the export's seeded pick (D5) (about 1 h).
- [x] 1.5 `src/visuals.js` `paint`: the Video look draws the frame by D7 (bands in the theme's background), no flash, the fallback look by the app's normal rule (`fallbackLook()`, D2), the layer and the pass as for scenes (D8); the "Allow stage videos" chip beside the render menu (about 1 h).
- [x] 1.6 Browser check `tools/check-stage-video.cjs` (first part): the look in the menu and after a reload, fallback (a song with and without its own look) and chip, every render on the video (pictures in neon, hardware and light, 16:9 and 9:16), Fill and Fit, muted (master levels equal to Palco), pause and seek, every hidden case of D9 (background tab, scrolled fully and half away, full-screen code, Soul display), the 60 s and 30 s graces, a return after the release with the fallback look until the first frame and the stage video starting from 0; an app window visible on a second screen counts as visible; a seek in the song leaves a stage video alone; measure a paused element's memory and the reopen time (test files and a 4K file) and confirm or adjust the graces (D9); measure Normal draw time, each pass time and the heap over 20 song changes against D9's targets; tune `RENDER_GAIN.video`; write the numbers in the DEVLOG (about 1.5 h).

- [x] 1.7 Audio safety (D9b): seek limit, release in idle time, next file opened a bar ahead when the next song is known; `tools/check-stage-video.cjs --only audio`: long tasks and "too late" lines during 10 look switches, 20 radio song changes and 5 hides with Video against the same run on a scene look, CPU slowed 4 times; fails on more "too late" lines or a video long task over 50 ms (about 1 h).

## 2. The "Stage videos" folders (about 4.5 h)

- [x] 2.1 `src/decode/folders.js`: `pickerId` option for `pickFolder`, `accept` option for `scanFolder`; Decode unchanged (`npm run check:decode-library` passes) (about 0.5 h).
- [x] 2.2 `src/visuals/stage-video-store.js`: IndexedDB `coding-misk-stage-videos` (`folders`, `files`), quiet failures, handles and names only (D10); Node check on a fake IndexedDB (about 1 h).
- [x] 2.3 `src/settings/settings.js`: the "Stage videos" card (list, Add folder, Allow access, remove with confirmation, counts, Fill, Fit or Stretch, the note without folder access); `coding-misk-stage-video` in the backup (size only), reset clears the folders (about 1.5 h).
- [x] 2.4 Wire the folders into the layer: scan rules (on add, on card open, once per session on first need), permission from the card and from the stage chip inside the click, skipped files with one note (about 1 h).
- [x] 2.5 Browser check with fake folders in the origin private file system (as `check-decode-library.cjs`): add two folders, duplicate, hidden subfolder, reload and one click, denied, no folder picker, 400 px and the three themes (about 0.5 h).

## 3. The Decode track video (about 3 h)

- [x] 3.1 Track video source (D3): the Decode file when the track counts as the player and `probe` finds a video track; the time from `decodeTab.fileNow()`; the last frame past the picture's end; Previous, Next and Autoplay's hand-over change the picture (about 1.5 h).
- [x] 3.2 A video without sound on the silent clock (from `fix/91-library-silent-video`) shows its picture for its length (about 0.5 h).
- [x] 3.3 Browser check: a video file in Decode (seek within 0.25 s, pause, Next to an audio file shows a stage video), a video without sound in a mixtape, another look decodes no picture, the master output equal with and without Video (about 1 h).

## 4. The session video (about 1.5 h)

- [x] 4.1 The needed rule keeps the video for a recording whose layout draws the stage and for a live output view that draws it, and not for a view without the stage (D9, D11); the target canvas draws the video at the video's size (about 0.5 h).
- [x] 4.2 `tools/check-video.cjs` cases: a session video with a stage video in LED, the stage scrolled away while recording, the Decode real-time export of a video file; files checked with ffprobe (picture changes, one audio stream) (about 1 h).

## 5. The fast video and fragments (about 6 h)

- [ ] 5.1 `src/export/fast-video.js`: optional awaited `prepareFrame(t, cyc, index)` before each `drawFrame`; exports without it unchanged (`npm run check:export` passes) (about 0.5 h).
- [ ] 5.2 `src/video/stage-video-frames.js`: per part, the file (Decode file or seeded stage video, WYSIWYG for the open song), permission inside the export's click, mediabunny `Input`, `CanvasSink` on the primary video track, the video time per frame (D12) (about 1.5 h).
- [ ] 5.3 The speed work (D13): times streamed in loop order to `canvasesAtTimestamps`, decode size by render (stage area for Normal and CRT, twice the work picture for 1-bit, LED, ASCII, Terminal), frame reuse by frame index, the loop cache within 256 MB, one sink at a time; the export log line (decode size, cached or not, frames reused) (about 1.5 h).
- [ ] 5.4 `src/visuals.js` `drawAt({ video })`; `src/main.js` `exportVideoFastIn` wiring; the direction offers `fixed:video`, the cycles and a fragment's "random" skip Video; fragments use the song time (about 1 h).
- [ ] 5.5 Browser check: two exports give identical frames, the audio equals the export on Palco, a fragment's frames equal the full export's at the same times, an undecodable file falls back with the log line; the time ratio against Palco in Normal and LED at 1080p30 reported with the load average (a warning above 2×, above 1.5× in Normal, never a failure), a slow export (4K source at 1080p60, CPU slowed) that completes with the progress reaching the end and the time left following the real rate and a 1080p60 export reusing frames; write the measurements in the DEVLOG and `docs/knowledge/decisions.md` (about 1.5 h).

## 6. Strings, Guide, docs and final checks (about 2 h)

- [ ] 6.1 Italian and English strings; Guide lines for the Video look and the card (`npm run check:guide`) (about 0.5 h).
- [ ] 6.2 `docs/knowledge/visuals.md`, `settings.md`, `export.md`, `decisions.md` (the rejected multi-pass export, the speed target), `npm run knowledge` and `npm run check:knowledge`; `docs/ARCHITECTURE.md` (about 1 h).
- [ ] 6.3 Final run: `npm run check:render-styles`, `node tools/check-render-styles.cjs`, `npm run check:video`, `node tools/check-video.cjs`, `npm run check:clips`, `npm run check:decode-library`, `npm run build`; DEVLOG entry (about 0.5 h).
