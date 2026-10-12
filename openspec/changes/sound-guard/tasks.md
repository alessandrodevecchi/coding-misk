# Tasks

## 1. Guard

- [ ] 1.1 Decode guard and sound wrapper with the register (static list plus learned entries by library version), zone learning for soundfonts, stand-in retry; pure parts checked in Node.
- [ ] 1.2 Install the guard in the app and in the render page; the vibraphone top zone and the misspelled bass font play from stand-ins live and in exports.

## 2. Export and radio

- [ ] 2.1 Pre-flight check in the render page: distinct sounds per block loaded with a time limit before rendering; replaced and skipped sounds reported to the app.
- [ ] 2.2 Radio preload of the next song's sounds.

## 3. Tool and docs

- [ ] 3.1 `tools/check-sounds.cjs`: every soundfont zone and sample the app can call; summary and exit code.
- [ ] 3.2 Run the full check in the background; record the results in `#54`.
- [ ] 3.3 Guide, architecture notes and DEVLOG.
