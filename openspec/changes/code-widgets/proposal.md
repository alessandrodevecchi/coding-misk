## Why

Live coders often show small animated pictures inside their code: a scope of the wave, a piano roll of the notes, a spectrum. The code panel shows only text and lit notes today (`#79`). The owner wants Strudel's own inline widgets (`._scope()`, `._pianoroll()`, `._punchcard()`, `._spectrum()`, `._spiral()`, `._pitchwheel()`) written in the code, as a live coder would write them, in every profile and in songs that do not grow.

An earlier draft of this change (`code-visuals`) recommended pictures drawn by the app beside the lines. The owner chose Strudel's widgets in the code for now; pictures drawn by the app move to the later stage visuals. This change replaces that draft.

Analysis and demos (2026-10-26 to 2026-10-28) showed that every inline widget works in the app as it is, with two real problems, both fixed in a page trial without touching Strudel: a full `setCode` while typing removes every widget until the next evaluation, and `_scope` and `_spectrum` overwrite the line's `analyze`, so the stage, the level snapshots and the soul lose that instrument.

## What Changes

- **"Code widgets"** (it: "Widget nel codice"), a new name that does not clash with the stage visuals, the scenes or the soul. An on/off option, off by default at first, with a maximum number of widgets on screen together (default 3). It is a maximum, not a fixed count: the number on screen varies over the song, for variety. It applies to every profile (Classic, Crescendo, Live coder and the others), to the radio and to songs that do not grow.
- **A whole Settings card "Code widgets"** with collapsible sections: the option and the maximum; the order in which tracks get a slot; the share of secondary widgets; how long a muted line keeps its widget; the dimmed look of muted widgets; "Widget notes"; each widget on or off; each widget on or off per instrument, with the primary and secondary widget of each instrument; selected parameters on or off (for example `labels`, `smear`); sizes. Saved with the settings and in the backup.
- **Slot order.** The order in which tracks get a slot is a setting, by default bass, lead, drums, arp, hats, pad, then fx and voice.
- **Secondary widgets for variety.** A line usually gets its instrument's primary widget, and about 1 time in 4 a secondary one. The share is a setting, default 25%.
- **All widgets available.** Off by default: `_pitchwheel`, `_spiral`, and the parameters `labels` and `smear`. `fx` and `voice` have no widget by default.
- **Default mapping** (primary, then secondary): drums scope, then pianoroll and spectrum; hats pianoroll, then scope and spectrum; bass scope, then pianoroll and spectrum; lead pianoroll, then scope and spectrum; arp pianoroll, then scope and spectrum; pad scope, then pianoroll; fx and voice off, then scope and spectrum. Punchcard is an alternative to pianoroll in Settings.
- **Short calls in the shown code, parameters in the hidden code.** The shown line ends with `._pianoroll()`. A wrapper merges shared parameter groups from the hidden code (sizes, colours from the app theme, per-widget groups) with any option written in the line. Every Strudel widget parameter is accepted, even unused ones. Sizes are smaller than Strudel's by default and adjustable.
- **Colours follow the app theme** (neon, hardware), in Strudel's normal style.
- **Writing.** The coder adds a widget when writing the line, if the step has free time or the track matters, or later in idle time. Muted lines may already carry their widget or get it in a pause before they return. As a fallback the widget code appears at once. The growth is measured without widgets, so shapes, durations and fixtures do not move.
- **Muted lines.** A widget on a muted line counts toward the maximum, because its box always takes space (verified on `_$:` lines). A muted line keeps its widget only if it returns within N bars; N is a setting with the values 8, 16, 32 and always, default 16. Until the line returns, its widget is drawn dimmed (grey, semi-transparent, a dashed frame like the muted code lines), by app styling on the widget element, so it works for every widget. A setting turns the dimmed look off; default on.
- **Classic.** A widget sits only on the line of its track that plays now. It moves to the track's new line at a section change, is removed when the track is silent, and stays on a muted line that returns within N bars (the setting above).
- **"Widget notes"** (it: "Note dei widget"): "follow the volume" (it: "come il volume") or "always full" (it: "sempre piene"). It changes only the drawing, never the sound. The default is chosen after measuring the real track volumes and looking at screenshots.
- **Songs that do not grow.** Widgets change at once at each section change, with one evaluation at the boundary. In the "one line per track" view they never move.
- **Typing keeps the widgets.** The panel's code is updated only in the changed text range, so widgets and lit notes on untouched lines stay while a line is typed.
- **`_scope` and `_spectrum` keep the line's instrument.** A wrapper keeps `analyze` and points the widget at that instrument's analyser, in both Strudel copies of the app, without patching superdough.
- **Videos.** The session video, the vertical fragments with code and the live output draw the widgets beside the code, in new "Code + widgets" scenes. The fast video redraws note widgets from the haps of each line, and renders scope and spectrum from one extra offline render per track with a widget (2 to 3). A video setting "Real scope and spectrum in the fast video" (it: "Scope e spectrum veri nel video veloce") chooses: "Automatic" (default) falls back to the master waveform when the export would take more than twice as long; "Always real" always renders per track, even if slower.

Out of scope: full-screen visuals and Hydra (later stage visuals, approach B); pictures drawn by the app beside the lines (approach B); a voice widget on by default.

## Capabilities

### New Capabilities

- `code-widgets`: Strudel's inline widgets written into the code of the panel by the app, with settings, writing rules per profile, a wrapper for parameters and analysers, and the same widgets in videos and in the live output.

### Modified Capabilities

None in `openspec/specs/`. The open changes `live-typing`, `profile-options` and `fast-video` are read by this change; it adds no control to the profiles.

## Impact

- **Code:** a new module for widget choice, writing and stripping (for example `src/live/widgets.js`), the wrapper in the helpers installed in both Strudel copies (`installHelpers`: the page and `src/render/page.js`), `src/live/live-code.js` (`codeWith`, before `breakLines`), `src/live/written-plan.js` and the line keys, `src/main.js` (range update of the code, section boundary in songs that do not grow), `src/settings/settings.js` (the card), `src/video/video.js` (`drawCode`), `src/video/layout.js` (scenes), `src/export/` and `src/video/feed.js` (fast video), `src/i18n.js`, `src/guide.js`, `src/style.css`.
- **Checks:** `check:strudel` (widget methods allowed), `check:mixer` (a case with widgets on), Node stubs for the checks without a browser, `check:typing` and `check:live-code` (new cases), `check:video`, `check:clips`, `check:live`, `check:export`, `check:guide`, `check:knowledge`, a new browser check for the panel. With the option off, `check:code`, the Live coder and Crescendo fixtures and `npm run durations` do not move.
- **Docs:** `docs/knowledge/` (a code widgets note, settings, decisions, checks), `docs/ARCHITECTURE.md`, `docs/STRUDEL-FUNCTIONS.md` (rebuilt catalog).
- **Versions:** none expected. If an intended change moves the Live coder fixtures, `SHAPES_VERSION` rises and `npm run durations` runs in the same commit.
