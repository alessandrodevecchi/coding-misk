## 1. Counters and less repeated work

- [ ] 1.1 `stats` option in `crescendoSong` and `tools/growth-probe.mjs` with `npm run growth:probe`; numbers before the change recorded in the DEVLOG
- [ ] 1.2 One measure per tried shape and the code of each bar computed once per measure; `check:crescendo -- --full` fixtures unchanged; numbers after the change

## 2. Growth in the background

- [ ] 2.1 A Compose worker, terminated by a newer request; every growth change in Compose goes away from the page (profile, build style, growth, duration, shape, Fully narrated)
- [ ] 2.2 Drawn growing mark next to the profiles and on Play, tooltips in English and Italian; Play and export wait for the growth; without a worker the page grows as today
- [ ] 2.3 Browser check: Live coder and the shape menus answer within a frame budget on luci-rosse, settimo-cielo and kellerlicht; Play waits and starts grown; screenshot for the owner

## 3. Stored growths

- [ ] 3.1 IndexedDB store with a cap of 60 and least recently used out; growth hash from `vite.config.js`; quiet failures
- [ ] 3.2 Browser check: a reload opens a grown song at once; the cap holds; a changed hash empties the store

## 4. Docs

- [ ] 4.1 Guide (Profile card), knowledge notes (profiles, checks, decisions), AGENTS tooling line for `growth:probe`, DEVLOG entry in Italian
