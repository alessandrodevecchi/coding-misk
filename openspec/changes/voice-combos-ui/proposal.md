# Proposal

## Why

`voice-style-combos` lets the owner decide which voice styles an automatic draw may give each speaker, but only by editing `src/voices/combos.json` and running a check. The owner wants to do it from the app, while listening: in Groove lab, Voices tab, switch a style on or off per voice and hear the effect on the radio.

## What Changes

- **A style grid on each voice card** (Groove lab, Voci, "Voci e suoni"): one toggle per voice style (the ten of `VOICE_STYLE_IDS`; `clear` is shown on and locked). A toggle that differs from the committed default is marked. A per-voice "Reset to defaults" button clears that voice's overrides.
- **User overrides in the browser.** A new key `coding-misk-voice-combos` (format 1) holds only the voices the user changed, as a full allowed list per language and speaker (same shape as `combos.json`). The effective table is `combos.json` with each overridden entry replaced by the user's entry.
- **Draws use the effective table.** `src/voices/combos.js` gets a layer: defaults plus overrides. The picker hints, the bench status and the automatic draws all read the effective table.
- **Backup.** The key is a normal `coding-misk-` key, so `makeBackup` already exports it. Import gets an explicit merge rule (per speaker: the backup's entry wins) and a count, plus a validation step so a bad value never reaches the draws.
- **Saved radio sessions and Replay stay the same.** A radio session records the effective table when overrides exist (`recipe.combos`, like `recipe.mine`). Replay, share and the fixed songs read the recorded table, never the current overrides.
- **Guide card** in English and Italian for the grid.
- **Optional, deferred:** a per-voice fallback when a drawn style is excluded. Specified in the design (D8), not in the tasks that ship, recommended not now.

## Capabilities

### New Capabilities

- `app/voice-combos-ui`: the style grid, the browser overrides, reset, the effective table, backup merge, session snapshot and the Guide card.

### Modified Capabilities

- `app/voice-combos` (from `voice-style-combos`): the table that draws read is the effective table (defaults plus overrides) instead of the file alone. The file stays the committed default and `check:voice-combos` still validates it.

## Impact

- **Code:** `src/voices/combos.js` (layer, `effectiveCombos`, `overridesErrors`, `mergeOverrides`); new `src/voices/combos-store.js` (browser read and write, event on change); `src/voices/voices-tab.js` (grid, reset); `src/endless/director.js`, `src/endless/items.js`, `src/radio/radio.js`, `src/main.js` (pass the recorded table); `src/settings/backup.js` (merge rule, count); `src/guide.js`; `src/i18n.js`; `styles/`.
- **Tools:** `tools/check-voice-combos.mjs` (override tests), `tools/check-backup.mjs`, `tools/check-voices-tab.cjs`, `check:guide`, `check:spoken`.
- **Docs:** `docs/knowledge/voice.md`, `docs/knowledge/checks.md`, `docs/ENDLESS.md` (Voice), `docs/VOCALS.md`, `CHANGELOG.md`, `DEVLOG.md`.
- **Fixtures:** none move with no overrides. A session recorded with overrides carries its own table. `DIRECTOR_VERSION` does not change (draws with the default table are unchanged).
- **Depends on** `voice-style-combos` (merged).
