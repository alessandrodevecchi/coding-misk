## 1. Profile label

- [x] 1.1 `src/i18n.js`: `profile:switch` "Live coder" in English and Italian, `profileHint` and `profileHint:switch` without "Switch"; comments in `src/live/profiles.js` say Live coder; verify the Compose menu in the dev server
- [x] 1.2 Song description texts that say "Switch profile" (`switch-prima-luce`) say "Live coder profile"; verify `npm run check:songs` and `npm run check:code` (no code change)

## 2. Style ids and aliases

- [x] 2.1 Alias maps and `styleId` in `src/endless/recipe.js`; validator accepts `family: "live-coder"`; verify with `npm run check:styles`
- [x] 2.2 Rename the four files in `styles/` (id, name, family only); verify the recipe content is unchanged apart from those fields with a diff
- [x] 2.3 Stable recipe order (sorted by old id when there is one) where the app and the tools load recipes; verify with a new case in `npm run check:endless` (same session for an artist that explores, before and after)
- [x] 2.4 Apply `styleId` in the director, artists, song filter, Styles tab family label, radio settings, history and playlist sessions; verify with a new Node case that feeds every old id through each path
- [x] 2.5 Built-in songs: `tags.styles` and style texts to the new names, free tag `switch` to `live-coder`, artists and fixtures that name the old ids too (only the alias map keeps them); verify `npm run check:songs`, `npm run check:code` and `npm run check:song-filter`

## 3. Checks, fixtures and docs

- [x] 3.1 `tools/check-endless.mjs`, `tools/check-profiles.mjs`, `tools/check-crescendo.mjs`, `tools/check-compact-code.cjs`: new style ids, check names without Switch; run `npm run check:endless`; if fixtures change, review, write them and bump `DIRECTOR_VERSION` in the same commit
- [x] 3.2 Docs: `docs/STYLES.md` (family and aliases), `docs/ENDLESS.md` (check names), `docs/COMPOSING.md`, `docs/SONG-FORMAT.md`; verify with a search that no doc calls the profile or the styles Switch, except the alias notes
- [x] 3.3 Guide: card "Crescendo" says Live coder in English and Italian; the Styles card if it names the family; verify `npm run check:guide`
- [x] 3.4 Browser checks: `node tools/check-library.cjs` (Styles tab family and names) and `node tools/check-songs-tab.cjs` (filters with the new names); screenshot of the Compose profile menu
- [x] 3.5 Run `npm run check:styles`, `npm run check:endless`, `npm run check:profiles`, `npm run check:crescendo`, `npm run check:song-filter`, `npm run check:code`, `npm run check:guide`, `npm run build`
- [x] 3.6 DEVLOG entry in Italian: new names, alias choice, whether the fixtures moved
