---
id: settings
related: [export, radio, library, profiles]
code: [src/theme-light.css, src/settings/settings.js, src/settings/backup.js, src/i18n.js, src/endless/song-presets.js, src/code-themes/themes.js, src/code-themes/install.js]
checks: [node --no-warnings tools/check-backup.mjs, node --no-warnings tools/check-settings.cjs, npm run check:code-themes, node tools/check-code-themes.cjs, npm run check:light-theme, node tools/check-light-theme.cjs]
---

# Settings

## What it is

The settings page holds the options used less often. It opens from the gear in the top bar. Theme and language stay in the top bar too, for quick tests.

Every value is saved in the browser and goes into the backup.

## How it connects

- **Voices and phrases (my-phrases).** The card holds the save policy of the lines you write, the lifetime of unsaved samples, how often the director uses your phrases (Mai to Sempre) and the space of the samples with a link to the Voci tab ([phrases.md](phrases.md)).
- **Export.** Audio format, speed, video and fragment options are read by every export ([export.md](export.md)).
- **Radio.** Defaults for new sessions: the radio visual, transitions, harmony, material ([radio.md](radio.md)).
- **Library.** Hidden built-in songs, backup, import and reset ([library.md](library.md)).
- **Profiles.** The code typing speed is the profile control `typing` ([profiles.md](profiles.md)).

## Options

The page has nine cards:

- **Appearance:** theme (NEON, HW, the hardware look, or LIGHT, it: CHIARO, the light variant of neon; `coding-misk-ui`), Follow the system (`coding-misk-ui-follow`, off by default: LIGHT or NEON from the system's light or dark preference, turned off by pressing a theme; see `docs/DESIGN-SYSTEM.md`, Light theme), language (IT or EN), the radio visual, and the code theme: Code theme, Code font, Code size, Dim muted lines (see Code themes below).
  Also in Appearance: the stage's Render (`coding-misk-render`, also in the menu beside the looks) and Render on slow devices (`coding-misk-render-light`: automatic, the default and not stored; always light; never light) ([visuals.md](visuals.md)), and the code theme: Code theme, Code font, Code size, Dim muted lines (see Code themes below).
- **Audio:** volume, export format and MP3 rate, code typing speed, export speed.
- **Video:** layout, quality, title card, Code colours (the code theme's, or the app theme's colours), visual, render (as the stage by default), soul panel, video presets.
- **Vertical fragments:** format, what to show, aspect, look, render (as the stage by default), soul view, files, bands, bleed, rotation, code mode, tagline, label, glitch, length.
- **Live output:** a window with only the picture of the session, for a capture program, and a control room in another tab.
- **Radio:** transition, harmony, profile (as the artist and style say, or one profile for every generated song, radio-profiles; Custom is set in the console only), the default material source, the scope of console changes.
- **Library:** built-in songs deleted in this browser, with restore.
- **Stage widgets** (`coding-misk-stage-widgets`, widgets-on-stage D9, `src/visuals/stage-settings.js`): Over the scene (Off by default, Strip, Palco), Panels in Monitor (2 to 6, default 6), Panels in the strip (1 to 4, default 4), Instruments and widgets (Same as code widgets, or Own: a copy of the code widgets' instruments section taken when switched on, then edited here), Colours (Automatic, App theme, Scene colours), Silent instruments (Dimmed, Hidden), the widget kinds on or off for the stage (spiral and pitchwheel off), a pointer to Real scope and spectrum of the Video card. Stored whole, read by the stage only when the stored text changes. The open sections (`coding-misk-sw-open`) stay out of the backup. See [visuals.md](visuals.md).
- **Advanced:** Growth shapes tried (`coding-misk-shape-cap`, 4 to 32, default 8, the default not stored): how many shapes a Live coder growth in Compose measures before it goes on to twice as many when none has a growth without rushed steps ([growth-shapes.md](growth-shapes.md)). More shapes can find a growth with fewer rushed steps and take longer. It applies from the next growth (it is part of the Compose growth key) and to radio sessions started after the change (reused-lines D5, below); the song cards and the checks always use 8. Try all growth shapes (`coding-misk-shape-all`, off) with Keep (`coding-misk-shape-keep`: first good one, the default, or best one), Random order (`coding-misk-shape-random`, on) and Long song from (`coding-misk-long-song`, seconds, 15 minutes by default, set in minutes from 5 to 60): see [growth-shapes.md](growth-shapes.md). The same rules: defaults not stored, part of the Compose growth key, the checks use the defaults. The radio (reused-lines D5, D6, `#85`) records the shapes tried, Try all with Keep and Random order off in a new session (`options.shapeSearch`, `shapeSearchSetting` in `src/endless/growth.js`): each Live coder song grows first with the default search, then away from the page with the settings, and the wider growth takes its place when it arrives at least 20 s before the song starts and within 60 s, with no command on the song; the session records which one each song played (`shapeSearch.played`), so a replay and an export grow it the same. Long song from stays Compose only (the radio keeps 15 minutes). A line above them shows how many growth shapes there are (developments × paces, the openings, and the most candidates a growth tries), counted from `src/song/shapes.js` (`shapeCounts`). Chooser on air (`coding-misk-air-chooser`, default `normal-1`, not stored): the order of the typed moves when the listener steers a grown radio song, for sessions started after the change; an unknown id reads as the default ([radio-commands.md](radio-commands.md)).
- **Data:** export everything to a file, import and merge, reset everything (press twice).

Each option has its help text in `src/i18n.js`, under keys that start with `set`, `vid`, `frag` or `lr`.

**New song presets (new-song-panel D6).** The owner's presets of the New song panel (`coding-misk-song-presets`, `{ name: values }`, `src/endless/song-presets.js`) and the panel's values (`coding-misk-new-song`) go into the backup; an import merges presets by name, the backup's winning. The five built-in presets live in the code. The old voice of the next song by an artist (`coding-misk-artist-voice`) is no longer read and stays out of the backup (D9).

## Code themes

The colours and the font of the code panel and of the code drawn in videos (`code-themes`). One key, `coding-misk-code-theme`: `{ theme, font, size, dim }` (`src/code-themes/themes.js`, `codeThemeSettings` fills the defaults).

- **Theme.** `auto` (default) follows the app theme through one table keyed by `data-ui` (`AUTO`: `neon` → Neon, `hw` → Amber, `light` → Light high contrast). The app's own themes: Neon (its colours from the look's tokens, so it changes with the look), Amber, Terminal, High contrast dark, Light high contrast. Strudel's themes, curated: `strudelTheme` (the panel's look of before), `teletext`, `blackscreen`, `whitescreen`, `bluescreen`.
- **Roles.** A theme is a set of resolved colours: ground, text, comment, string, number, label, keyword, variable, method, punctuation, caret, selection, line numbers, playing-note outline, flash, video border, and widget colours (ink, accent, second accent, muted). The same roles feed the editor, the widgets (`widgetGroups`) and `drawCode` in videos.
- **Font and size.** JetBrains Mono (default), Share Tech Mono, VT323 (drawn 1.3 times larger), the system monospace; Small 13, Medium 14 (default), Large 16 px, one step larger in the full view. A change moves where the long lines of a live build break (`codeCols` reads the editor's character width), never the sound.
- **Dim muted lines** (on by default): the text of a `_$:` line and its indented lines at 55 %, in the panel (a line decoration, class `ct-muted`) and in videos.
- **Videos.** Settings → Video → Code colours (`codeColors` in `coding-misk-video`): `panel` (default) or `app` (today's colours from the app tokens, `appRoles`). The fast video and fragments read the theme once at their start (`J.ct`); the session video and the live output read it every frame.
- **Installer** (`src/code-themes/install.js`): Strudel's themes through the editor's `setTheme`; ours built with the editor's own classes (see [decisions.md](decisions.md)). It writes our `:root` variables (`--code-bg`, `--code-flash`, `--code-muted`, and for our themes Strudel's `--background`, `--foreground`), keeps the panel hidden until the first theme is in place (`#edhost.ct-wait`, 3 s at most) and writes Strudel's `codemirror-settings` so the next start opens close to the choice. A theme that cannot be installed leaves Strudel's default and one console warning.

## Example

The export format is one key in the browser:

```json
{"coding-misk-export-format": "flac"}
```

Song exports, session exports and radio recordings then write FLAC.

## Where to read more

- [docs/ARCHITECTURE.md](../ARCHITECTURE.md#persistence-keys): every browser key.
- The Guide cards `settings` and `live` in `src/guide.js`.
