# Design

## Context

The Songs tab (`#34`, change `song-search`) has favourites stored as a list of ids under `coding-misk-favourites`, a view state, and previous and next that follow the visible list. A song stops at its end: the transport loop in `src/main.js` calls `stop()` when the bar passes the song length, except in the radio, in hand mode or with a section loop. The player bar has previous, play, stop and next, a timeline and the volume.

## Goals / Non-Goals

**Goals:**
- Playlists with favourites as the first one, managed in their own tab and usable from the Songs tab.
- Continuous playback with shuffle and repeat, from the player bar.
- Pure, testable queue logic.

**Non-Goals:**
- Radio sessions inside playlists (new issue).
- Transitions between songs (`#23`): a plain cut at the end of each song.
- Syncing playlists between devices.

## Decisions

### Store

One key `coding-misk-playlists`: `{ format: 1, lists: [{ id: 'favourites', name: null, songs: [...] }, { id: 'p-<time>', name: 'Night run', songs: [...] }] }`. Favourites has the fixed id `favourites` and a translated name. On first load, ids from `coding-misk-favourites` move into Favourites and the old key is removed. The Songs tab's star reads and writes Favourites through the store instead of its own list.

### Queue module

A pure module builds the play order and answers "what next": `createQueue({ ids, start, shuffle, repeat, rng })` with `next()`, `prev()`, `current`, `position`, `setShuffle(on)`, `setRepeat(mode)`. Shuffle uses a permutation that keeps the current song first; repeat all with shuffle draws a new permutation. Missing songs are skipped by asking the app whether an id exists. A Node check covers order, shuffle covering every song once, repeat modes and skipping.

### End of song

The transport's end branch (`cyc >= m.bars`) asks the queue: repeat one replays the same song from bar 0; otherwise the next song starts with the same call as a card's play (`startCard`). With no queue and repeat one, the single song replays. Live build songs and code songs work the same way because the start goes through the card path. Hand mode and section loops keep their current behaviour (no advance).

### Player bar

Two new buttons next to previous and next: shuffle (a switch, lit when on) and repeat (cycles off, all, one, with a small "1" badge for one), minimal SVG icons like the volume. While a playlist plays, the title line shows the playlist name and `n / total`. Previous and next use the queue when one is active, else the Songs tab order as today. The buttons are disabled in the radio.

### Playlists tab

A new tab after Songs: a list of playlists (name, songs, total length) and the open playlist as rows (title, kind label, length, up, down, remove, play from here). Dragging uses native drag and drop on desktop and the up and down buttons everywhere (phones). Rename is an inline field; delete uses an in-page confirmation (the same "press again" pattern as elsewhere in the app). New, export and import sit in the tab header, like the Styles and Artists tabs.

### Songs tab

A row of chips above the search: All songs, Favourites, then the user's playlists, plus "Play playlist" when one is picked. The pick is saved in the view state (`list`). With a playlist picked, the default order is the playlist order. "+ Playlist" on each card opens a small in-card menu: the playlists (with a tick where the song already is) and "New playlist…" with a name field.

### Export file

`{ format: "coding-misk/playlist", version: 1, name, songs: [ids], userSongs: [song objects] }`. Import adds user songs whose id is missing (an id clash with different content gets a new id, and the playlist follows it), then the playlist with a free name.

## Risks / Trade-offs

- Auto-advance starts the next song with a cut; a song with a long tail may sound abrupt until `#23`.
- A song removed from the library stays in playlists as an id; it is skipped and shown as missing in the Playlists tab, with a remove button.
- Moving favourites into the store changes a key added in `#34`; the migration runs once and is covered by the browser check.
