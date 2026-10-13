# Tasks

## 1. Guard

- [x] 1.1 Decode guard and sound wrapper with the register (static list plus learned entries by library version), zone learning for soundfonts, stand-in retry; pure parts checked in Node.
- [x] 1.2 Install the guard in the app and in the render page; the vibraphone top zone and the misspelled bass font play from stand-ins live and in exports.

## 2. Export and radio

- [x] 2.1 Pre-flight check in the render page: distinct sounds per block loaded with a time limit before rendering; replaced and skipped sounds reported to the app.
- [x] 2.2 Radio preload of the next song's sounds.

## 3. Tool and docs

- [x] 3.1 `tools/check-sounds.cjs`: every soundfont zone and sample the app can call; summary and exit code.
- [x] 3.2 Run the full check in the background; record the results in `#54`.
- [x] 3.3 Guide, architecture notes and DEVLOG.
