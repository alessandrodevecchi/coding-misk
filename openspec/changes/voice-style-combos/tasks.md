# Tasks

## 1. Config and module

- [ ] 1.1 Add `src/voices/combos.json` (`format: 1`, a full all-allowed list per speaker of `real-voices` and `default` for `en` and `it`) and `src/voices/combos.js` with `allowedStyles`, `allowedForDraw`, `isAllowed` and `combosErrors` (design D1, D2); verify with `check:voice-combos` tests: no entry allows all, `clear` always allowed, an English-only speaker is bound by `it.default`
- [ ] 1.2 Add `tools/check-voice-combos.mjs`, the `check:voice-combos` script in `package.json` and the validation rules of design D7; verify it fails on a temporary file with an unknown speaker, an unknown style, a wrong language, a duplicate and a non-list, and warns on an empty list

## 2. Draws

- [ ] 2.1 Filter the character pick in `voiceFor` (`src/endless/director.js`), including the artist's weights, by `allowedForDraw(speaker)`; empty gives no character (D3); verify with a `check:spoken` test over 300 seeds that a limited speaker never gets another character and that an all-allowed file gives byte-identical songs
- [ ] 2.2 Filter the voice instrument character list by speaker (D3 point 2); verify with a `check:spoken` test for `chop` and the other ways
- [ ] 2.3 Narrator step: with a chosen style and no fixed speaker, redraw the speaker among those that allow it, only on a conflict (D5); verify that an all-allowed session is unchanged and a conflict gives an allowed pair
- [ ] 2.4 Check that Crescendo, Live coder, Compose growth and the artist maker add no draw of their own (they reuse `voiceFor`), by a `check:spoken` test over a Crescendo and a Live coder session with a narrowed file; verify no pair outside the list

## 3. Hint and Voices tab

- [ ] 3.1 Mark not-allowed options with a note in the style selects of `src/main.js` (`vstyleHtml`) and `src/endless/voice-sound.js`, updating when the speaker changes; strings in both languages in `src/i18n.js`; verify with `tools/check-voices.cjs` (option stays selectable, note shown) and `npm run check:guide`
- [ ] 3.2 Add the bench status line to `src/voices/voices-tab.js` (design D9); verify with `tools/check-voices-tab.cjs` in both languages and a screenshot in neon and light at 400 px

## 4. Versions and fixtures

- [ ] 4.1 Raise `DIRECTOR_VERSION` by one over `develop` at merge time (design D8); verify with `npm run check:endless` that, with the all-allowed file, only the version line differs
- [ ] 4.2 When the owner narrows the file, run `check:endless`, `check:code` and the radio checks without writing: only voice parts may move, never `music`; then regenerate the shared fixtures once, after the last of `varied-openings`, `real-voices` and this change merges

## 5. Docs and release

- [ ] 5.1 Document the file and the rule in `docs/knowledge/voice.md`, `docs/ENDLESS.md` (Voice) and `docs/VOCALS.md`; add `check:voice-combos` to the `AGENTS.md` Tooling list and `docs/knowledge/checks.md`; verify `npm run check:knowledge`
- [ ] 5.2 Add the entries to `CHANGELOG.md` under `## [Unreleased]` and a `DEVLOG.md` entry; verify the full check list of `AGENTS.md` passes
