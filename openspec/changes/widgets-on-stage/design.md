## Context

Read on `develop` f80b167 (2026-10-29), after the change `code-widgets`. "Verified" means read in the code; the rest is inferred.

- **The stage** is one canvas (`#stage`). `startVisuals` in `src/visuals.js` paints one look per frame (`SCENE_DRAW[look]`) from `lv` (a 0..1 level per instrument), the onsets (`onset(k)`), the master wave (`wave`, 256 samples, the sum of every analyser) and the hook's wave. A video draws the same scene on an offscreen canvas at 720 logical pixels high (`setTarget`). Verified.
- **The fast video** calls `drawAt({ now, cyc, look, feed })`. The feed (`src/video/feed.js`) has levels per instrument made from the onsets of the timeline, the master wave and the hook wave. It has no notes and no wave per instrument. Verified.
- **Code widgets in the fast video** already draw without Strudel: `fastWidgets` (`src/video/widget-frames.js`) has painters for pianoroll, punchcard, spiral, pitchwheel (from the notes of a line, sent back by the render page as `wlines`) and for scope and spectrum (from a render of the instrument alone, or the whole song's wave as fallback, setting `realScope`). `scopePainter` and `spectrumPainter` in `src/live/widgets.js` draw the live scope and spectrum from the instrument's analyser. Verified.
- **Rule of the visuals:** a frame depends only on the bar and the levels, never on wall time, so the live player, the fast video and the checks draw the same thing (`docs/knowledge/visuals.md`). The palco look breaks it a little with `Math.random()` for the riser's sparks.
- **Looks reach every output through `LOOKS`** (`src/music.js`): the stage menu, the radio look, the video direction (`fixed:<look>`, `song-cycle`, `section-cycle`), the fragments' look and the live output, which draws the stage area of the app tab. Verified.
- **Strudel's full-screen functions** (`pianoroll()`, `scope()`, `spiral()` without `_`) draw on Strudel's canvas behind the whole page, mixed with the interface; they are not on the stage canvas and not in any video (analysis of 2026-10-26, verified then).
- **Owner decisions** (2026-10-27 and 2026-10-28): approach A first (done), approach B after it, on top of it and extended to the stage; full-screen widgets "ok, they go into the stage visual"; Hydra later with the stage visuals; colours tied to the theme or to the song's visual. 2026-10-29: "widgets on the stage can go ahead, in the end it is a visual".

## Goals / Non-Goals

**Goals:**

- Widget pictures of each track on the stage, in two new full-screen looks and as an optional layer over the other looks.
- One picture everywhere: stage, live output, session video, fast video, fragments.
- Reuse what code widgets built: the mapping and the settings, the painters, the per-instrument renders.
- No change to the sound, the growth, the levels or any fixture.

**Non-Goals:**

- Hydra, shaders, Strudel's full-screen functions, `wordfall`, `fscope`.
- Widgets written in the code for the stage (the stage reads the song; it adds nothing to the code).
- A change to the code widgets in the panel, or to the existing looks when the layer is off.

## Decisions

### D1. Approach B is the base

The stage draws with the app's painters, not with Strudel's widget functions. Reasons:

- Strudel draws on its own canvases (one per inline widget, one full-screen behind the page). The stage and the videos draw on one canvas per frame; copying Strudel's canvases works in real time only (as `drawCode` does), never in the fast video.
- The fast video already needs the app's painters (`fastWidgets`). One set of painters for every path keeps the live and the fast pictures equal.
- The painters take plain data (notes, a wave, a level), so a frame depends only on its time, as the rule of the visuals asks.

The painters move from `src/video/widget-frames.js` and `src/live/widgets.js` to one module (for example `src/visuals/widget-painters.js`): `roll` (pianoroll and punchcard), `wheel`, `spiral`, `scope`, `spectrum`, each drawing in a box `{ x, y, w, h }` of a given context with given colours. The code widgets in the fast video use the same module; their pictures must stay identical (checked).

### D2. The stage feed

One object per frame, the same shape live and in the fast video:

- `levels[inst]` and `onsets`: as today.
- `wave[inst]`: 256 samples per instrument. Live: `readAudio` already reads each analyser's data; it keeps a copy per instrument instead of only the sum (no extra analyser). Fast video: the per-instrument render of the code widgets when it exists, else the master wave scaled by the instrument's level (the fallback of `realScope`).
- `notes[inst]`: the haps of each instrument from 2 cycles back to 2 ahead. Live: queried from the playing pattern once per cycle and cached (not every frame), grouped by `analyze`. Fast video: the render page sends the notes per instrument with each block, like `wlines` per line today.
- `spectrum[inst]`: computed from `wave[inst]` at the frame's time. The scrolling history of a spectrum panel is rebuilt from the last columns' times, not from the previous frame, so a frame drawn alone is the same as in a sequence.

### D3. Full-screen looks

- **Monitor** (it: Monitor). A grid of panels, one per instrument chosen by D5, each with the instrument's name and widget kind (as in mockup 01), a level bar, the widget. The grid changes only at section boundaries, with a short fade (a quarter of a bar).
- **Monitor layouts** (owner's note on the counts, 2026-10-29: up to 6 panels, independent of the code widgets' maximum; 3 or fewer centred and bigger). `monitorLayout(n, W, H)` tries every column count and keeps the grid that gives each panel the most area, with panels between a width / height of 1.15 and 3 (0.75 to 3 on a tall stage), the last row centred and the grid centred; no empty cells. Result:

  | Panels | 16:9 | 9:16 |
  | --- | --- | --- |
  | 1 | one large panel, centred (at most 82% × 80% of the stage) | one large panel |
  | 2 | side by side | stacked |
  | 3 | two over one, the one centred | a column of three |
  | 4 | 2×2 | 2×2 |
  | 5 | three over two, centred | 2 + 2 + 1, centred |
  | 6 | 3×2 | 2×3 |

  On a wide stage the top keeps room for the readout and the look buttons (at least 9% of the height, up to 64 px).
- **Rullo** (en: Roll). One large piano roll across the stage: the melodic instruments (lead, arp, bass, pad, guitar) on one pitch axis, each in its colour, with a legend; the drums (kick, snare, hats) as punchcard lanes at the bottom; a playhead at the middle. A track with a scope or spectrum widget in the code shows notes here; this look has no wave.
- A third look with spiral and pitchwheel (Orbita) waits for the owner's tests of those widgets in the code; both are off by default there.

### D4. The layer over the other looks (next delivery)

- A setting, off by default, with three values: off, strip, Palco.
- **Strip:** small panels over the look that plays. Each panel has a dark see-through background, so the look stays visible.
- **Strip layout, decided 2026-10-29 for the next delivery** (the owner asked: centred, right corner, or two per side, up to 4). Three layouts were drawn over Tramonto and Palco (`notes/prove-2026-10-29/widget-palco/striscia-*.png`):
  - *Right corner stack*: rejected. It covers the right side, where Montagne and Edgerunners put their moon, the look buttons of the app and the code panel's side in the code videos; on a tall stage it leaves panels too narrow.
  - *Centred row at the bottom*: good on a tall stage and on looks with an empty floor (Tramonto, Montagne, Sonar), but it covers the bottom centre, where Palco's instruments and their labels and Pixel's car are.
  - *Two per side* (up to 4): **recommended on a wide stage.** The centre stays free, where almost every look puts its focus (the sun, the radar, Palco's LED wall, the typed comment of the live build); it is symmetric and fits the owner's 4. Panels about a fifth of the width and of the height each, stacked two per side around the middle; with 3 panels, two on the left and one on the right at the same top; 1 panel on the left.
  - **On a tall stage** (9:16 fragments, sides too narrow) the strip falls back to the centred row at the bottom, up to 3 in a row, 4 as 2×2.
  - The strip limit becomes 1 to 4, default 4 (it was 3).
- **Palco:** on the Palco look only, the panels fill its big screen above the instruments (mockup 04), up to 4. On other looks this value behaves as the strip.
- The layer is drawn after the look in `paint`, before the flash, so it is in every video and in the live output with the look.
- On the full-screen looks and on the soul the layer is not drawn.

### D5. Which instruments, which widget

- Default "same as code widgets": the slot order, the instruments switched on, the primary and secondary widget, the secondary share and "Widget notes" of the code widgets card. The stage does not need the code widgets option to be on.
- An instrument gets a panel when it plays in the section, or returns within the code widgets' return window (dimmed until then).
- The count: Monitor up to 6 (setting 2 to 6, independent of the code widgets' maximum, which is about the code panel), strip up to 4 (setting 1 to 4, D4), Palco up to 4. Unlike the code widgets, the count is not varied by the seed: the stage shows every playing instrument up to the limit.
- "Own" setting: the stage uses its own copy of the instruments section (on, primary, secondary), edited in its card.
- The choice is made per section from the song and the seed, the same in the live picture and the fast video.

### D6. Per-track reaction

- Border glow follows `lv[inst]`; an onset adds a short flash to the panel (`onset(k)` as the looks do).
- A panel whose instrument is silent now is drawn with the dimmed look of the code widgets (grey, see-through, dashed border); after the return window it leaves at the next section boundary. Setting "silent instruments": dimmed (default) or hidden.
- No `Math.random()` in the panels: noise and sparks come from the hash of the time, so frames repeat.

### D7. Colours

- One colour per instrument, from a fixed map of the theme (neon: pink kick, cyan bass and snare, yellow hats and guitar, green arp, violet pad, rose lead, orange fx; hardware: the amber and LED tones of `docs/DESIGN-SYSTEM.md`).
- Full-screen looks use the app theme, read once per theme change, not per frame.
- The layer uses the playing look's palette (`PAL[look]`: `wave`, `echo`, `grid`, `a`, `b`, `c`) so the panels match the scene. Setting "colours": automatic (as above, default), app theme, scene colours.

### D8. Scenes, live output, session video, fast video, fragments

- Nothing new to choose: the two looks are in `LOOKS`, so they appear in the stage menu, the radio look, the video direction (`fixed:monitor`, and in `song-cycle` and `section-cycle`), the fragments' look and the live output.
- Session video and live output draw the stage as today; the layer comes with it.
- Fast video: the feed of D2. The extra per-instrument renders are those of the code widgets; the stage asks for the instruments it shows with a scope or spectrum panel, under the same "Real scope and spectrum" setting (Automatic falls back to the master wave scaled by level, and says so in the export log).
- Fragments: Monitor lays its grid by the box's proportions (D3); the strip is placed in the stage box, so it shows in every fragment aspect. "Visual + code + widgets" scenes with a widget look may show the same instrument twice (stage and code); accepted (open question 6).

### D9. Settings

A card "Stage widgets" (it: "Widget sul palco"), next to "Code widgets", with collapsible sections (mockup 05):

- Over the scene: off, strip, Palco (default off).
- General: panels in Monitor (default 6), panels in the strip (default 3), instruments and widgets (same as code widgets, own), colours (automatic, app theme, scene colours), silent instruments (dimmed, hidden).
- Widgets: each kind on or off for the stage (spiral and pitchwheel off by default).
- Fast video: a pointer to the video setting "Real scope and spectrum".
- Saved in `coding-misk-stage-widgets`, in the backup, reset to defaults; English and Italian; a Guide card (`#48`).

### D10. Performance budget

Measured with the browser check on the owner's machine class, 1080p video target and the app stage:

- Layer: at most 1.5 ms per frame for 3 panels, 2 ms for the Palco screen.
- Monitor and Rullo: at most 4 ms per frame for the whole look (the heaviest current look is the reference; the new looks must not be slower than it).
- Notes queried once per cycle per instrument, cached; no pattern query per frame.
- Spectrum: a DFT of 128 samples per panel per frame at most (the fast video's `spectrumOf` size), or 64 bins.
- Fast video: no extra render beyond the code widgets' ones; total export time grows at most 10% with a widget look against the Palco look.
- Live output: one stage frame, as today; no second loop.

## As built (first delivery: phases 1 to 3, 2026-10-29)

- **Modules.** `src/visuals/widget-painters.js` (painters: `roll`, `wheel`, `spiral`, `scope`, `spectrumColumn`, `spectrogram`, `spectrumOf`; each draws in a box of the context it is given, with the colours it is given), `src/visuals/widget-palettes.js` (neon and hardware palettes, one colour per instrument; `scenePalette` for the layer), `src/visuals/stage-feed.js` (note store, live notes, panels per section, levels, flashes, silences, spectrum columns), `src/visuals/widget-looks.js` (`monitorLayout`, `drawMonitor`, `drawRullo`). A later render style (ASCII, dither, terminal) can pass another palette or another context, or post-process the box.
- **Levels, onsets, silences from the notes** (D6 refined): the panels read them from the notes of the feed (gain × velocity, drums decay, the others hold for the note), not from the analysers, so the stage and the fast video agree frame for frame. Live, the scope reads the instrument's own analyser (`readAudio` keeps each analyser's wave, no extra analyser).
- **Live notes:** one cycle at a time from the playing pattern, the window of the playhead first (up to three cycles a frame), then the rest of the section ahead (one a frame, up to 24 cycles); a new pattern drops the notes from the current cycle on. **Fast video notes:** the render page collects them from the haps it schedules anyway (no extra query) and sends them with each block (`stageNotes`). Checked note by note on luci-rosse.
- **Panels of a section:** the instruments with a note in the section, in the code widgets' slot order, every playing instrument first up to 6; an instrument that played within the window before the section and is silent in it keeps a dimmed panel (the code widgets' "dimmed look" off hides it). Live, the panels are decided during the section's first bar while its notes come in, then kept. An instrument that only enters after a Live coder step in the middle of a section waits for the next section live, while the fast video, which knows the whole song, shows it dimmed from the section start.
- **Spectrum:** a scrolling grid of 32 columns, 20 a second, 24 bands; each column is the spectrum of its own time slot (128 samples at a quarter of the sample rate), kept by slot. The fast video keeps 2 s of the song's wave for it.
- **Colours:** the app theme on the two looks (setting "colours" waits for the Settings card, phase 6).
- **Budget measured** (headless Chrome on the owner's machine class, 1080p target, 6 instruments): command time per frame Monitor 0.4 ms, Rullo 0.1 ms, Palco 0.4 ms (the timer's step is 0.1 ms); with the drawing waited for on a CPU canvas Monitor 7 ms, Rullo 4.2 ms, Palco 11 ms. Live on two songs: median 0.1 to 0.2 ms. Fast video fragments of 10 s: Monitor and Rullo 3.5 to 4.3 s against Palco 5.7 to 8.5 s.
- **Not in this delivery:** the layer (strip, Palco screen), the Settings card (phase 6), "Always real" scopes with a widget look checked with both `realScope` values (5.2 in part: the code widgets' renders are reused when the code widgets make them, else the fallback, said in the export log).

## Risks / Trade-offs

- **Notes of quiet lines look faint** (the pianoroll's opacity follows gain). Mitigation: the "Widget notes" setting of the code widgets, shared.
- **Scope in the fast video without per-instrument render** is not the real wave of the instrument (master wave scaled by level). Mitigation: Automatic says so in the log; "Always real" renders per instrument.
- **Live notes from the pattern** can differ from what sounds when the hidden mixer silences a hap. Mitigation: filter by the same gain rule as the code widgets' "follow the volume"; check one song note by note against the fast video's notes.
- **Duplicates** with code widgets in the code scenes: same instrument twice on screen. Accepted by default.
- **Panels moving at section changes** can feel jumpy. Mitigation: a short fade and the return window.

## Estimate

About 24 agent hours:

| Phase | Content | Hours |
| --- | --- | --- |
| 1. Painters | Shared module from `widget-frames.js` and `widgets.js`, boxes, colours; code widgets' fast video unchanged | 3 |
| 2. Stage feed | Per-instrument waves in `readAudio`, notes per instrument live (cached per cycle), spectrum from the time; same shape in the fast video | 4 |
| 3. Looks | Monitor (grid per proportions, panels, levels, onsets, dimmed), Rullo (pitch axis, legend, drum lanes) | 5 |
| 4. Layer | Strip and Palco screen, scene colours, after the look in `paint` | 2.5 |
| 5. Fast video | Notes per instrument from the render page, per-instrument renders reused, fallback and log | 3 |
| 6. Settings | Card, defaults, backup, i18n, Guide card | 2.5 |
| 7. Checks and docs | `check:stage-widgets`, browser check with frame time and screenshots, `check:video`, `check:clips`, `check:live`, `check:export`, knowledge base, design system | 4 |

Phases 1 to 3 alone (Monitor and Rullo without the layer) are about 12 hours and can ship first.

## Open Questions

Each with a recommended answer. **Owner, 2026-10-29: every recommendation approved**, with one note on the counts: Monitor shows up to 6 panels whatever the code widgets' maximum; 3 or fewer centred and bigger; think about the strip (centred, right corner, or two per side up to 4). Answered in D3 (Monitor layouts) and D4 (strip layout).

1. **Approach B as the base, Strudel's full-screen functions not used?** Recommended: yes. Only the app's painters reach the stage canvas, every video and the fast video with the same picture.
2. **Which full-screen looks first?** Recommended: Monitor and Rullo. Orbita (spiral, pitchwheel) after your tests of those widgets in the code.
3. **Layer over the other looks: default?** Recommended: off by default, values strip and Palco. On the Palco look, the screen is the natural place (mockup 04).
4. **Instruments and widgets: same as the code widgets card, or the stage's own?** Recommended: same by default, with an "own" switch. One mapping to learn.
5. **How many panels?** Recommended: Monitor up to 6, strip up to 3, Palco up to 4; every playing instrument up to the limit, no seed variation (the stage is not typed, variety comes from the music).
6. **Same instrument in the code widgets and on the stage in "Visual + code + widgets"?** Recommended: allow it. Choosing other instruments for the stage there adds a rule for little gain.
7. **Colours?** Recommended: automatic (app theme on the full-screen looks, the scene's palette on the layer).
8. **Silent instruments?** Recommended: dimmed while they return within the code widgets' window, then gone at the next section.
9. **Scope and spectrum in the fast video?** Recommended: reuse the per-instrument renders and the "Real scope and spectrum" setting of the code widgets; fallback master wave scaled by the instrument's level.
10. **Radio and video defaults?** Recommended: unchanged (radio look Palco, video "song's own look"). The new looks are chosen by hand or by the look cycles.
11. **Names?** Recommended: "Widget sul palco" (en "Stage widgets") for the card; looks "Monitor" and "Rullo" (en "Roll").

## Mockups

Made on 2026-10-29 by drawing over the stage of the running app with made-up data (Italian interface); in the owner's local notes, `notes/prove-2026-10-29/widget-palco/`:

1. `01-monitor-schermo-intero.png`: Monitor, 6 panels, the pad dimmed.
2. `02-rullo-schermo-intero.png`: Rullo, three melodic tracks and three drum lanes.
3. `03-sopra-la-scena-tramonto.png`: the strip over the Tramonto look.
4. `04-palco-sul-maxischermo.png`: four panels in the Palco look's big screen.
5. `05-impostazioni-widget-sul-palco.png`: the Settings card.
