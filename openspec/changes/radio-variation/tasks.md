## 1. Vary in the rewrite

- [x] 1.1 `COMMANDS.vary`, `VARY_TYPES` and the `pattern` step with a generated idea (D1, D2); verify with a Node check in `tools/check-endless.mjs`: the varied part differs from before, every note is in the section's scale over 200 seeds, the rest of the song is unchanged
- [x] 1.2 `whyNot` reason `not-playing` and `locked` for vary; verify in the same check (no arp playing gives `not-playing`)
- [x] 1.3 Seeds `vary:<song>:<index>`; verify that cancelling a vary and replaying a recorded session give the same notes

## 2. Composing on Add and More complex

- [x] 2.1 Add of a new track and More complex take material from the generator (D4); verify in `npm run check:endless` that new tracks play composed ideas, not presets
- [x] 2.2 Curves and complexity as generator inputs (D3); verify in the check: density 0.2 gives fewer notes per bar than 0.8, higher energy a higher register, higher complexity more different degrees
- [x] 2.3 Endless fixtures written, `DIRECTOR_VERSION` raised by one in the same commit (after `material-generator`, which raises it first); verify `npm run check:endless` passes and measure one vary under 20 ms in Node (the fixtures are sessions without steering and did not change; `DIRECTOR_VERSION` raised to 5 anyway, because saved sessions with Add or More complex now sound different)

## 3. Console and playlists

- [ ] 3.1 "Vary" button, part picker, shortcut `n`, queue label and tooltip with the reason; strings in `src/i18n.js` in English and Italian; verify with `node tools/check-steering.cjs` (button, picker, disabled state, cancel) and screenshots
- [ ] 3.2 Playlist warning when the saved version differs (older or newer); verify with `node tools/check-playlists.cjs`
- [ ] 3.3 Radio plays a vary without errors; verify with `node --no-warnings tools/check-radio.cjs` and `node tools/check-transitions.cjs` (no evaluation errors, below clipping)

## 4. Docs and Guide

- [ ] 4.1 Guide card for Vary and the composed Add, in English and Italian in `src/guide.js`; verify with `npm run check:guide`
- [x] 4.2 `docs/ENDLESS.md` Steering table and Determinism; `DEVLOG.md` entry in Italian

## 5. Integration and listening test

- [ ] 5.1 With `radio-profiles` and `growth-shapes` in place, a vary on air is typed as small notes edits; verify with `node tools/check-steering.cjs` on a Live coder song (skip and say so while `radio-profiles` is on hold)
- [ ] 5.2 Owner's listening test (`docs/VARIETY.md`): a radio session steered by the owner, with Vary on each part; notes in `DEVLOG.md`

## 6. Material source

- [x] 6.1 Material source choice in the compilation setup and in Settings → Radio (strings in English and Italian), saved with the session; verify in `tools/check-compilation.cjs` and `tools/check-settings.cjs`
- [ ] 6.2 Material source selector in the console next to complexity, applied from the next song and recorded for replays; Settings keeps the default; verify in `tools/check-steering.cjs`

## 7. Swap

- [ ] 7.1 `COMMANDS.swap` with the same part types as vary: another ready part (preset or saved pattern) that fits style and key, never composed; seeds `swap:<song>:<index>`; verify in `tools/check-endless.mjs`
- [ ] 7.2 Swap button next to Vary, strings in English and Italian, Guide card update; verify with `tools/check-steering.cjs` and `npm run check:guide`

