## Context

See proposal.md for the motivation. Today:

- `src/live/profiles.js` has three profiles: `classic`, `crescendo`, `switch`. The choice is stored in `coding-misk-profile`; overrides in `coding-misk-profile-overrides`. Labels come from `src/i18n.js` (`profile:switch`, `profileHint`, `profileHint:switch`) and the Guide card "Crescendo" says "on in the Switch profile" twice.
- Songs and recipes name a profile with `"profile": "switch"`. The recipe validator (`src/endless/recipe.js`) accepts `classic`, `crescendo`, `switch`.
- Four styles in `styles/`: `switch-acid`, `switch-house`, `switch-trance`, `switch-trance-pure`, all with `family: "switch"`, `profile: "switch"`, `buildStyle: "crescendo"`. The Styles tab shows the family as its capitalised id. A style `trance` ("Driving trance with rolling bass, arpeggios...") already exists.
- Style ids are stored in many places: built-in and user song `tags.styles`; the Songs tab view (`styles` filter); artist taste (`styles` weights, built-in artists do not name these styles); radio settings (`coding-misk-radio`); radio history; radio sessions in playlists (`recipe.options.styles` and steering changes).
- The director builds `byId` from the recipe list. `artistSongOptions` explores the styles an artist does not name in recipe list order, and the app loads recipes in file name order. Renaming files would change that order.
- Built-in songs with these styles: `switch-*` and `prova-*` (13 files). Their ids contain `switch` and stay: ids are keys in favourites, playlists and last played.
- Endless fixtures (`tests/snapshots/endless.json`) use `berlin-techno`, `synthwave`, `jazz`, `country`, `trance`, `phonk`, `ambient`, `lo-fi`: none of the renamed styles.

## Goals / Non-Goals

**Goals:**

- No user-visible "Switch" for the profile or the styles.
- Nothing saved before the rename breaks or sounds different.
- One alias map, used everywhere a style id is read.

**Non-Goals:**

- Renaming built-in song ids or titles.
- Changing what the profile or the styles do.
- Changing the README credits, which are the owner's own text.

## Decisions

### D1. Keep the profile id `switch`

Only labels change: `profile:switch` becomes "Live coder" in both languages, and the hints say "Live coder". The id stays in code, songs, recipes and storage.

Alternative: rename the id to `live-coder` with `switch` as an alias. Rejected for now: it touches stored choices, overrides, 13 song files, the recipe validator and the checks, for no visible gain. The id is never shown.

### D2. New style ids with an alias map

`src/endless/recipe.js` exports `STYLE_ALIASES = { 'switch-acid': 'acid', 'switch-house': 'house', 'switch-trance': 'gated-trance', 'switch-trance-pure': 'pure-trance' }`, `FAMILY_ALIASES = { switch: 'live-coder' }` and `styleId(id)`. The files are renamed and their `id`, `name` and `family` change; nothing else in them changes.

`styleId` is applied where ids enter: `createSession().next()` on `options.styles` (covers radio settings, history replay and saved sessions with their changes), `artistSongOptions` and `validateArtist` on taste keys, `songEntry` and `cleanView` in the song filter, the Styles tab family label, and the radio settings read at start. Stored data is not rewritten; it is resolved when read.

Alternative: migrate stored data once at start. Rejected: backups, exported playlists and songs from older files would still carry old ids, so the alias is needed anyway.

### D3. Stable recipe order

The recipe list given to the director keeps the order it had before the rename: recipes are sorted by their old id when they have one (`acid` sorts as `switch-acid`). So artist exploration and any draw over the list give the same result for the same seed, and saved radio sessions sound the same.

Alternative: accept the new order and bump `DIRECTOR_VERSION`. Rejected: the rename changes nothing musical, so saved sessions should not warn.

### D4. Built-in songs and texts

Built-in songs get the new ids in `tags.styles` and new style texts ("Endless · Acid · E · 133 BPM · slow-burn", "Live-coded trance made for the Live coder profile ..."). Their ids, titles, sections and tracks stay, so `npm run check:code` snapshots and levels do not change. `switch-prima-luce` has the free tag `switch`: it becomes `live-coder`.

### D5. Director version rule

Generated songs carry style ids and names in their tags and style text, so a session with these styles now gives different text, not different sound. The fixtures do not use these styles. If `npm run check:endless` fixtures still match, `DIRECTOR_VERSION` stays. If they change, the change is reviewed, fixtures are written with `--write-fixtures` and `DIRECTOR_VERSION` goes up in the same commit, as AGENTS.md asks.

### D6. Checks and docs

Check names that say "Switch" (`director: Switch songs keep one key...`, `director: Switch · trance pure has no arpeggio...`) are renamed to Live coder and the new style names, and `docs/ENDLESS.md` lists them. `docs/STYLES.md` describes the `live-coder` family and the aliases. `docs/COMPOSING.md` and `docs/SONG-FORMAT.md` say the `switch` profile is shown as Live coder.

## Risks / Trade-offs

- [A place that reads a style id is missed] → A Node check feeds every old id through the song filter, an artist, a session and a playlist session, and expects the new style.
- [A user style named `acid` or `house` already exists in the browser] → The app already keeps the built-in style when a user style has the same id (`allStyles` in `src/main.js`), so the user style would be hidden. The app logs a console warning for such a style at start; the owner's own styles are checked by hand once.
- [The internal id `switch` stays visible in exported song JSON] → Accepted: it is a stable key, documented as the Live coder profile.
- [Song ids like `switch-test-acido` still contain "switch"] → They are ids, not names; the owner sees titles.

## Migration Plan

Files in the repo (built-in songs, artists, fixtures that name these styles) are rewritten to the new ids in the same change, so the repo shows only the new names. The user's data is not rewritten: aliases resolve old ids when read (saved songs, overrides, playlists, backups, older exported files). Rollback: an older app does not know the new ids; songs saved after the change with new tags show them as unknown styles but still play.

## Open Questions

Decided with the owner (2026-10-18):

- **Name for `switch-trance`:** `gated-trance` ("Gated trance" / "Trance gated").
- **Italian names:** "Acid", "House", "Trance gated", "Trance pura".
- **Profile id:** stays `switch` internally (D1); the user only sees "Live coder". Style ids move to the new names, with repo files rewritten and the alias map for the user's data (D2).
