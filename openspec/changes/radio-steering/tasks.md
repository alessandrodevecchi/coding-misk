# Tasks

## 1. Rewrite engine

- [ ] 1.1 Refactor `directSong` with `keep`, `from`, `forced`, `locked`; seed fixtures unchanged
- [ ] 1.2 Extract sections from a plan into a helper used by `planSong` and the rewrite
- [ ] 1.3 `session.next()` returns the plan; `src/endless/steering.js` with `redirect` and every command of the table
- [ ] 1.4 Checks: each command changes the song from the boundary only, energy up raises measured energy, drop / stay / end change the length, locked tracks untouched, same steering same song

## 2. Radio

- [ ] 2.1 Queue with apply bar, cancel, rewrite and window swap; stream relayout on length changes
- [ ] 2.2 Console with groups, disabled states, tooltips with shortcuts; keyboard shortcuts while the Radio tab is open
- [ ] 2.3 Scope switch (remembered); session scope moves the sliders
- [ ] 2.4 Editable energy curve on the now playing card
- [ ] 2.5 Mixer strip: volume (pinned), mute, lock, change instrument
- [ ] 2.6 Recipe `steering` and replay; listener steps marked in the code

## 3. Checks and docs

- [ ] 3.1 Browser check: a command queues and applies at its bar, cancel, curve drag, mixer, replay with steering, no errors
- [ ] 3.2 New issue for a view with several curves; docs `ENDLESS.md`, `ARCHITECTURE.md`, README, `AGENTS.md`, `DEVLOG.md`; all checks
