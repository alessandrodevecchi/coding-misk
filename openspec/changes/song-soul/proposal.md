# Proposal

## Why

The radio shows a song's settings as separate curves, menus and knobs. The owner wants one screen that draws the whole "soul" of a song (its seed, settings, curves and instruments) as a single picture, in the style of an old green CRT radar or sonar display from science-fiction films (#46). It is the showpiece of the radio and builds on the curves of #40.

## What Changes

- **A "Soul" screen** for the song on air (and for any saved radio song): a full-window CRT display, green phosphor in the normal theme and amber in the HW theme, with scanlines, glow, vignette and a curved bezel.
- **One concept chosen from mockups** (open, see design): A "motion tracker" (the song as a dial, curves as rings, a sweep at the current bar, instruments as blips), B "terrain scan" (the curves as a wireframe landscape with a terminal readout), C "soul sphere" (a 3D wireframe globe shaped by the curves, instruments in orbit). A and C can rotate or animate; B can scroll.
- **The seed's sigil:** a symbol drawn from the seed, the same for the same seed, shown on the screen as the song's signature, with the seed and a short hash.
- **Live:** while the song plays, the screen follows the bar (sweep, scan line or rotation), instruments light up when they play, the readouts follow steering changes.
- **Own names:** the screen's labels use the app's own names (no film trademarks).

## Capabilities

### New Capabilities

- `endless/song-soul`: the Soul screen, its data, the sigil, live following, themes, opening and closing.

### Modified Capabilities

None.

## Impact

- New `src/radio/soul.js` (canvas drawing, the chosen concept), `src/radio/radio.js` (open from the now playing card and the History), `src/style.css`, `src/i18n.js`, `src/guide.js` (Radio card).
- Fonts: VT323 and Share Tech Mono (Google Fonts) or a local monospace fallback.
- Checks: a browser check (opens, draws, follows the bar, closes, no errors, phone width).
