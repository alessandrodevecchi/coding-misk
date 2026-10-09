# Proposal

## Why

Compose and the radio feel like two tools: a song made or opened in Compose cannot lead into the endless radio (#29).

## What Changes

- **"▶ Continue in radio"** in Compose and on the song cards of the Songs tab.
- **The song is song 0 of a new session:** it plays from where Compose is (from its start on a card) to its end, then a transition leads into the radio's first song, with a compatible key and tempo.
- **Styles close to the song:** the styles named in the song's tags; else the styles of its genre closest in tempo; else the styles closest in tempo and meter. The radio panel shows the choice and can change it for the following songs.
- **Song 0 is not steerable:** the console, curves and extend apply from song 1; while song 0 plays they say why they are off.
- **Replay:** the session recipe keeps a copy of song 0, so Replay and "Record from the start" play it again.

## Capabilities

### New Capabilities

- `endless/continue-in-radio`: the button, song 0, the transition into song 1, the style choice, steering from song 1, replay with song 0.

### Modified Capabilities

None.

## Impact

- `src/endless/director.js`: a session can start after a given song (a lead entry: tempo of its last section, key, meter, length), so song 1 plans its harmony and transition from it.
- `src/radio/radio.js` (session with song 0, recipe, steering off on song 0), `src/main.js` (button in Compose, action on song cards), `src/library/songs-view.js`, `src/i18n.js`, `src/guide.js` (Radio and Compose cards).
- Checks: `check:endless` (lead entry, transition, style choice), browser check for the button and song 0; docs `ENDLESS.md`, DEVLOG, `PROVE-v0.6.0.md`.
