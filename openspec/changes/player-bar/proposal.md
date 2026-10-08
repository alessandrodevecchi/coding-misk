# Proposal

## Why

The owner wants to leave the radio on all day at low volume while the rest of the system stays louder, and now that the app plays songs, live builds and the radio, a classic player is missing (#32). Today play and stop sit in the top bar and there is no volume at all.

## What Changes

- **Player bar**: a low bar fixed at the bottom of the window, visible in every tab: play and pause, stop, previous and next song, title and position of what is playing, volume with mute, and an ON AIR light while the radio plays. Neon look in the neon theme, mechanical look in the hardware theme.
- **Top bar**: keeps the logo, the theme and the language; play and stop move to the player bar.
- **Global volume**: one volume for the whole app with mute, remembered between visits, also next to the radio controls. It only changes what is heard: WAV exports and recordings keep their level.
- **Previous and next**: in Compose and the Songs tab, the previous or next song of the library; in the Radio, next skips and previous starts the song on air again.

## Capabilities

### New Capabilities

- `app/player-bar`: the bottom player bar, its controls in each mode, and the global volume and mute.

### Modified Capabilities

- `endless/radio-view`: the radio also shows the global volume next to its controls (no requirement of the radio changes otherwise).

## Impact

- `index.html`, `src/style.css` (both themes), `src/i18n.js`, `src/main.js` (transport moves to the bar, volume node after the master output, previous and next).
- `src/radio/radio.js`: volume next to the controls, restart of the song on air.
- Existing browser checks that click `#play` and `#stop` keep working: the ids move with the buttons.
