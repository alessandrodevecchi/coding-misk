Estimates in agent hours, for the recommended answers in design.md. Total: about 4 (3 to 6).

## 1. The failing check first (1.5 h)

- [x] 1.1 `tools/check-hand.cjs`: a helper `midEdit()` that waits until the editor shows a typing frame different from both the code playing and the step's target (half-typed), then returns; verify it finds one on Primo Segnale within 30 s
- [x] 1.2 New block after "the next step still writes the code": take over with a key in the middle of an edit, then assert the code equals the step's target plus the key (no half-typed line), "BY HAND" shows, and Ctrl+Enter evaluates with an empty `evalError`; run on `develop` with the voice samples present and see it fail (the bug reproduced)
- [x] 1.3 Same block with a paste and with Backspace in the middle of an edit; and a takeover in the middle of the "Resume live build" typing; all fail on `develop`
- [x] 1.4 A takeover during the listening pause (Live coder profile): the code stays the code playing plus the key

## 2. Completion on takeover (1 h)

- [x] 2.1 `src/main.js` `takeOver()`: complete the active typing (`resumeTo` before `typing`) with `plan.frame(Infinity)` through `setCodeRange` when it has shown a frame and belongs to the current song; else the tk1 fallback (restore the code playing); verify with 1.2-1.4 passing
- [x] 2.2 Cursor inside the replaced range moved to its end (tk4); verify in 1.2 that the typed key lands after the completed line
- [x] 2.3 Coder frames and the completion out of the undo history (tk2); verify in the check that one Ctrl+Z after the takeover removes only the user's key and a second leaves valid code

## 3. Hint (0.5 h)

- [x] 3.1 Short highlight of the completed lines (tk3), code theme colour, none with reduced motion; verify with a screenshot in the check's shots dir, neon, light and hardware themes

## 4. Regression and docs (1 h)

- [x] 4.1 `check-hand.cjs` three times in a row and twice in parallel with the voice samples; `check-timeline.cjs` (growth column by hand), `check-steering.cjs --typed` (Radio), `check-crescendo-play.cjs`, `npm run check:code`, `npm run check:guide`; all pass
- [x] 4.2 Radio: a manual or scripted takeover mid-edit on the song on air, Ctrl+Enter without error (add to `check-hand.cjs`'s radio part)
- [x] 4.3 Docs: "Hand coding" in `docs/knowledge/live-build.md`, the hand live coding section of `docs/ARCHITECTURE.md`, the hand Guide card in `src/guide.js` (English and Italian) if its text changes; `npm run knowledge`, `npm run check:knowledge`; DEVLOG in Italian

## Workflow follow-up

- Show the proposal and the open questions tk1-tk6 to the owner; implement after the go.
- Open an issue for the fix if the owner wants one, and use `fix/<issue>-takeover-pending-edit` for the code.
- Archive the change after the merge into `develop`.
