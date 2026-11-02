Estimate: about 1 agent hour.

## 1. Store and pick (0.25 h)

- [ ] 1.1 `src/voices/phrases.js`: add `any` to `KINDS`, `TAGS.any = []`, `validTag` true only for no tag, `groupsOf` lists Any last
- [ ] 1.2 `src/voices/mine.js`: `candidates()` keeps `p.kind === kind || p.kind === 'any'`
- [ ] 1.3 `src/voices/phrases.js`: merge on `editPhrase` to Any (older id, uses summed, styles united); reuse on `addPhrase` when the text exists as Any

## 2. Form and labels (0.25 h)

- [ ] 2.1 `src/voices/voices-tab.js`: Any in the kind select, tag select hidden for Any, tag cleared on switch, row label "Any", Any chip with count, Undo toast after a merge
- [ ] 2.2 `src/i18n.js`: EN and IT labels and hint

## 3. Samples per speaker (0.25 h)

- [ ] 3.1 `src/main.js` (`lineSamples`, sample preparation): one need per distinct speaker bank of the voice track and the narrator for an Any phrase
- [ ] 3.2 `src/voices/samples.js`: `phraseFiles` and the usage and protect lists count an Any phrase in every speaker's bank, as used by all three

## 4. Checks (0.25 h)

- [ ] 4.1 `tools/check-phrases.mjs`: pick with Any, tag match, merge, reuse, snapshot
- [ ] 4.2 `tools/check-voices-tab.cjs`: form, row label, merge, delete count with two speakers
- [ ] 4.3 Run `check:phrases`, `check-voices-tab.cjs`, `check:samples`; add the DEVLOG entry
