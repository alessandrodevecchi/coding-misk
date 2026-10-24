---
id: library
related: [songs, radio, patterns, export, settings, styles]
code: [src/library/songs-view.js, src/library/song-filter.js, src/library/playlists.js, src/library/trash.js, src/settings/backup.js, src/live/card-duration.js]
checks: [npm run check:song-filter, npm run check:playlists, npm run check:trash, node --no-warnings tools/check-backup.mjs, npm run check:durations]
---

# Library

## What it is

The library is everything the user keeps in the browser: songs, versions, playlists, patterns, styles, artists, radio history and settings. The Songs tab shows built-in and saved songs. The Playlists tab plays them in order.

Nothing leaves the browser unless the user exports it. A backup file holds it all.

## How it connects

- **Songs.** Built-in songs come from `songs/`. A saved copy of a built-in song overrides it by id ([songs.md](songs.md)).
- **Styles.** A song's style tags add their genres to its own ([styles.md](styles.md)).
- **Radio.** A radio song can be saved as a normal song. A whole session can join a playlist, with the moves made while listening ([radio.md](radio.md)).
- **Patterns.** Saved patterns are part of the backup ([patterns.md](patterns.md)).
- **Export.** A playlist or a session exports as one file ([export.md](export.md)).
- **Settings.** Backup, import and reset live in Settings ([settings.md](settings.md)).

## Options

**Songs tab.** Search by title, style, key or tag. Filters: genre, style, kind, never heard, build style, favourites, the Test chip. Sorting, previous and next.

**Card length.** A card shows the song as its configuration plays it, with its trial when it has one (song-own-settings): songs as written unless their configuration grows them (the Live build on with Crescendo or Live coder), those with their grown length. A song with a trial shows "configuration changed" and a ↺ next to it; its length is keyed by the song with the trial as its `config`, so it grows in the page worker. Built-in lengths come from `src/library/song-durations.json` (`npm run durations`); the user's growing songs grow in the page worker when their card is on screen, and the browser keeps the length by song version. Until then the card shows the written length. The timeline of a card is the written song: a seek on it lands after the growth span.

**Tags.** `genres` from a fixed list, `styles` (recipe ids), `free` tags. The free tag `test` marks test songs; the Test chip filters them.

**Trash.** Deleting a song moves it to the trash for 30 days. Restore brings it back; built-in songs deleted stay hidden in this browser. Playlists drop deleted songs.

**Playlists.** Favourites is a playlist. Shuffle, repeat, and Mix between songs. A radio session in a playlist replays as heard. Freeze stores its songs, so it never changes with the director.

**Profiles in the Mix (radio-profiles D2).** Each saved song in the Mix plays with the profile it has alone: its own configuration, or its trial (song-own-settings). A Crescendo or Live coder song plays its grown build with the controls it has alone, in its own view, like the radio: the next song comes in hidden on its own orbits and appears whole when it goes on air. A Mix of Classic songs plays as before. The songs of a radio session in the Mix keep the controls they had on air.

**Session versions (D11).** A session item records `version` (the director) and, when it holds a grown song, `shapes` and `growth`. It shows "may sound different" with Freeze when any recorded version differs from the app's; a frozen session never warns. Freeze stores grown songs as heard, marked `grown`.

**Versions.** Code written by hand can be saved as a new version of a song. Old hand code is upgraded once (`upgradeCode`, `CODE_VERSION`).

**Backup.** Export writes one file. Import merges it: items are joined by id, nothing is lost.

## Example

A saved song with tags:

```json
{"id": "my-night", "title": "My night", "tags": {"genres": ["techno"], "styles": ["berlin-techno"], "free": ["test"]}}
```

It shows under techno, under the style Berlin techno, and with the Test chip on.

## Where to read more

- [docs/ARCHITECTURE.md](../ARCHITECTURE.md#persistence-keys): browser keys.
- [docs/SONG-FORMAT.md](../SONG-FORMAT.md#song): `tags`, `created`, `appVersion`.
- The Guide cards `songs`, `songs-trash` and `playlists` in `src/guide.js`.
