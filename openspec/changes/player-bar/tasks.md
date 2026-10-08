# Tasks

## 1. Volume

- [ ] 1.1 Insert the volume node after the master output, with volume and mute remembered in browser storage; verify in the browser that 20 % lowers the measured output level to about a fifth and that a WAV export at 20 % has the same peak as at 100 %.

## 2. Player bar

- [ ] 2.1 Add the bottom bar (play and pause, stop, previous, next, title and position, volume and mute, ON AIR) and move `#play` and `#stop` into it; leave room at the bottom of the page; verify in the browser that it shows in every tab, does not hide content, and fits a 400 px screen.
- [ ] 2.2 Style it for the neon and hardware themes; verify with screenshots in both themes.
- [ ] 2.3 Previous and next for library songs and the radio (next skips, previous restarts the song on air); verify in the browser for a library song and the radio.
- [ ] 2.4 Volume next to the radio controls, in sync with the bar; verify in `tools/check-radio.cjs`.

## 3. Checks and docs

- [ ] 3.1 Add `tools/check-player.cjs` for the scenarios above; run it with `tools/check-radio.cjs`, `tools/check-hand.cjs` and `npm run build`; verify all pass.
- [ ] 3.2 Update README (both languages), `docs/ARCHITECTURE.md`, `docs/DESIGN-SYSTEM.md` and `DEVLOG.md`; hand it to the owner to try.
