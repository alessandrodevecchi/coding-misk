# Tasks

## 1. UI

- [x] 1.1 Reproduce the lost single click on Keep in the browser (compilation with invented styles) and confirm the cause, then fix it with `pointerdown` on the Keep button only.
- [x] 1.2 `trialChip` and `trialHint` in `song-controls.js` take the style, the "on" state and the actions as parameters; the Invent call sites pass the trial style with Keep, Again and ×.
- [x] 1.3 Now playing: the shared chip and hint (Keep only) replace the `comp-tag` Keep chip for a compilation-invented style, with the click fix.
- [x] 1.4 STYLES block: the shared chip and hint (no Again, no ×) from the on-air item's `comp.style`, above the greyed style chips and outside the `set-aside` dimming; full colour, Keep button saves the style, name click does nothing; nothing when there is none.
- [x] 1.5 Strings (`inventBadgeShort` reuse, at most one new key, en and it) and the small CSS rule if needed.

## 2. Check

- [x] 2.1 Browser check: compilation on with invented styles: chip in both places, one-click Keep, style in the Styles tab, chips gone; next song with another style updates the chips; compilation off and the Invent die unchanged. Screenshots for the owner.
- [x] 2.2 `npm run check` suites that touch the radio still pass; CHANGELOG and DEVLOG.
