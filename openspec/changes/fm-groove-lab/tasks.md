# Tasks

Code starts only after the owner says go. The owner answered the open questions on 2026-10-28 (design.md, Owner Decisions).

## 1. FM lab module

- [x] 1.1 Add `src/sounds/fm-lab.js` with `FM_CARDS` (D2): kind, names in both languages, carrier, `fm` device, part and preset, tempo, octave, the maximum FM amount by the octave rule.
- [x] 1.2 Add `fmWave(card, index, opts)` (D5) and `fmRise(expr, top)` (D4), and the loop of a card for each mode (`loopSong` with the rack).
- [x] 1.3 Add `npm run check:fm-lab` (Node): one card per FM kind of `SOUND_KINDS`; each patch passes `fmInRange` and the kind's rule; FM 0 draws the plain carrier; the drawing matches a direct numeric integration; every mode's expression evaluates with Strudel in Node; the FM rise goes from 0 to the top over 4 bars.

## 2. Sounds tab

- [x] 2.1 Add the "FM" category, its cards (wave thumbnail, names, headphones) and search by name and "fm" in `src/sounds/browser.js` (D1).
- [x] 2.2 Add the card detail: the four drawings, the FM amount control, the scope, "Use in track" and Copy (D5, D6, D7). Both themes and phone width (two by two drawings below 600 px).
- [x] 2.3 Add the mode selector (D4): three chips Frase, Nota tenuta, Salita FM, Phrase selected when the tab opens, the mode kept across cards, the explaining line under it.
- [x] 2.4 In the hardware theme, give the FM amount `data-fader="h"` (D5): a horizontal fader centred under the drawings, at most 320 px wide, full card width below 600 px; keyboard on the hidden input.
- [x] 2.5 Add the strings in `src/i18n.js` in both languages (D8).

## 3. Lab preview

- [x] 3.1 Add the optional `analyze` id to `previewExpression` (default none) and check that Compose and the radio previews keep the same expression (`npm run check:preview`).
- [x] 3.2 Add `labPreview` in `src/main.js` (D3): source from the selected card, mode and amount; orbit 30; one preview at a time with the Compose preview; stop on leaving the Sounds tab, on an export or a recording; swap at the next bar.
- [x] 3.3 Draw the scope from `getAnalyzerData('time', 'fmlab')` with a zero-crossing trigger; skip `fmlab` in the stage visual (`src/visuals.js`).
- [x] 3.4 "Use in track": the wave and the FM device on the selected track through `useSound` and the rack; disabled with a reason without a melodic track.

## 4. Checks and docs

- [x] 4.1 Add `tools/check-fm-lab.cjs` (dev server): every card plays alone and over a song without changing the main player; one preview at a time; stop on leaving the tab and on export; Phrase selected at first, the mode kept when switching cards, the explaining line for each mode; modes and amount swap at the next bar; in the hardware theme a horizontal fader (no knob), centred, at most 320 px wide; the scope's zero crossings for a held note match the drawing within 10%; peaks below 0.97 for every card and mode at the top amount; Italian and English labels; screenshots in both themes at 400 px.
  Done with two differences: the scope is compared with the drawing through the RMS frequency (in the range the formula gives over the modulator's start phases and the envelope), because the zero crossings depend on that phase, which superdough does not fix; the stop on an export is not driven in the browser (it uses `busy()` as the Compose preview).
- [x] 4.2 Run `npm run check:fm-lab`, `npm run check:preview`, `npm run check:guide`, `npm run check:knowledge`, `npm run build`, and the browser checks for preview, sounds and the new lab.
- [x] 4.3 Update the Sounds card in `src/guide.js` (both languages), `docs/knowledge/sounds.md` (the FM section and the formula), `docs/knowledge/glossary.md` (FM amount, lab preview), `docs/ARCHITECTURE.md` (the third preview), `docs/knowledge/decisions.md` (D1, D9), the AGENTS.md tool list and `DEVLOG.md`.

## 5. Owner review

- [ ] 5.1 Screenshots (both themes, 400 px) and a short listening list for the owner: every card in each mode, the FM amount, over a song. Listening is left to the owner.

## Follow-ups (not tasks of this change)

- Riser sounds as their own change (design D9).
- An issue for the FM-like effects (design D10): Fold, the Ring trial, then Ring and Fast vibrato only if the trial satisfies the owner.
