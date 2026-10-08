# Proposal

## Why

Songs play one at a time and stop at the end, so listening to a set means pressing play on every card (#36). The owner wants playlists, with favourites (from #34) as the first one, and the usual player controls: continue to the next song, shuffle, repeat.

## What Changes

- **Playlists of songs.** Favourites is the first, fixed playlist (it cannot be renamed or deleted); the user creates as many others as they want. Each keeps its own order.
- **Playlists tab** to manage them: create, rename, delete, reorder songs (drag, or up and down buttons), remove songs, play from any song, export and import as JSON.
- **Songs tab:** a playlist row above the filters (All songs, Favourites, the user's playlists). Picking one shows its songs in its order and a "Play playlist" button; search and filters still narrow what is shown.
- **"+ Playlist" on every song card:** add to an existing playlist or to a new one.
- **Playback:**
  - at the end of a song the next one in the playlist starts by itself (a plain cut; designed transitions come with #23);
  - shuffle;
  - repeat: off, the whole playlist, or one song. Repeat one also works for a single song outside a playlist.
  - the controls sit in the player bar; previous and next follow the playlist while one plays.
- **Export and import:** a playlist file holds the song ids and a copy of the user's own songs it uses, so it works in another browser.
- **Out of scope:** radio sessions in playlists (by seed and settings). They go to a new issue, since a director update can change how a seed sounds.

## Capabilities

### New Capabilities

- `app/playlists`: playlists, the Playlists tab, the playlist row and "+ Playlist" in the Songs tab, playback order with auto-advance, shuffle and repeat, export and import.

### Modified Capabilities

None in `openspec/specs/`. The player bar (`player-bar`) and the Songs tab (`song-search`) are still open changes; their behaviour with playlists is described in `app/playlists`.

## Impact

- New modules for the playlist store and the play queue (pure, checked in Node) and for the Playlists tab.
- `src/main.js`: end of song, previous and next, the Songs tab row and the card button; `index.html` (new tab and player bar buttons), `src/style.css`, `src/i18n.js`.
- Favourites move from `coding-misk-favourites` into the playlist store; the old key is migrated once.
- Checks: a Node check for the queue and the store, a browser check for the tab and playback; docs `ARCHITECTURE.md`, README, DEVLOG, AGENTS.
