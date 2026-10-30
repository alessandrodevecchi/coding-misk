---
id: code-widgets
related: [live-build, profiles, settings, visuals, strudel]
code: [src/widgets/app-widgets.js, src/widgets/hitgrid.js, src/widgets/tonecloud.js, src/live/widgets.js, src/video/widget-frames.js, src/visuals/widget-painters.js, src/live/live-code.js, src/live/air-code.js, src/song/writer.js, src/main.js, src/settings/settings.js, src/style.css]
checks: [npm run check:code-over, node tools/check-code-over.cjs, npm run check:live-code, npm run check:mixer, npm run check:strudel, npm run check:video, node tools/check-code-widgets.cjs]
---

# Code widgets

## What it is

Strudel's inline widgets (`._scope()`, `._pianoroll()`, `._punchcard()`, `._spectrum()`, `._spiral()`, `._pitchwheel()`) written by the app at the end of some lines of the code panel, as a live coder would write them (`#79`, OpenSpec change `code-widgets`). Strudel's editor draws each one as a small canvas below its line. An app setting, off by default: Settings → Code widgets (it: Widget nel codice), stored in `coding-misk-code-widgets` and in the backup.

- **How many.** A maximum (default 3), not a fixed count: each section draws its own count from 1 to the maximum from the song's seed, never the same count three sections in a row (`targets`).
- **Which lines.** Lines that play at the bar (not `_$:`, and their section lane on), plus muted lines that return within the window (8, 16, 32 bars or always; default 16). Slots go by the slot order of instruments (default bass, lead, drums, arp, hats, pad, fx, voice), one line per instrument first, then the place in the code. A muted line with a widget takes a slot.
- **Which widget.** Each instrument has a primary and secondary widgets (default mapping: drums the hit grid; hats pianoroll; bass scope; lead pianoroll; arp pianoroll; pad and voice the tone cloud; fx off; see App widgets below). A line takes a secondary widget with the share (default 25%), chosen from the song's seed and the line's text without its section lane, so a track keeps its widget across sections. Pianoroll can be replaced by punchcard. Spiral, pitchwheel, `labels` and `smear` are off by default.
- **Instrument of a line.** From its `.analyze("…")` or `.chan("…")` (kick and snare are drums, hook and guitar lead, riser fx, texture pad); a spoken line (`say_`) is the voice.

## How it connects

- **Shown code only.** `liveCode(..., { widgets })` adds the calls in `codeAt`, after the writer and before the line breaks and the hidden tail. The plan of the written part, lines typed ahead, earlier lines and the paste rule use the code without widgets (`codeRaw`), so the growth, its shapes, durations and every fixture do not move. `lineKey` and the mixer's keys strip the calls (`stripWidgets`): a line with and without a widget is the same line.
- **Songs as written.** A song without a code of the moment gets its widgets in `codeFor` (`plainWidgets`), by the section of the bar.
- **Section boundaries.** `widgetTick` in `src/main.js`: at a section start without a step (Classic, songs as written) the code of that bar is set and evaluated once, so widgets move to the playing lines. A typing in progress is left alone; the next step brings the widgets.
- **Range update.** Every code change of a playing song (typed frames, steps, resume, boundaries) goes through `setCodeRange`: only the text between the equal start and end changes, in one transaction. A full `setCode` would remove every widget until the next evaluation. A new song and hand code still use the full replacement.
- **Wrapper.** `installWidgets` (called by `installHelpers`, in the page and on the render page) wraps the six `_` methods once: it merges the hidden groups of `globalThis.miskWidgets` (sizes, the code theme's widget colours, ink, accent, second accent and muted, set before each evaluation: [settings.md](settings.md#code-themes)) with the line's own options, passes every key on, and clears a reused canvas. `_scope` and `_spectrum` return `this.tag(id)`, so the line keeps its `analyze`; `linkAnalysers` defines the widget's id on `window.analysers` as a hidden getter that returns the analyser of the line's instrument (read from the haps with the tag every half second). The stage and the level checks never list it. Where the `_` methods do not exist (Node, the render page) they are stubs that return the pattern.
- **Muted lines.** After each evaluation and code change, `markMuted` puts the class `cw-muted` on the widget of a `_$:` line: grey, see-through, dashed frame. Off with the setting.
- **Widget notes.** "Always full" draws the notes of every note widget at full opacity, on a copy: the pianoroll from a copy of the pattern, the painters (punchcard, spiral, pitchwheel) from copies of the haps they are given (`onPaint` wrapped during the call). The sound is unchanged. `tools/widget-notes.mjs` measures how faint the notes are per instrument: the pianoroll draws the line's own haps, before the hidden mixer.
- **Writing (D8).** In a growth typed by a person (Live coder), a widget call new at a step comes with its line when the step's typing still fits its time; otherwise it waits for a later step with time to spare, and at the latest comes with the next section's first step (`idlePlan` in `liveCode`). A widget never makes a step rushed.
- **Classic silences (D9).** A track silent now keeps its widget on the line it played last while one of its lines plays again within the window (tracks found by their header, else by instrument and visual).
- **Videos (D11).** The scenes "Visual + code + widgets" (session video, `code-widgets`), the live output's views 12 and 13 and the fragments' "Visual + code + widgets" and "Code + widgets" draw the widgets below their lines, dimmed on muted lines; the other scenes are unchanged. In real time they copy the page's widget canvases (`globalThis.miskWidgetCanvases`, kept by id by the wrapper).
- **Fast video and fragments (D11, `src/video/widget-frames.js`).** They render offline, so the app draws the widgets itself. Note widgets: the render page sends back the notes of the lines with a note widget (`wlines` on each segment, keyed by the line without its call, two cycles ahead of each block), and `fastWidgets` draws a pianoroll, punchcard, spiral or pitchwheel from them. Scope and spectrum: each instrument with one (its visual written in the line, or the hidden mixer's entry) is rendered alone first (`only` on the render job, mono at 12 kHz), and the widget draws that sound. Setting "Real scope and spectrum in the fast video": Automatic weighs the renders left after the first against one render and the frames (about 5 ms each); over that it uses the whole song's wave and says so (export log, toast); Always real never falls back.

- **On the stage (widgets-on-stage).** The looks Monitor and Rullo draw the same pictures on the stage with the app's painters (`src/visuals/widget-painters.js`, shared with `fastWidgets`, identical pixels), one panel per playing instrument up to 6. They follow this card's slot order, instruments on, primary and secondary widget, share and Widget notes, whether or not the code widgets are on; the Stage widgets card decides the widget kinds for the stage, whether a silent instrument keeps a dimmed panel (Silent instruments) and can give the stage its own instruments section (Own). In the fast video, Real scope and spectrum Always also renders alone each stage instrument whose panel is a scope or spectrum (`stageScopeInstruments`) when a widget look or the layer can show; Automatic adds no render. See [visuals.md](visuals.md).

## App widgets

Two widgets of the app (OpenSpec change `code-over-visual`), written like Strudel's and placed by the same slots: `._hitgrid()` (Hit grid, it: Griglia colpi) and `._tonecloud()` (Tone cloud, it: Nuvola di note). The names are the app's own, unlike the reference project's (its source uses `rhythm` and `chroma`).

- **Drawn from notes.** `src/widgets/app-widgets.js` keeps one entry per widget (defaults, options of a call, the window of notes it needs, data, painter). Notes are `{ inst, b, e, p, lv, n }`: from the playing pattern in the page (`noteOfHap`, a cycle at a time, never before cycle 0) and from the render page's stage notes in the fast video (`notesOfStore`; `noteOf` carries the sample's variant as a fifth element), rounded alike so both draw the same cells (`check:code-over`).
- **Hit grid.** One row per drum sound and variant (`hh`, `hh:3`) in a stable order, rows kept once seen, the rhythm of bass, hook, lead, arp and guitar as extra rows while they play, the meter's steps (12 in 3/4), the current step, played and coming hits, `battuta N · passo S/T`.
- **Tone cloud.** 12 rows over 3 bars in 48 slices, energy from level and overlap with a 0.6-cycle tail, spread to neighbouring classes and overtones (fifth, major third) with a deterministic grain, column normalisation with a gamma of 0.7, the ramp ` .:-=+*#%@`; the chord of the last quarter cycle (largest shape, lowest root) inverted in the labels and named below, flats in flat keys.
- **Forms.** By the render (`cellForm`): blocks (Normal, CRT), round cells (LED), two tones (1-bit), characters (ASCII, Terminal); the cloud stays characters in Normal and CRT.
- **Editor.** `installAppWidgets` registers both calls with Strudel's global `registerWidget` in the page (the canvas kept in `globalThis.miskAppWidgets` and `miskWidgetCanvases`) and stubs them in Node and on the render page; `drawAppWidgets` redraws them after each stage frame.
- **Slots (cv8).** Drums: the hit grid, once, on the first drum line playing (on the last drum line it moved each time a line was added and a person typing had to retype it). Pad and voice: the tone cloud (the voice's spoken lines have no pitch: the cloud shows the harmony under it); bass, lead and arp: a secondary. The stage keeps its panels as before (`stageMapping`): app widgets are not stage panels yet.
- **Leaving the app (cv7).** Copy, the strudel.cc link and the hand code's copy keep the calls commented out in place, `/* ._hitgrid() */` (`commentAppWidgets`), valid mid-chain and on a line of its own; the code evaluates with the same haps in a plain Strudel.

## Options

The card's sections: General (on, maximum, pianoroll or punchcard, slot order, secondary share, Widget notes), Muted lines (window, dimmed look), Widgets (a switch each), Instruments (on, primary, secondary), Parameters (`labels`, `smear`, `fold`, `steady`, `fade`), Sizes (row height 36 px, pitchwheel 120, spiral 200, spectrum 120), App widgets (each on or off, its parameters, a live preview from demo notes; `coding-misk-app-widgets`). `widgetSettings` fills in the defaults of any stored value.

## Example

```sh
npm run check:live-code                       # which lines, how many, which widget, windows of muted lines
PORT=5196 node tools/check-code-widgets.cjs /tmp/cw   # in the browser, with screenshots
```

## Gotchas

- Strudel's `_scope` takes its colour from the haps, not its options: the wrapper colours only the drawn copy (`.color()` on the pattern given to the original).
- Strudel's own scope takes its colour from the haps (white between two hits) and its spectrum ignores `color` and keeps its last frame per id. The app draws both itself (`scopePainter`, `spectrumPainter`, started with `.draw` on the widget's id, which stops Strudel's loop): always in the widget's colour, and a new spectrum starts blank.
- Not done yet: the choice of the Widget notes default (measures above, screenshots in the owner's notes).

## Where to read more

- `openspec/changes/code-widgets/` (proposal, design D1 to D15, spec, tasks).
- [live-build.md](live-build.md), [settings.md](settings.md), [visuals.md](visuals.md).
