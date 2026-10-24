## 1. Narrator switch

- [x] 1.1 Control `narrator` (on by default) in `src/live/profiles.js`; old profiles load as on; the live build and the radio leave out spoken step lines when off; verify with a Node case (no voice lines, same music) and `node tools/check-live-code.mjs` (never --write)
- [x] 1.2 Fully narrated disabled when the narrator is off, with a hint

## 2. Panel

- [x] 2.1 The switch next to Fully narrated in Compose and in the radio Custom section; strings in English and Italian; a browser check; screenshot for the owner

## 3. Docs

- [x] 3.1 Guide card, knowledge notes (profiles, narrator), DEVLOG entry in Italian

## 4. Follow-ups after the owner's tests

- [x] 4.1 With the narrator off the step phrase is hidden over the stage, in the studio scene info, in the radio and in videos
- [x] 4.2 Live build off: the panel shows the code options (comments, technical functions, title, lit notes, line breaks); the profile, build style, growth and narrator controls only with the Live build on; options away from the defaults route the song as written through the live code; check:mixer and the compact code check cover a Classic song with the Live build off and the short and mixer presets
- [x] 4.3 Guide, knowledge notes, DEVLOG entry in Italian
