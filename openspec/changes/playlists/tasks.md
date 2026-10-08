# Tasks

## 1. Store and queue

- [x] 1.1 Playlist store: favourites fixed first, create, rename, delete, add, remove, move, migration from `coding-misk-favourites`
- [x] 1.2 Pure queue: order, next and previous, shuffle (every song once, current first), repeat off, all and one, skipping missing songs
- [x] 1.3 Node check for the store and the queue; npm script

## 2. Playback

- [x] 2.1 End of song asks the queue: next song, replay (repeat one), or stop; single songs replay with repeat one
- [x] 2.2 Player bar: shuffle and repeat buttons with SVG icons, remembered, disabled in the radio; playlist name and position in the title line
- [x] 2.3 Previous and next follow the queue while a playlist plays

## 3. Songs tab

- [x] 3.1 Star reads and writes Favourites through the store
- [x] 3.2 Playlist row (All songs, Favourites, user playlists) with "Play playlist", saved in the view; playlist order as default order
- [x] 3.3 "+ Playlist" menu on each card: tick where present, new playlist with a name

## 4. Playlists tab

- [x] 4.1 Tab with the list of playlists and the open playlist's rows (up, down, remove, play from here, missing songs marked)
- [x] 4.2 Drag and drop reorder; rename inline; delete with in-page confirmation
- [x] 4.3 New, export and import (user songs included, id clashes resolved)
- [x] 4.4 Styles for both themes and phone width

## 5. Checks and docs

- [x] 5.1 Browser check: favourites migration, add from card, reorder, auto-advance (short song), shuffle, repeat one, export and import
- [x] 5.2 Run the existing checks (code, songs, styles, endless, song filter, build, library, player, hand, radio, Songs tab)
- [x] 5.3 New issue for radio sessions in playlists; docs `ARCHITECTURE.md`, README in English and Italian, `AGENTS.md`, `DEVLOG.md`
