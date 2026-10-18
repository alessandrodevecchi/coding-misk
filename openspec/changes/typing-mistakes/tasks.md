## 1. Visible mistakes

- [ ] 1.1 Typos in `humanKeys`: 3 to 6 keys after the wrong one (cut at the edit end or a line break), a wait of 0.5 to 1 s, backspaces at a person's pace; changes of mind use the same backspace pace; verify with a new case in `npm run check:typing` (a typo shows at least 1 s in a long edit)
- [ ] 1.2 Whole wrong word: word boundaries in strings and function names, wrong word from the same kind in the target code or two letters swapped, at most one per edit; verify with a new case (the frame shows the wrong word, the last frame is exact)
- [ ] 1.3 Pasted long lines: new unlike lines of 60 characters or more, about 1 in 3, seeded, never comments or voice code; verify with a new case (the line appears whole in one frame)

- [ ] 1.4 Variable rate by stretch (design D6), seeded; verify with a new case (two stretches of the same song have different counts, same song same counts)
- [ ] 1.5 Mistakes switch (design D7): `CONTROLS.mistakes`, Switch on, Compose control under Human typing, `liveMistakes` strings in English and Italian; verify `npm run check:profiles` and a case with the switch off (no mistakes, same pace)

## 2. Time and seeds

- [ ] 2.1 `humanPlan` fallback order: full, without wrong words and paste pauses, lean, lean scaled; verify with a new case where a long edit has 3 s and ends exact in time
- [ ] 2.2 Same seed same plan, exact style frames identical to before; verify with `npm run check:typing`, `npm run check:profiles` and `npm run check:crescendo`

## 3. Checks, Guide and log

- [ ] 3.1 Measure on the Switch songs (`switch-prima-luce`, `switch-tappe`, `switch-trance-prova`): typos per minute, seconds each typo stays on screen, steps that fell back to lean; report in the DEVLOG
- [ ] 3.2 Screenshots in the browser of a typo before its fix and of a wrong word; a fast video of one Switch song shows the same mistakes as real time
- [ ] 3.3 Guide card "Crescendo" in `src/guide.js` (Human typing: mistakes stay on screen, a wrong word, pasted lines) in English and Italian; `liveHumanHint` in `src/i18n.js` in both languages; verify `npm run check:guide`
- [ ] 3.4 Run `npm run check:typing`, `npm run check:profiles`, `npm run check:crescendo`, `npm run check:video`, `npm run check:guide`, `npm run build`
- [ ] 3.5 DEVLOG entry in Italian: new timings, measurements, anything learned
