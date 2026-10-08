# Tasks

## 1. Take over and play by hand

- [ ] 1.1 Detect user edits in the editor (input, delete, paste) and set the `hand` state, stopping any typing animation at once; verify in the browser that typing a character switches to by hand while clicking, selecting and copying do not.
- [ ] 1.2 By hand, skip build steps, comments and the stop at the end, keep the tempo map; verify in the browser that the next step does not change the code, no comment shows, Ctrl+Enter plays an edited value, and the music goes on past the last bar.
- [ ] 1.3 Show the "BY HAND" label and the "Resume live build" button in the code header (Italian and English); verify they appear only by hand.

## 2. Resume and last code

- [ ] 2.1 Resume: keep the user's code, type back to the song's code at the current bar, evaluate on the next bar, go on with the steps; verify in the browser that after resume the next step plays on its bar with its comment.
- [ ] 2.2 Add the "your last code" block (collapsible, copy, back to this code); verify in the browser that back to this code restores the hand state with that code evaluated.

## 3. Radio

- [ ] 3.1 Hold the radio stream by hand (no song change) and resume with the next song on the next bar when the song on air has ended; verify in `tools/check-radio.cjs`.

## 4. Docs and checks

- [ ] 4.1 Document hand takeover in `docs/COMPOSING.md` (live build section), `docs/ARCHITECTURE.md`, README (both languages) and `DEVLOG.md`; add a browser check script `tools/check-hand.cjs` for the Compose scenarios; verify it and `tools/check-radio.cjs` pass, with `npm run build`.
- [ ] 4.2 Hand it to the owner to try, and record the feedback in `DEVLOG.md` and issue #20.
