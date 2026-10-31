## 1. Lit notes: Underlined (about 1.5 h)

- [x] 1.1 Add `underline` to the `lit` values in `src/code-themes/themes.js` (D1) and the underline role (accent with the 3:1 fallback); verify with `npm run check:code-themes -- --table` that every theme has the role and the fallbacks are listed.
- [x] 1.2 Editor: the CSS rule in `src/code-themes/install.js` (inline outline removed, `box-shadow: inset 0 -2px 0`); verify in the browser that the code does not move while notes light (line height unchanged).
- [x] 1.3 "Code over" and the video code layouts draw the underline (`src/video/code-over.js`, `src/video/video.js`), the edited line in its own ink; verify with `tools/check-code-over.cjs` and a fast video fragment that the underlined tokens match the editor's.
- [x] 1.4 The third button of "Lit notes" in Settings, labels in English and Italian; verify the backup round trip with `node --no-warnings tools/check-backup.mjs` and `tools/check-code-themes.cjs`.

## 2. Widget notes default (about 0.5 h)

- [x] 2.1 `CW_DEFAULTS.notes = 'full'`, the settings version field and the one-time move (D2) in `src/live/widgets.js`; verify in Node: old settings with `volume` and no version read as `full`, settings with version 2 and `volume` stay `volume`, reset gives `full`.
- [ ] 2.2 Verify on the stage (Monitor, "Same as code widgets") that quiet notes draw at full opacity after the move.

## 3. Help texts (about 2.5 h)

- [x] 3.1 `row()` sets the help text as `title` on the label (D3); every row of the D4 table gets its text in `src/i18n.js`, English and Italian, each checked against the code's behaviour.
- [x] 3.2 The Italian label of "Lit tokens" in Code over becomes «Stringhe accese»; verify no two rows of one card share an Italian label.
- [x] 3.3 `tools/check-settings.cjs` fails when a Settings row has no help text or misses one language; run it in English and Italian.
- [x] 3.4 Guide lines that name these options updated (`src/guide.js`); `npm run check:guide`.

## 4. Label fixes (about 0.5 h)

- [x] 4.1 "Palco" → "Stage" in the English `swLayer:palco`, `swLayerHint`, `swStripHint`, `swColoursHint` (Italian keeps «Palco»); verify that no English string of the stage widgets card contains "Palco".
- [x] 4.2 `outKindTip` rewritten in both languages (D4, last row); verify by hovering the switch with the export speed on Fast and on Real time.

## 5. Close (about 0.5 h)

- [x] 5.1 Run `npx vite build`, `check:code-themes`, `check:light-theme`, `check-settings.cjs`, `check-code-over.cjs`, `check:guide`, `npm run knowledge` and `check:knowledge`.
- [x] 5.2 Screenshots of the three lit forms (neon, hardware, light) and of a Settings card with tooltips, in the owner's test folder; DEVLOG entry in Italian.

Total: about 5.5 agent hours.
