# Tasks

## 1. UI

- [ ] 1.1 Reproduce the lost single click on Keep in the browser (compilation with invented styles) and pick the smaller fix: act on `pointerdown`, or hold the card rebuild while the pointer is down on the button.
- [ ] 1.2 `trialChip` and `trialHint` in `song-controls.js` take the style, the "on" state and the actions as parameters; the Invent call sites pass the trial style with Keep, Again and ×.
- [ ] 1.3 Now playing: the shared chip and hint (Keep only) replace the `comp-tag` Keep chip for a compilation-invented style, with the click fix.
- [ ] 1.4 STYLES block: the read-only shared chip and hint from the on-air item's `comp.style`; readable inside the `set-aside` area; nothing when there is none.
- [ ] 1.5 Strings (`inventBadgeShort` reuse, at most one new key, en and it) and the small CSS rule if needed.

## 2. Check

- [ ] 2.1 Browser check: compilation on with invented styles: chip in both places, one-click Keep, style in the Styles tab, chips gone; next song with another style updates the chips; compilation off and the Invent die unchanged. Screenshots for the owner.
- [ ] 2.2 `npm run check` suites that touch the radio still pass; CHANGELOG and DEVLOG.
