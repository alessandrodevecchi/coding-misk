---
id: settings
related: [export, radio, library, profiles]
code: [src/settings/settings.js, src/settings/backup.js, src/i18n.js, src/endless/song-presets.js]
checks: [node --no-warnings tools/check-backup.mjs, node --no-warnings tools/check-settings.cjs]
---

# Settings

## What it is

The settings page holds the options used less often. It opens from the gear in the top bar. Theme and language stay in the top bar too, for quick tests.

Every value is saved in the browser and goes into the backup.

## How it connects

- **Export.** Audio format, speed, video and fragment options are read by every export ([export.md](export.md)).
- **Radio.** Defaults for new sessions: the radio visual, transitions, harmony, material ([radio.md](radio.md)).
- **Library.** Hidden built-in songs, backup, import and reset ([library.md](library.md)).
- **Profiles.** The code typing speed is the profile control `typing` ([profiles.md](profiles.md)).

## Options

The page has nine cards:

- **Appearance:** theme (NEON or HW, the hardware look), language (IT or EN), the radio visual.
- **Audio:** volume, export format and MP3 rate, code typing speed, export speed.
- **Video:** layout, quality, title card, visual, soul panel, video presets.
- **Vertical fragments:** format, what to show, aspect, look, soul view, files, bands, bleed, rotation, code mode, tagline, label, glitch, length.
- **Live output:** a window with only the picture of the session, for a capture program, and a control room in another tab.
- **Radio:** transition, harmony, profile (as the artist and style say, or one profile for every generated song, radio-profiles; Custom is set in the console only), the default material source, the scope of console changes.
- **Library:** built-in songs deleted in this browser, with restore.
- **Advanced:** Growth shapes tried (`coding-misk-shape-cap`, 4 to 32, default 8, the default not stored): how many shapes a Live coder growth in Compose measures before it goes on to twice as many when none has a growth without rushed steps ([growth-shapes.md](growth-shapes.md)). More shapes can find a growth with fewer rushed steps and take longer. It applies from the next growth (it is part of the Compose growth key) and to radio sessions started after the change (reused-lines D5, below); the song cards and the checks always use 8. Try all growth shapes (`coding-misk-shape-all`, off) with Keep (`coding-misk-shape-keep`: first good one, the default, or best one), Random order (`coding-misk-shape-random`, on) and Long song from (`coding-misk-long-song`, seconds, 15 minutes by default, set in minutes from 5 to 60): see [growth-shapes.md](growth-shapes.md). The same rules: defaults not stored, part of the Compose growth key, the checks use the defaults. The radio (reused-lines D5, D6, `#85`) records the shapes tried, Try all with Keep and Random order off in a new session (`options.shapeSearch`, `shapeSearchSetting` in `src/endless/growth.js`): each Live coder song grows first with the default search, then away from the page with the settings, and the wider growth takes its place when it arrives at least 20 s before the song starts and within 60 s, with no command on the song; the session records which one each song played (`shapeSearch.played`), so a replay and an export grow it the same. Long song from stays Compose only (the radio keeps 15 minutes). A line above them shows how many growth shapes there are (developments × paces, the openings, and the most candidates a growth tries), counted from `src/song/shapes.js` (`shapeCounts`). Chooser on air (`coding-misk-air-chooser`, default `normal-1`, not stored): the order of the typed moves when the listener steers a grown radio song, for sessions started after the change; an unknown id reads as the default ([radio-commands.md](radio-commands.md)).
- **Data:** export everything to a file, import and merge, reset everything (press twice).

Each option has its help text in `src/i18n.js`, under keys that start with `set`, `vid`, `frag` or `lr`.

**New song presets (new-song-panel D6).** The owner's presets of the New song panel (`coding-misk-song-presets`, `{ name: values }`, `src/endless/song-presets.js`) and the panel's values (`coding-misk-new-song`) go into the backup; an import merges presets by name, the backup's winning. The five built-in presets live in the code. The old voice of the next song by an artist (`coding-misk-artist-voice`) is no longer read and stays out of the backup (D9).

## Example

The export format is one key in the browser:

```json
{"coding-misk-export-format": "flac"}
```

Song exports, session exports and radio recordings then write FLAC.

## Where to read more

- [docs/ARCHITECTURE.md](../ARCHITECTURE.md#persistence-keys): every browser key.
- The Guide cards `settings` and `live` in `src/guide.js`.
