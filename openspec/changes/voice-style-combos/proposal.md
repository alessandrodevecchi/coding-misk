# Proposal

## Why

Some speaker and voice style pairs sound bad: a bright style on a high voice is too high pitched, a robot or dirty style on some voices is hard to understand. Today the radio director, the artists and the other automatic draws pick a style for a voice without knowing which pairs work. The owner wants a committed list of the pairs that are allowed, so automatic draws never produce the bad ones. Hand-made choices stay free.

## What Changes

- **New config file `src/voices/combos.json`** (committed) lists, per language and per speaker, the voice styles an automatic draw may use. A speaker without an entry allows every style, so an empty or partial file breaks nothing.
- **Automatic draws read the file.** The character drawn by `voiceFor` and by the voice instrument draw (`src/endless/director.js`), the artists' character weights, the narrator style that New song draws, and the speaker drawn next to a chosen narrator style never produce a pair that is not listed. If no style of a draw is allowed, the draw uses `clear`.
- **Manual choices stay free.** A style or custom knob values chosen by hand (track panel, narrator and voice instrument pickers in the radio, steering commands, the Voices tab bench) are never refused or changed. The style pickers mark a style that is not in the allowed set of the current speaker with a short note.
- **Validation.** A new `npm run check:voice-combos` fails on an unknown speaker, an unknown style, a wrong language, a duplicate id or a malformed file, and warns on an empty list.
- **Voices tab.** The test bench shows whether the chosen speaker and style are allowed (small, optional task).
- **Versions and fixtures.** The filtered picks change what the director draws once the file is not all-allowed. `DIRECTOR_VERSION` goes up by one. The initial file allows everything, so the fixtures do not move until the owner narrows it (see `design.md`, D8).

## Capabilities

### New Capabilities

- `app/voice-combos`: the combos file, how automatic draws use it, the fallback, the manual exception, the hint in the pickers, the check and the Voices tab display.

### Modified Capabilities

None. `endless/radio-voice` keeps its requirements; the draws it describes only get a narrower list.

## Impact

- **Code:** new `src/voices/combos.js` (load, validate, `allowedStyles`, `allowedCharacters`); `src/endless/director.js` (`voiceFor`, the voice instrument draw, the narrator sound step); `src/endless/artist.js` / `artist-maker.js` read-only effects through `voiceFor`; `src/endless/new-song.js` (narrator style pick); `src/endless/voice-sound.js`, `src/main.js` (hint in style pickers); `src/voices/voices-tab.js` (bench note); `src/i18n.js`.
- **Data:** new `src/voices/combos.json`.
- **Tools:** new `tools/check-voice-combos.mjs`; `package.json` script; `check:spoken` gets a few tests.
- **Fixtures:** endless, radio and code snapshots move only when the owner narrows the file (regenerated once per merge together with `varied-openings` and `real-voices`).
- **Docs:** `docs/knowledge/voice.md`, `docs/knowledge/checks.md`, `docs/ENDLESS.md` (Voice), `docs/VOCALS.md`, `AGENTS.md` Tooling list, `CHANGELOG.md`, `DEVLOG.md`.
- **Depends on** `real-voices` (the speaker list and the default voice rule). Implement after it merges, or on top of its branch.
