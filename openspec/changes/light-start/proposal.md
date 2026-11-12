## Why

The owner's rule is that the browser stays light and loads only what is needed. The UI review of 2026-11-12 (proposal P2) measured the production build and found two cheap problems at startup:

- The 37 drum machine photos of the Sounds tab (about 1 MB) download at startup, with the tab closed.
- The layout jumps after the first paint: CLS 0.45 at desktop width (1440 × 900) and 0.22 in a narrow window (390 × 844). The first paint shows the page's HTML before the app has filled its labels and built the work area; the header grows, the stage moves down, the work area changes size.

This change does the quick, low-risk part of P2 (`#44`).

## What Changes

- The Sounds tab builds its contents only when it is shown, and its photos load lazily: only the rows on screen (and near it) ask for their photo. No photo is requested at startup.
- Space is reserved before the first paint: labels the app fills keep one line of height, so the header and the stage do not move; the work area under the stage stays invisible until the app has built it once, so it appears in place instead of jumping. A CSS fallback shows it after 4 s even if the app fails to start.
- A browser check, `tools/check-light-start.cjs`: no photo request at startup, CLS under 0.1 at desktop and phone width, photos load when the Sounds tab opens.

Not in scope: tabs built on first opening, code splitting of the Guide, the Groove Lab tabs, Settings or the radio console, starting the growth worker on the first Play (the medium-risk part of P2).

## Capabilities

### New Capabilities

- `app/light-start`: what the app loads at startup and how its layout settles on the first paint.

### Modified Capabilities

None.

## Impact

- `src/sounds/browser.js` (render only when shown, `loading="lazy"` with a size), `src/main.js` (a ready mark after the first full render), `src/style.css` (reserved lines, the hidden work area and its fallback).
- A new browser check and its line in `AGENTS.md`. No change to songs, sound, fixtures, videos or exports.
