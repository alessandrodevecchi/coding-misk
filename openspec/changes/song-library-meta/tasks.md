## 1. Metadata

- [x] 1.1 Song fields `created` and `appVersion`: validator, `docs/SONG-FORMAT.md`
- [x] 1.2 Written on save in Compose, from the radio and by the director
- [x] 1.3 `tools/song-dates.mjs` fills the songs in `songs/` from git; `package.json` version aligned with the releases
- [x] 1.4 Play tracking (10 seconds), `coding-misk-played`, in the settings backup

## 2. Library

- [x] 2.1 Sorts: recently created, recently played; filters: never played, build style
- [x] 2.2 Pages of 20 after filtering (both above and below the list), counter, page in the view state, reset on change
- [x] 2.3 Card: creation date, build style mark; English and Italian

## 3. Checks and docs

- [x] 3.1 `check:song-filter`: sorts, filters, pages across the whole list
- [x] 3.2 Backup check, `check:songs`, browser check of the Songs tab
- [ ] 3.3 Screenshots for the owner; Guide, docs, DEVLOG
