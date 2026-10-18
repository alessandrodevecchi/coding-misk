## 1. Names

- [ ] 1.1 Rename `o` → `chan`, `drive` → `grit` in `installHelpers`, `preludeText`, `writeLine`, `HELPERS`, `src/render/page.js`; stop registering `voice`
- [ ] 1.2 `check:strudel`: fail when an app helper, library function or listed name is a Strudel name or synonym
- [ ] 1.3 Guide, i18n hints (it, en), `docs/STRUDEL-FUNCTIONS.md`, catalog regenerated

## 2. Functions

- [ ] 2.1 `src/song/functions.js`: `LIBRARY` (4 functions) and `NAMES` per family, track type, generic
- [ ] 2.2 Find runs on the reference code, parameters, library first, themed names by seed (pure, in `writer.js`)
- [ ] 2.3 `writeLine` folds runs that match a template; voice chains become song functions
- [ ] 2.4 `globalThis.miskFns`, registration in `installHelpers`, definitions in `preludeText` and the hidden code view

## 3. Technical functions preset

- [ ] 3.1 Options `fnBus`, `fnLevel`, `fnGrit`, `fnVoice`, `fnSong`, `fnLib`; `FUNCTION_PRESETS`, `functionPreset`; old values load as presets
- [ ] 3.2 Profile panel: preset menu and option checkboxes; Live coder uses compact
- [ ] 3.3 Classic and Crescendo fixtures in `tools/check-live-code.mjs` unchanged

## 4. Saved code

- [ ] 4.1 `upgradeCode` and `codeVersion: 2` for hand-coded versions on start and on backup import
- [ ] 4.2 Node check of the update

## 5. Checks and docs

- [ ] 5.1 `tools/check-functions.mjs` (`npm run check:functions`): template expansion gives the full line for every step of every built-in song in compact; compact is shorter
- [ ] 5.2 Browser check: compact code plays without errors, Open in Strudel text includes the definitions
- [ ] 5.3 Screenshot of the Ideas example in compact; DEVLOG, `docs/VARIETY.md`, AGENTS.md commands
