# Proposal

## Why

The endless director (`endless-director`, #21) writes sessions of songs, but they can only be generated from the command line and played one by one in Compose. Endless mode (#18) needs a place in the app where music starts with one click and never stops: this phase (#22) adds that radio view on top of the director, without changing how songs are written.

## What Changes

- **Radio tab**: a new tab next to Compose and Songs. The stage stays on top, as in every view; below it, the controls on the left and a "now playing" card on the right; under them the code typing itself (collapsible), then the history.
- **Controls**: start and stop, skip song, style multi-select, chaos, energy and complexity, the seed with "replay", "save" (the current song from its start, as a normal song in the library) and "open in Compose". Changing a control applies from the next song; the song on air is not touched.
- **Now playing card**: title, styles per part, key, tempo, energy shape with the current position, and the next changes coming (upcoming build steps with their bar).
- **Continuous playback**: songs follow each other with no silence and no restart; the next song is generated ahead and starts on the bar after the current one ends. Spoken comments, the live build typing and the stage visuals work as in Compose.
- **History and session**: the last 50 songs heard stay in the browser, each one can be reopened in Compose or saved; the session is kept as a recipe (seed and options) that can be replayed.

## Capabilities

### New Capabilities

- `endless/radio-view`: the radio tab, its layout, controls, now playing card and how controls apply.
- `endless/radio-playback`: continuous playback of a session in the browser: songs generated ahead, seamless song changes, live build, voice, tempo.
- `endless/radio-history`: history of songs heard, saving a song, opening it in Compose, replaying a session from its recipe.

### Modified Capabilities

None. The director, the song format and the live build engine are used as they are.

## Impact

- New UI code for the radio tab (`index.html`, `src/style.css`, a new module under `src/endless/` or `src/radio/`), new strings in `src/i18n.js`.
- The player in `src/main.js` gets a radio mode next to the track and song modes (transport, tempo per bar, live build), and loads the style recipes in the browser.
- No change to existing songs, the compiler or the director's output. No new runtime dependency.
- Later phases build on this: transitions (#23), steering (#24), agents (#25), MCP (#26), continue a Compose song in the radio (#29), session audio recording (#30), studio visual (#28).
