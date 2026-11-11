# Design

## Context

See proposal.md. Pointers checked on `feat/44-themed-checks` at 6ae99cf:

| What | Where |
| --- | --- |
| Looks, the pickable list, hidden looks, render gain per look | `src/music.js` `LOOKS`, `PICK_LOOKS`, `HIDDEN_LOOKS`, `RENDER_GAIN`, `RENDERS`, `NATIVE_RENDERS` |
| The look chosen and remembered (`coding-misk-look`), a song's own look, the radio's look (`coding-misk-radio-look`) | `src/main.js` `setLook`, `songLook`, `#looks` and `[data-look-step]` handlers |
| One picture of the stage: the look, the flash, the render pass, the layer | `src/visuals.js` `paint(look, cyc, dt, playing, r)` |
| The fast video's frame | `src/visuals.js` `drawAt({ now, cyc, look, feed, render, light, density })` |
| The video target (session video and fast video draw the scene at the video size) | `src/visuals.js` `setTarget`, `showTarget` |
| Render passes on any canvas, work pictures scaled down on the GPU, budget, light form | `src/visuals/render-styles.js` `createRenderer().apply`, `grab`; `src/visuals/density.js` |
| Session video (real time): the stage canvas recorded with the master audio | `src/video/video.js` `createVideo`; `visuals.setTarget` while it records |
| Fast video: audio offline in blocks, a synchronous `drawFrame` per frame, mediabunny `CanvasSource` | `src/export/fast-video.js` `renderVideo`; `src/main.js` `exportVideoFastIn` (`lookFor`, `fragLook`, `parts`) |
| Video direction (`visual`: stage, song, `fixed:<look>`, song-cycle, section-cycle) | `src/settings/settings.js` `setVidVisual`; `coding-misk-video` |
| Fragments (look: song, random, one look) | `src/main.js` fragments (`fragLook`, `pickOf`), `src/video/fragments.js` |
| Decode folders: picker, permission inside a click, scan, file by path | `src/decode/folders.js` `pickFolder`, `permission`, `scanFolder`, `fileAt`, `VIDEO_EXT` |
| Decode library storage (handles and names only) | `src/decode/library-store.js` (`coding-misk-decode-library`) |
| Probe of a file with mediabunny (video track, duration) | `src/decode/input.js` `probe` |
| The file time heard in Decode | `src/decode/sync.js` `createOriginal().now`; `decodeTab.fileNow()` in `src/main.js` |
| The Decode track counts as the player | `src/main.js` (`decodeTab.open && (mode === 'decode' \|\| decodeTab.playing)`) |
| Decode exports (fast and real time) | `src/main.js` `exportDecode`, `exportDecodeReal`, `dec.job` |
| Video without sound in Decode (silent clock, placeholder code) | branch `fix/91-library-silent-video`, decode-library design D4 "Applied" |
| Backup of `coding-misk-*` keys | `src/settings/backup.js` |

The stage rule in `docs/knowledge/visuals.md` says a frame depends on the bar and the levels only, never on wall time, so the live player, the fast video and the checks draw the same thing. This design keeps that rule in the exports (the video's time is a function of the song's time) and for the track video; live, a stage video plays on its own to avoid seeks (D4).

## Goals / Non-Goals

**Goals:**

- Video as one more look, with every render style, the code over the stage, the widgets and the captions on top.
- The live stage and the exports show the same video at the same moment of the song.
- The browser stays light: nothing loads while Video is not on screen, one decoder at a time, released on hide.
- No new audio path: the stage never plays a video's sound.

**Non-Goals:**

- Video editing (trim, crop, colour), mixtapes or setlists of videos, a video stored in a song.
- Alpha video or layered exports.
- Network sources.

## Decisions

### D1. Video is a look

`LOOKS` gets `['video', 'Video']` (the same word in both languages). It is in `PICK_LOOKS`, so the menu and the arrows reach it, and `setLook` stores it in `coding-misk-look` like any look. Palco stays the default. A song file never carries `video` as its look: the validator warns, and a song's own look is ignored when it is `video`. While the user has chosen Video, opening a song with its own look does not replace it (today `songLook` would overwrite the stored look and the preference would be lost); with any other look chosen, the song's own look applies as today. The radio's look may be Video. The soul override still wins over every look.

The video look draws no beat flash (a flash over real footage reads as a glitch); the scene looks keep theirs. `RENDER_GAIN.video` starts at 1.2, below the default 1.5, because footage is brighter than the dark scenes; task 1.6 tunes it by measurement.

### D2. The fallback: the app's normal look

`stageVideo.frame()` returns a picture or `null`. On `null`, `paint` draws the look the app would show without Video, by the app's normal rule: the open song's own look when its file names one (`T.look`, the same value `songLook` would apply; in the radio the on-air song's, in Decode none), else the default look, Palco. A `fallbackLook()` in `src/main.js` gives it, and `getS()` passes it to `paint` beside `look`. The look stays `video` in the menu and in storage; the frame the video comes back (folder added, access granted), the stage shows it with no new choice. The fast video uses the same rule per part (the part's song look, else Palco). Nothing to show means: no track video and no stage video folder; every folder waiting for access; no playable file found; or the current file failed and none other is playable. While it falls back because of access, a small chip "Allow stage videos" shows beside the render menu; one click asks the browser's permission for every waiting folder (inside the click, as in Decode) and then the video shows. A file that fails to open is skipped for the session and the next one is tried; a note says so once.

### D3. Sources and their order

1. *Track video*: while the Decode track counts as the player (open in Decode or playing) and its file has a video track (`probe(...).video`), the stage shows that file's picture. It also covers a video without sound, which plays on Decode's silent clock.
2. *Stage videos*: else, a file from the "Stage videos" folders.

There is no setting to choose the source: the track video always wins while it exists (owner, 11 November).

### D4. Time: live free-running, exports by the song

- **Track video, live and in exports:** the frame at `decodeTab.fileNow()`, the file time heard (clamped to the video's length; past its end the last frame stays). It is the same file's picture, so it follows the track: the element plays at rate 1 with the track and pauses with it; a drift over 0.25 s, a seek, Previous, Next or a hand-over set `currentTime`.
- **Stage video, live** (owner, 11 November: simpler, fewer seeks, less risk for the audio): the element starts at 0 when the song's pick opens, loops on its own (`loop = true`), pauses when the music pauses and plays on from there. No drift correction and no seek: a seek or a skip inside the song leaves it alone, and a stage video that comes back after its release starts again from 0. A new song opens its file at 0.
- **Stage video, exports:** `songSeconds mod duration`, where `songSeconds` is the time since the start of the part's song (`tempoClock(bpm).seconds(cycle - partStart)`), so two exports give the same frames and a fragment matches the long export. The live stage and an export therefore show the same file but not the same frame at a given moment; the owner accepted this. The session video records the live stage as it is.

### D5. One video per song

A song change is: another song opened or started in Compose, the next playlist item, the next on-air song in the radio (its number in the stream), the next Decode track (a Decode track that is not a video file uses the stage videos). At each change the layer picks the next video from a shuffle bag: every playable file of the folders once, in a random order, before any repeats, and never the same file twice in a row when there are two or more. The bag lives in memory for the session and is rebuilt when the folders change. The pick never changes within a song; the video loops by D4.

Exports pick by a seed instead, so two exports give the same frames (the render-styles requirement "Same frame in every output"): the file for a song is `files[hash(songId + '/' + part + '/' + folderSignature) % files.length]` over the files sorted by folder and path. A fast video of the song open on the stage, started while Video shows a stage video, uses that same file for that song, so the export matches what the user sees (WYSIWYG); the other songs of a session take the seeded pick.

### D6. Always muted

The live element is created with `muted = true`, `defaultMuted = true`, `volume = 0`, `playsInline`, and is never connected to Web Audio. The fast video only reads video samples (mediabunny's video track sinks); it never opens the audio track. Files with sound are allowed. Decode's own audio of a video file keeps its path (the decoded original); the stage element adds no second sound. Measured in task 1.6: Chrome still decodes the audio track of a muted element (`webkitAudioDecodedByteCount` grows), off the main thread and never heard; a page cannot switch that off for a plain `<video>` (the audio track list is not in stable Chrome), and a picture-only pipeline (Media Source with the video track alone, or WebCodecs for the live stage) would add a demuxer in the page for a few kilobytes of audio decoding. The spec says so: the live element may decode the audio inside the media pipeline; the exports never do.

### D7. Size modes

`Fill` (default) scales the picture to cover the stage area and crops the overflow, centred. `Fit` scales it to fit inside and fills the bands with the theme's background (`--bg` of neon, hardware or light, read once per theme change). `Stretch` (owner, 11 November) scales the whole picture to the stage area without keeping its proportions: no crop, no bands. One pure function `videoRect(srcW, srcH, dstW, dstH, mode)` gives the source and destination rectangles for the three modes (checked in Node). The mode is in the "Stage videos" card and in the backup (`coding-misk-stage-video`, `{ size: 'fill' | 'fit' | 'stretch' }`); `fill` is not stored. The bands are part of the frame, so the render passes treat them like any dark area.

### D8. Rendering

The video picture is drawn as the look's drawing in `paint`: `cx.drawImage(source, ...videoRect(...))`, with `source` the `<video>` element live or a decoded canvas in the fast video. Then the stage widgets layer (strip, before the pass in 1-bit, CRT and LED; natively after it in ASCII and Terminal), then the render pass exactly as for a scene look, on the canvas drawn. No render code changes: the pass reads its own low-resolution work picture (`grab` scales on the GPU and reads back only the small picture: at most 1.2 million pixels for 1-bit, a few thousand cells for LED, ASCII and Terminal), so the styled renders never read the full-size video frame on the CPU. Normal costs one GPU blit. The canvas is never tainted: the source is a local file through an object URL.

### D9. Light browser

- One `<video>` element for the whole app, created on first need, never in the DOM, `preload = 'metadata'` until it must show.
- It holds a source only while the video is *needed*. *Needed* = the look is Video and either the stage is not hidden, or a session video records a layout that draws the stage, or the live output window is open on a view that draws the stage (its stage area above zero opacity).
- *Hidden*, in terms of the real app (`stageHidden()` in the layer, re-evaluated on each event below):
  - the page is hidden, as the Page Visibility API reports it: `document.hidden` (`visibilitychange`), true when the app's tab is not the active tab of its window, when the window is minimised, or when the browser reports the window fully covered by other windows. An app window that stays visible on a second screen while the user works in another window is **not** hidden: the video keeps playing. When the page is hidden the stage itself stops drawing (`requestAnimationFrame` does not run in a hidden page; only the live output's `pump` draws it then), so a video kept playing there would not be seen;
  - the stage is scrolled fully out of view (`IntersectionObserver` on `#stagewrap`, `isIntersecting === false`; partly on screen counts as visible);
  - the full-screen code panel covers it (`#codecol.full`, the "code full" button and Escape in `src/main.js`);
  - the Soul display overrides the stage's look (`soulOverride`).
  The app has no control that closes the stage (the stage row is always in the page); these four are the ways it leaves the screen. Full screen of the stage itself is visible.
- **Rejected for now: a "keep the video alive in the background" setting.** With the page hidden the stage does not draw, so a playing video there is pure cost; the cases that need the picture while the page is hidden (a recording, the live output window) already keep it (see *Needed*). It stays a possible future option if a use appears that the needed rule does not cover (for example a capture program reading the page itself).
- **Grace before release** (owner, 11 November: what performs best, a short wait on return is fine). When the video stops being needed, the element pauses at once and keeps its source: 60 seconds while the stage is hidden, 30 seconds after the user picks another look. Then it releases the decoder (`removeAttribute('src')`, `load()`) and revokes the object URL. Why 60 s rather than 5 s: a paused element costs almost nothing (no decoding runs, the browser keeps one decoded frame and a small buffer, a few MB for 1080p), and resuming it is instant (`play()`; a track video adds at most one seek), while reopening costs a file read, a demuxer start and a seek to a key frame (hundreds of ms on a long-GOP file) and a gap on the stage. Most hides (a glance at another tab, the code full screen for a while) are shorter than a minute. Picking another look is a clearer sign of leaving, so its grace is shorter. Task 1.6 measures the paused element's memory and the reopen time on the test files and on a 4K file; the two values are constants in `stage-video.js` and change only if the measurement says so (for example, if a paused 4K element holds more than about 50 MB, the hidden grace drops to 30 s).
- **Loading in the background.** Opening a file (a switch to Video, a song change, a return after the release) never blocks a frame: `handle.getFile()`, the object URL and `src` are asynchronous, and `frame()` returns `null` until the element has its first frame (`loadeddata`, or `requestVideoFrameCallback` where available). A stage video starts at 0 with no seek; only a track video seeks, to the file time heard. Meanwhile `paint` draws the fallback look (D2), so a switch from a scene look to Video keeps the scene until the first frame is ready; a few seconds are acceptable.
- One file at a time: a song change revokes the old URL before it opens the next file. No look other than Video ever opens a file.
- Folders are scanned when added, when the card opens and once per session when Video first needs them; the scan reads names, sizes and dates, never bytes. Durations come from the element's metadata live, and from mediabunny's header read in exports.
- The fast video decodes with mediabunny `CanvasSink` (on the primary video track) at the stage area's size, never at the file's size (a 4K file decodes to a 1280 × 720 canvas for a 720p stage area), with a small canvas pool (`poolSize: 2`). One sink at a time; it is closed at each part change and at the end.
- Measured targets (task groups 1 and 5): Normal video draw at most 1.5 ms median per frame on a 1080p stage; each render pass on the video within the existing budget (at most 4 ms median at a 1080p target, CRT at most 2 ms); with the Video look on for 10 minutes and 20 song changes, the JS heap within 30 MB of a scene look and no growth across changes; one media element and no open object URL after the grace (D9); the fast video's target is in D13.

### D9b. Video work never disturbs the audio

Rule: loading, seeking, decoding, drawing or releasing a video, and the folder scan, must never disturb the music. How:

- Decoding runs in the browser's media pipeline, off the main thread; the main thread only sets `src`, `currentTime`, `play()` and `pause()`, all asynchronous, and draws one frame per stage frame (a GPU blit, D8).
- A stage video never seeks live (D4). The track video's seeks are rate-limited: at most one in flight, a new target replaces a pending one, never more than one seek every 250 ms.
- The release (`removeAttribute('src')`, `load()`, `revokeObjectURL`) runs in an idle callback (`requestIdleCallback`, with a 2 s timeout), never in a frame.
- The folder scan already yields every 100 entries (`scanFolder`); the stage scan runs in idle time, and the shuffle bag is rebuilt from the stored index, not by a scan, at a song change.
- A song change asks for the next file a bar before the song starts when the next song is known (radio, playlist, Autoplay), so the open overlaps the end of the current song instead of its first beat.

Measured by `tools/check-stage-video.cjs` (`--only audio`): with a `PerformanceObserver` for long tasks and a count of the scheduler's "too late" console lines, the same scripted actions run once on Pixel/Palco and once with Video: 10 switches between Pixel and Video while a song plays (files loading each time), 20 radio song changes with Video, 5 hides and returns across the grace, with the CPU slowed 4 times as in the other lag checks. The check fails when the Video run logs more "too late" lines than the scene run, or when a long task over 50 ms has video work in its attribution or falls within 100 ms of a video load, seek or release and has no match in the scene run.

### D10. Stage videos storage

A small IndexedDB `coding-misk-stage-videos` (stores `folders`: `{ id, name, handle, added, count, capped, scanned }`; `files`: `{ folderId, path, name, size, modified }`), apart from the Decode library so the two lists stay independent and the Decode database needs no upgrade. It holds handles and names only, never bytes. `folders.js` gains two options: `pickFolder(known, { pickerId })` (the stage uses `coding-misk-stage-videos`, so the picker remembers its own start folder) and `scanFolder(dir, { accept })` (the stage passes `isVideo`). The cap stays 2000 files per folder. The folders are not in the settings backup (handles cannot be serialised), like Decode's folders; the backup carries the size mode.

### D11. The session video

Nothing new records: the session video draws the scene into the video target through `paint`, so the Video look appears in it with its render, the code, the widgets and the captions. While it records, the visibility rule of D9 counts the stage as visible, so hiding the stage or switching tabs does not drop the video from the file. The "Whole tab" layout captures the page as it is. The Decode real-time export plays the track from its start; the track video follows `fileNow()`.

### D12. The fast video, single pass

`renderVideo` gets an optional `prepareFrame(t, cyc, index)` awaited before each `drawFrame` (the frame loop is already async between frames). For the Video look, `src/video/stage-video-frames.js`:

1. before the frames, resolves each part's file (D3, D5): the Decode file for a decoded track, else the seeded stage video; asks folder permission inside the export's click; opens a mediabunny `Input` on a `BlobSource`, its primary video track, its duration;
2. per frame, computes the video time (D4: the file time for a track video, `songSeconds mod duration` for a stage video) and gets the canvas from a timestamp-driven iterator (`CanvasSink.canvasesAtTimestamps` over the frame times, which decodes forward and seeks to a key frame on a loop or a part change; `getCanvas(t)` as the fallback; `VideoSampleSink` when a raw `VideoSample` is needed);
3. hands it to `visuals.drawAt({ ..., video: canvas })`, which draws it by D7, then the layer and the render pass by D8; then `composeAt` or `composeVertical` draws the code, the widgets, the captions and the card over it as today. The audio path is not touched.

When the look of a frame is not Video (cycles, other parts), no file is opened. When a part's file cannot be decoded, its frames use the fallback look (D2) and the export log says so. Fragments use the same step: a fragment's video time is its song time, so a fragment matches the same moment of the long export. The direction's "song-cycle" and "section-cycle" and the fragment's "random" look never pick Video (it would need files the viewer did not choose); `fixed:video` and a fragment's look "Video" are offered.

**Rejected: multi-pass export** (render the stage as a transparent layer, render the video separately, composite later). Alpha video is poorly supported in browsers (VP9 with alpha only in some encoders, H.264 has none, decoding alpha back is uneven), so the layer would need a lossless intermediate; every extra encode and decode loses quality and time, and the final composite is a third full pass over every frame; and the render style must apply to the composite (the video and the scene together), so a styled layer plus a styled video would be styled twice, or the style would have to run in the compositor, which is the single pass again.

### D13. Fast video speed with Video

The owner accepts a longer fast export when the stage visual is Video, with every cheap optimisation used.

**Target (not a limit): a fast export with Video should take at most 2× the time of the same export on Palco** (same song, quality, render and layout), and should stay faster than real time at 1080p30 on the owner's machine. The export never fails or stops because it is slower: a 4K source, a busy machine or any other cause only makes it longer, and the file is complete. The progress and the time left stay honest: the frames phase already counts frames drawn (`drawn / frames` in `renderVideo`), so a slower decode moves the bar more slowly, and the time left is computed from the measured rate, never from the target. Reasoning: today a frame costs about 5 ms to draw (the estimate `cwRealScopes` uses) plus its encode, and the audio render is a fixed share of the export. A hardware decode of a 1080p H.264 frame through WebCodecs costs about 2 to 4 ms, its conversion to a canvas about 1 to 2 ms; at most one decoded frame per exported frame roughly doubles the frame part in the worst case and leaves the audio part unchanged, so 2× is a safe ceiling. A styled render decodes smaller pictures (below), which should land near 1.3×. The browser check reports the ratio per render with the machine's load average and warns above 2× (and above 1.5× in Normal); it never fails on time. This is the cleanest form: a time limit as a failure would make the check flaky on a loaded machine and say nothing about the code, while the warning with the load beside it keeps the regression visible. Correctness (identical frames, the audio unchanged, the fallback) still fails the check.

Optimisations, in order of weight:

1. **Sequential decoding in loop order.** The frame times are known in advance, so the sink gets them as one ordered stream (`canvasesAtTimestamps`): the decoder runs forward from key frame to key frame and never seeks per frame. It seeks only at a loop wrap (back to time 0, a key frame) and at a part change.
2. **Decode at the size the frame needs.** Normal and CRT: the stage area's size in the export, never the file's. 1-bit, LED, ASCII and Terminal: twice the render's work picture (`passSizes` of the frame), capped by the stage area, since the pass reads only that picture; the frame drawn is scaled up on the GPU before the pass, which samples it down again. A 1080p export in LED therefore decodes about 640 × 360 pictures.
3. **Reuse frames when the export's rate is higher than the video's.** A 60 fps export of a 30 fps file maps two frame times to the same video frame: the frame index `floor(videoTime × videoFps)` is compared with the last one decoded, and the same canvas is drawn again without asking the sink.
4. **Cache a short loop.** When the whole loop fits a memory budget of 256 MB (frames = `min(videoFps, exportFps) × duration`, bytes = frames × decode width × decode height × 4), the first pass through the loop keeps its frames as `ImageBitmap`s and later loops draw them with no decoding. Example: a 10-second loop decoded at 640 × 360 for LED is 300 frames, about 276 MB at 30 fps, just over the budget, so it is not cached; the same loop at 15 fps, or an 8-second loop, is. Over the budget, no cache: decoding stays sequential. The cache is dropped at a part change and at the end. A track video plays once (no loop), so it is never cached.
5. **One decoder, closed early.** One `Input` and one sink at a time, closed at part changes; the canvas pool (`poolSize: 2`) keeps memory flat.

The export panel shows the progress and the estimated time left as today (`fastJob.progress`, phases); the video's decoding is part of the frames phase, so the estimate includes it. The export log states the decode size, whether the loop was cached, and the frames reused.

### D14. Strings, Guide, themes

Italian and English strings for the look name, the card, the chip "Allow stage videos", the notes (no folders in this browser, a file skipped, nothing to show); a Guide card line for the Video look and one for the card (`npm run check:guide`); the card in neon, hardware and light, and at 400 px.

## Risks / Trade-offs

- [Seeking cost] Seeks stutter on long-GOP files. → Live stage videos never seek (D4); the track video seeks only over 0.25 s of drift and on user seeks; a native loop on a file with sparse key frames may show a short freeze at the wrap.
- [Live and export differ] A stage video live plays on its own, an export uses the song-time rule, so the same moment shows another frame. → Accepted by the owner for fewer seeks; same file, same look.
- [Codec support] `.mkv` and `.mov` may hold codecs the browser cannot play. → The file is skipped with one note; the scan still lists it (it is cheap), the bag drops it after the first failure.
- [Decode's own video] With the track video, the file is opened twice: Decode decodes its audio, the stage element decodes its picture. → Accepted: the audio buffer is already in memory; the element decodes only the picture, on the GPU.
- [Brightness in 1-bit and ASCII] Footage can wash out. → `RENDER_GAIN.video`, measured.
- [Export time] Decoding adds work to every frame of a fast export. → D13: at most 2× the export on Palco, sequential decoding, smaller decode sizes for styled renders, reused frames, a cached short loop; the progress and time left show as today.
- [Memory in long fast exports] A decoder per part. → One sink at a time, closed at part changes, canvases pooled.
- [Permission in exports] An export of a session may need folders not yet allowed. → The export's own click asks once; refused, those parts use the fallback look (D2) and the log says so.
- [Grace time] A paused element held for 60 s keeps a decoder and a few MB. → Measured in task 1.6; the constants change if the memory is higher than expected (D9). A return after the release shows the fallback look for a moment while the file reloads, as the owner accepted.

## Migration Plan

Additive. No stored value changes meaning. Users who never pick Video load nothing new. Rollback: remove the look entry; a stored `video` look falls back to Palco through the existing `PICK_LOOKS` test.

## Open Questions

None.

Answered by the owner (11 November): Stretch is a third size mode (D7); the video pauses at once when hidden and is released after a 60-second grace (30 seconds after picking another look), loads in the background on return, and never disturbs the audio (D9, D9b); no switch to prefer the stage videos over the track video (D3); the fallback is the app's normal look, not a fixed Palco (D2); the size mode only in the settings card (D7); the fast export's speed is a target, not a limit (D13).
