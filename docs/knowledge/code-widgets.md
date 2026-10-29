---
id: code-widgets
related: [live-build, profiles, settings, visuals, strudel]
code: [src/live/widgets.js, src/video/widget-frames.js, src/visuals/widget-painters.js, src/live/live-code.js, src/live/air-code.js, src/song/writer.js, src/main.js, src/settings/settings.js, src/style.css]
checks: [npm run check:live-code, npm run check:mixer, npm run check:strudel, npm run check:video, node tools/check-code-widgets.cjs]
---

# Code widgets

## What it is

Strudel's inline widgets (`._scope()`, `._pianoroll()`, `._punchcard()`, `._spectrum()`, `._spiral()`, `._pitchwheel()`) written by the app at the end of some lines of the code panel, as a live coder would write them (`#79`, OpenSpec change `code-widgets`). Strudel's editor draws each one as a small canvas below its line. An app setting, off by default: Settings → Code widgets (it: Widget nel codice), stored in `coding-misk-code-widgets` and in the backup.

- **How many.** A maximum (default 3), not a fixed count: each section draws its own count from 1 to the maximum from the song's seed, never the same count three sections in a row (`targets`).
- **Which lines.** Lines that play at the bar (not `_$:`, and their section lane on), plus muted lines that return within the window (8, 16, 32 bars or always; default 16). Slots go by the slot order of instruments (default bass, lead, drums, arp, hats, pad, fx, voice), one line per instrument first, then the place in the code. A muted line with a widget takes a slot.
- **Which widget.** Each instrument has a primary and secondary widgets (default mapping: drums scope; hats pianoroll; bass scope; lead pianoroll; arp pianoroll; pad scope; fx and voice off). A line takes a secondary widget with the share (default 25%), chosen from the song's seed and the line's text without its section lane, so a track keeps its widget across sections. Pianoroll can be replaced by punchcard. Spiral, pitchwheel, `labels` and `smear` are off by default.
- **Instrument of a line.** From its `.analyze("…")` or `.chan("…")` (kick and snare are drums, hook and guitar lead, riser fx, texture pad); a spoken line (`say_`) is the voice.

## How it connects

- **Shown code only.** `liveCode(..., { widgets })` adds the calls in `codeAt`, after the writer and before the line breaks and the hidden tail. The plan of the written part, lines typed ahead, earlier lines and the paste rule use the code without widgets (`codeRaw`), so the growth, its shapes, durations and every fixture do not move. `lineKey` and the mixer's keys strip the calls (`stripWidgets`): a line with and without a widget is the same line.
- **Songs as written.** A song without a code of the moment gets its widgets in `codeFor` (`plainWidgets`), by the section of the bar.
- **Section boundaries.** `widgetTick` in `src/main.js`: at a section start without a step (Classic, songs as written) the code of that bar is set and evaluated once, so widgets move to the playing lines. A typing in progress is left alone; the next step brings the widgets.
- **Range update.** Every code change of a playing song (typed frames, steps, resume, boundaries) goes through `setCodeRange`: only the text between the equal start and end changes, in one transaction. A full `setCode` would remove every widget until the next evaluation. A new song and hand code still use the full replacement.
- **Wrapper.** `installWidgets` (called by `installHelpers`, in the page and on the render page) wraps the six `_` methods once: it merges the hidden groups of `globalThis.miskWidgets` (sizes, theme colours from `--ink`, `--a1`, `--a2`, `--muted`, set before each evaluation) with the line's own options, passes every key on, and clears a reused canvas. `_scope` and `_spectrum` return `this.tag(id)`, so the line keeps its `analyze`; `linkAnalysers` defines the widget's id on `window.analysers` as a hidden getter that returns the analyser of the line's instrument (read from the haps with the tag every half second). The stage and the level checks never list it. Where the `_` methods do not exist (Node, the render page) they are stubs that return the pattern.
- **Muted lines.** After each evaluation and code change, `markMuted` puts the class `cw-muted` on the widget of a `_$:` line: grey, see-through, dashed frame. Off with the setting.
- **Widget notes.** "Always full" draws the notes of every note widget at full opacity, on a copy: the pianoroll from a copy of the pattern, the painters (punchcard, spiral, pitchwheel) from copies of the haps they are given (`onPaint` wrapped during the call). The sound is unchanged. `tools/widget-notes.mjs` measures how faint the notes are per instrument: the pianoroll draws the line's own haps, before the hidden mixer.
- **Writing (D8).** In a growth typed by a person (Live coder), a widget call new at a step comes with its line when the step's typing still fits its time; otherwise it waits for a later step with time to spare, and at the latest comes with the next section's first step (`idlePlan` in `liveCode`). A widget never makes a step rushed.
- **Classic silences (D9).** A track silent now keeps its widget on the line it played last while one of its lines plays again within the window (tracks found by their header, else by instrument and visual).
- **Videos (D11).** The scenes "Visual + code + widgets" (session video, `code-widgets`), the live output's views 12 and 13 and the fragments' "Visual + code + widgets" and "Code + widgets" draw the widgets below their lines, dimmed on muted lines; the other scenes are unchanged. In real time they copy the page's widget canvases (`globalThis.miskWidgetCanvases`, kept by id by the wrapper).
- **Fast video and fragments (D11, `src/video/widget-frames.js`).** They render offline, so the app draws the widgets itself. Note widgets: the render page sends back the notes of the lines with a note widget (`wlines` on each segment, keyed by the line without its call, two cycles ahead of each block), and `fastWidgets` draws a pianoroll, punchcard, spiral or pitchwheel from them. Scope and spectrum: each instrument with one (its visual written in the line, or the hidden mixer's entry) is rendered alone first (`only` on the render job, mono at 12 kHz), and the widget draws that sound. Setting "Real scope and spectrum in the fast video": Automatic weighs the renders left after the first against one render and the frames (about 5 ms each); over that it uses the whole song's wave and says so (export log, toast); Always real never falls back.

- **On the stage (widgets-on-stage).** The looks Monitor and Rullo draw the same pictures on the stage with the app's painters (`src/visuals/widget-painters.js`, shared with `fastWidgets`, identical pixels), one panel per playing instrument up to 6. They follow this card's slot order, instruments on, primary and secondary widget, share and Widget notes, whether or not the code widgets are on; "dimmed look" decides whether a silent instrument keeps a dimmed panel. See [visuals.md](visuals.md).

## Options

The card's sections: General (on, maximum, pianoroll or punchcard, slot order, secondary share, Widget notes), Muted lines (window, dimmed look), Widgets (a switch each), Instruments (on, primary, secondary), Parameters (`labels`, `smear`, `fold`, `steady`, `fade`), Sizes (row height 36 px, pitchwheel 120, spiral 200, spectrum 120). `widgetSettings` fills in the defaults of any stored value.

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
