# Proposal

## Why

The Guide tab teaches Strudel only. The app's own features (two modes, songs, playlists, the radio with console, curves, mixer, transitions, recording, extend, artists, styles, genres, hand editing, settings) have no guide, and the radio in particular is hard to read: what changes the song on air and what changes the next songs (#48). The owner picked option A from mockups.

## What Changes

- **Two tabs in the Groove Lab:** "Guide" explains the app; a new "Strudel lessons" tab holds today's lessons, unchanged.
- **Guide content:** a row of feature chips on top, then one card per feature with "What it does", "How to use it" (real button names and shortcuts) and "Good to know". The Radio card has sub-sections (panel, console, curves, mixer, transitions, recording, extend, seed and replay) and a "What changes what" table: song on air or next songs.
- **"Show me"** on each card opens the feature's tab (switching mode when needed) and makes the control it talks about flash.
- **"?" in each tab** next to its intro opens the Guide on that tab's card, from either mode.
- **Kept up to date:** the guide text lives in one data file in English and Italian; a check fails, with the name of what is missing, when a tab or a console command has no guide entry or a language is missing. Features that need no guide can be marked exempt. The check never affects the app or the build.
- **Fix:** the Artists and Styles tab names and the radio's "Artist" label are translated in Italian.

## Capabilities

### New Capabilities

- `app/guide`: the Guide and Strudel lessons tabs, the feature cards, "Show me", the "?" buttons, the guide check.

### Modified Capabilities

None.

## Impact

- New `src/guide.js` (content and rendering), `index.html` (new tab and section), `src/main.js` (tabs, "?" buttons, "Show me"), `src/i18n.js`, `src/style.css` (both themes).
- New check `npm run check:guide`; browser check for the Guide in `check-modes.cjs`.
- `AGENTS.md` (the rule names the check), DEVLOG, `PROVE-v0.6.0.md`.
