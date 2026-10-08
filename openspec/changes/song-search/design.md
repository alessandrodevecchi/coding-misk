# Design

## Context

The Songs tab renders every song as a card in two blocks: composed songs (built-in files in `songs/`, the user's songs in browser storage) and hand-written code tracks (`CODED` in `src/content.js`). The only description is the free text `style` (`{ it, en }`). Songs saved from the radio get a new id `u-<time>` and lose the `endless-` prefix, the only sign that they were generated. The player bar's previous and next follow the same card order. Style recipes (16 in `styles/`, plus the user's in browser storage) have `id` and `name` but no genre.

## Goals / Non-Goals

**Goals:**
- Find any song in a few keystrokes or clicks, with tags that stay in exact step with the style library.
- Keep the song format backward compatible: tags and origin are optional.
- Keep search and filtering pure and testable without a browser.

**Non-Goals:**
- Playlists (#36). Favourites are stored as a plain list of song ids so they can become the first playlist later.
- Syncing favourites or tags between devices.
- Tags on radio sessions or on styles beyond their single genre.

## Decisions

### Song format: `tags` and `origin`

```json
"tags": { "genres": ["pop"], "styles": ["progressive-house"], "free": ["jingle"] },
"origin": "endless"
```

All three lists are optional. `origin` is `"endless"` for director songs and absent otherwise; it survives saving because the radio stores the whole song. Free tags are lowercase, trimmed, at most 24 characters. Alternative considered: deriving everything from the `style` text. Rejected, the owner wants exact links to the style library.

### One genre list, shared

`GENRES` lives next to the song format constants (ids `techno`, `trance`, `house`, `synthwave`, `drum-and-bass`, `industrial`, `rock`, `metal`, `hip-hop`, `pop`, `jazz`, `country`, `ambient`, `experimental`), with names in `src/i18n.js`. Both the song validator and the recipe validator import it. A style has exactly one genre; a song can add genres of its own (for example pop on a song with no pop style).

Genres of the built-in styles:

| Style | Genre |
| --- | --- |
| ambient | ambient |
| berlin-techno, dark-cyberpunk | techno |
| classic-rock | rock |
| country | country |
| darksynth, dreamy-cyberpunk, synthwave | synthwave |
| drum-and-bass | drum-and-bass |
| industrial | industrial |
| jazz | jazz |
| lo-fi, phonk | hip-hop |
| melodic-metal | metal |
| progressive-house | house |
| trance | trance |

### Style tags resolve at render time

A song stores style ids only. The card and the chips read names from the current style list (built-in plus the user's), so a rename shows everywhere at once and a new style appears as a chip at once. A style id with no matching style is shown as the raw id, dimmed, and still filters.

### Kind labels

Computed, never stored: `code` for code tracks; `generated` when `origin` is `endless`; otherwise `live build` when the song has build steps, else `standard`. `mine` is a second flag for songs in the user's storage (not built-in, or a built-in the user edited), so a saved radio song is generated and mine.

### Pure filter module

A new module takes the song entries (title, both `style` texts, key text, tags, kind, mine, favourite, BPM, seconds, default index) and the view state, and returns the matching entries in order. Search normalizes with NFD and strips accents, and matches both languages of the style text, so "frigio" and "phrygian" both work. Chips in a group are OR, groups and search are AND. Sort keys: default index, title (locale compare), first BPM, seconds. A small Node check covers it.

### View state and favourites

The view state (`q`, `genres`, `styles`, `kinds`, `favOnly`, `sort`) is kept under `coding-misk-songs-view`; favourites under `coding-misk-favourites` as an array of ids. Both use the existing storage helper.

### Previous and next follow the visible list

The player bar's previous and next walk the filtered and sorted list, since that is what the user sees. When the playing song is filtered out, they use the full list.

### Editing tags

User songs get a "Tags" button on the card that opens an inline panel: genre chips, style chips, and a text field for free tags. Built-in songs show tags read-only. Changes save to the song in browser storage.

### Built-in tags

Each file in `songs/` and each code track gets `tags`, chosen from its current description. Free tags cover what has no genre or style: `jingle` (DCI), `arcade` (Insert Coin), `trip-hop` (Ruggine lenta), `reel` (Neon Rush).

## Risks / Trade-offs

- Adding `tags` and `origin` to director songs changes the seed fixtures in `tests/snapshots/endless.json` and the generated code snapshots; both are updated in the same commit with the reason.
- Rendering all cards on every keystroke could be slow with many saved songs: cards are rendered once and hidden or reordered, not rebuilt, and search waits 120 ms after typing.
- Previous and next following the filter can surprise when the filter changes during playback; the fallback to the full list keeps them working.
- User styles saved before this change have no genre: they load as experimental with a warning, so nothing breaks.
