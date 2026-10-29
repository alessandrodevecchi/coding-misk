Estimate: about 17 agent hours (design, Estimate).

## 0. Owner

- [x] 0.1 Owner answers the open questions in the design (default, Strudel list, our themes, Neon and the look, font, videos, muted text, where, song field). Verify: answers in the design; proposal, spec and tasks updated
- [x] 0.2 Owner says go. Verify: answers and go in the DEVLOG

## 1. Theme data and installer (5.5 h)

- [x] 1.1 Code themes module: roles (design D2), our five themes, the curated Strudel list with derived roles, Automatic mapping. Verify: `npm run check:code-themes` (new, no browser): every role filled, contrast per role and per look (Neon), limits of the spec
- [x] 1.2 Installer on the editor (D1): Strudel themes through `setTheme`, ours through the editor's own classes and theme compartment, `:root` variables; one warning and Strudel's default when it fails. Verify: browser check installs every theme and reads the computed colour of a comment, a string and a label
- [x] 1.3 Apply at start (before the first paint of the code, `codemirror-settings` written for Strudel themes), on an app theme change and on a look change (Neon). Verify: browser check, reload with each theme, no default flash in a screenshot taken 100 ms after the editor appears

## 2. Font and size (1.5 h)

- [x] 2.1 Font and size through `setFontFamily` and `setFontSize`, full view one step larger, old `.edhost` sizes removed, `codeCols` recomputed on a change. Verify: browser check reads the font and size; a live build's line breaks follow the new width

## 3. Panel details (2 h)

- [x] 3.1 Widget colours from the theme (`widgetGroups`), pitchwheel colour passed explicitly, `.cw-muted` outline from the muted role, `.edhost` ground from the theme. Verify: screenshots of a muted pianoroll on every theme
- [x] 3.2 Flash colour from the theme; muted `_$:` text dimmed to about 55 % behind the option "Dim muted lines" (on by default, Q7), in the panel and in videos. Verify: screenshot of the flash on Light high contrast; a muted line dimmed and not dimmed with the option; `node tools/check-hand.cjs`

## 4. Settings (2 h)

- [x] 4.1 "Code theme", "Code font", "Code size", "Dim muted lines" in the Appearance card, the line naming Automatic's theme, saved, backup, reset. Verify: `node tools/check-settings.cjs`, `node --no-warnings tools/check-backup.mjs`
- [x] 4.2 Texts in English and Italian; Guide line in the settings card. Verify: `npm run check:guide`

## 5. Videos (2.5 h)

- [x] 5.1 `drawCode` with the theme's roles and font, video setting "Code colours", the fast video and fragments read the theme once, the live output gets it with its feed. Verify: `npm run check:video`, `node tools/check-video.cjs`, `node tools/check-clips.cjs`, `node tools/check-live.cjs` with Amber and Light high contrast; a fast video rendered twice gives the same frames. Built: `check-code-themes.cjs` composes video frames with the theme read at the start, changes the theme and checks the frames keep it; a full fast video rendered twice was not compared

## 6. Checks and docs (3.5 h)

- [x] 6.1 Browser check of code themes with screenshots of every theme on the same song and bar, both languages. Verify: it passes; screenshots shown to the owner
- [x] 6.2 `npm run check:code`, level snapshots and fixtures unchanged. Verify: all pass. Built: `check:code` 46/46 and `check:live-code` unchanged; the level snapshots were not run (nothing in the sound path changed)
- [x] 6.3 `docs/DESIGN-SYSTEM.md` (code themes, fonts), `docs/knowledge/` (settings, decisions: the installer on the bundled editor), `npm run knowledge`. Verify: `npm run check:knowledge`
