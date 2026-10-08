# Proposal

## Why

The Songs tab now holds built-in songs, hand-written code tracks, the owner's songs and songs saved from the radio, and finding one means scrolling the whole page (#34). Songs only describe their genre in free text, so nothing can be filtered, and songs saved from the radio lose the sign that they were generated.

## What Changes

- **One list** in the Songs tab: composed and code songs together, each card with a label for its kind (standard, live build, generated, mine, code) and its tags.
- **Two kinds of tag plus free tags:**
  - **Genre:** a fixed, broad list (techno, trance, house, synthwave, drum and bass, industrial, rock, metal, hip hop, pop, jazz, country, ambient, experimental).
  - **Style:** the id of a style recipe. The name shown comes from the style, so renaming a style renames the tag and a new style is a new tag at once. Every style declares its genre, so a song's genres follow from its styles, plus extra genres a song can name itself.
  - **Free tags:** any word (for example jingle, arcade, trip-hop). Built-in songs have some; the user can edit the tags of their own songs.
- **Search bar:** matches title, style and genre names, key and free tags.
- **Filters:** chips for genre, style and kind, and "favourites only".
- **Favourites:** a star on every card, kept in the browser.
- **Sorting:** default order, title, BPM, length.
- Search, filters and sorting are remembered in the browser.
- **Generated songs** carry their styles and genres as tags, and keep the generated label when saved from the radio.
- Playlists are out of scope (#36); favourites are designed so they can become the first playlist.

## Capabilities

### New Capabilities

- `app/song-library`: song tags (genres, styles, free), kind labels, search, filters, favourites and sorting in the Songs tab.

### Modified Capabilities

- `endless/style-recipes`: every recipe declares its genre from the fixed list.
- `endless/radio-history`: a saved song keeps its generated label and tags.

## Impact

- Song format v2 gains an optional `tags` object and an optional `origin` field; the validator checks them. Existing songs stay valid.
- Every file in `styles/` gains `genre`; the recipe validator and the Styles tab show and check it. User styles without a genre get a default and a warning.
- All built-in songs in `songs/` get tags. The director writes tags and origin in generated songs (seed fixtures change).
- `src/main.js` Songs tab rendering, new module for search and filters, `index.html`, `src/style.css`, `src/i18n.js`.
- Checks: song validation, `check:endless`, a new browser check for the Songs tab; docs `SONG-FORMAT.md`, `STYLES.md`, `ARCHITECTURE.md`, README, DEVLOG.
