## 1. Versions

- [ ] 1.1 Names in `AIR_CHOOSERS` (D1); `chooserOf(id)` with the fallback to `AIR_CHOOSER` (D3)
- [ ] 1.2 `airChooserOf(recipe)` reads `recipe.chooser` (D4); `sessionOutdated` warns for an unknown id

## 2. Setting

- [ ] 2.1 Select in Settings, Advanced card, with its hint in English and Italian (D2); key `coding-misk-air-chooser`, removed for the default, in the backup
- [ ] 2.2 The radio writes `chooser` in a new recipe when it is not the default
- [ ] 2.3 Guide: the Advanced card line in English and Italian; knowledge notes (`radio-commands.md`, options)

## 3. Checks

- [ ] 3.1 `check:radio-profiles`: replay with `chooser: 'radio-1'`, with an unknown id (default), 5.5 per version; radio fixtures unchanged
- [ ] 3.2 `tools/check-settings.cjs`: the select, the stored key, the fallback; `check:guide`, `check:knowledge`, `build`
- [ ] 3.3 DEVLOG entry
