# Proposal

## Why

Playlists hold saved songs only (#36). A radio session the listener liked cannot be put in a playlist and heard again in order with other songs (#38).

## What Changes

- **A radio session as a playlist item:** saved as the session was heard: seed, settings and their changes, console moves, curve edits, extensions, song 0 when there is one, and the number of songs heard. In a playlist it plays those songs, then the playlist moves on.
- **Adding:** "+ Playlist" for the session on air in the Radio tab, and on each session of the radio History.
- **Director updates:** each session item records the director version; when the app's director is newer, the item shows "may sound different". A "Freeze" action stores the session's songs in the item, so it sounds the same forever (the item gets bigger).
- **Mix:** with Mix on, a session joins the item before and after it with a transition, like songs.
- **Export and import** of a playlist carry its sessions.

## Capabilities

### New Capabilities

- `app/playlist-sessions`: session items, adding them, playing them in a playlist, the version warning, Freeze, Mix, export and import.

### Modified Capabilities

None.

## Impact

- `src/library/playlists.js` (session items in the store, queue, export, import), `src/endless/director.js` (a director version), `src/radio/radio.js` (playing a saved session for a number of songs, "+ Playlist"), `src/main.js` (queue hands a session to the radio and takes it back), `src/library/playlists-tab.js`, `src/i18n.js`, `src/guide.js`.
- Checks: `check-playlists.mjs` (store, queue, export with sessions), browser check (add, play, move on, freeze); docs, DEVLOG, `PROVE-v0.6.0.md`; a rule to bump the director version when the endless fixtures change.
