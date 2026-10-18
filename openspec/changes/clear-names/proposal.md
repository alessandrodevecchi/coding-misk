## Why

The profile "Switch" and the styles "Switch · acid", "Switch · house", "Switch · trance" and "Switch · trance pure" carry a name that says nothing to a new user (#64). The profile is about growing a song like a live coder; the styles are genres. Clear names make the Compose menu, the Styles tab and the radio easier to read.

## What Changes

- **Profile "Switch" becomes "Live coder"** in every interface text, hint and Guide card, in English and Italian. Its internal id stays `switch`, so saved choices, overrides, songs and styles that name it keep working.
- **The four styles get genre names and new ids:**

  | Old id | New id | English name | Italian name |
  | --- | --- | --- | --- |
  | `switch-acid` | `acid` | Acid | Acid |
  | `switch-house` | `house` | House | House |
  | `switch-trance` | `gated-trance` | Gated trance | Trance gated |
  | `switch-trance-pure` | `pure-trance` | Pure trance | Trance pura |

  There is already a style `trance` ("Driving trance"), so `switch-trance` cannot become `trance`; `gated-trance` names its gated supersaw sound.
- **Old style ids keep working** through an alias map: saved songs and their tags, the Songs tab filters, user artists, radio settings and radio sessions saved in playlists.
- **The style family** `switch` becomes `live-coder`, shown as "Live coder".
- **Built-in songs and docs** use the new names: style tags and description texts of the built-in songs, `docs/STYLES.md`, `docs/ENDLESS.md`, `docs/COMPOSING.md`, `docs/SONG-FORMAT.md`, the Guide.
- **Sound unchanged:** no recipe content changes, only ids and names.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `live-build/profiles` (change `performance-profiles`): the profile shown as Live coder, its id kept (requirement added here).
- `endless/style-recipes`: the live coder style family with genre names, and old style ids resolved by alias (requirements added here; they rename the "Switch style family" of change `switch-styles`).

## Impact

- **Code:** `src/i18n.js` (profile label and hints), `src/live/profiles.js` (comments only), `styles/*.json` (four files renamed, `family`), an alias map in `src/endless/recipe.js` used by `src/endless/director.js`, `src/endless/artist.js`, `src/library/song-filter.js`, `src/library/styles-tab.js`, `src/radio/radio.js` and `src/main.js`.
- **Data:** built-in songs in `songs/` (tags and style texts only, ids unchanged); no change to `artists/*.json` (none names these styles).
- **Checks:** `tools/check-endless.mjs`, `tools/check-profiles.mjs`, `tools/check-song-filter.mjs`, `npm run check:styles`, `npm run check:code`; endless fixtures under the director version rule.
- **Docs:** Guide cards in English and Italian, the docs listed above, DEVLOG.
