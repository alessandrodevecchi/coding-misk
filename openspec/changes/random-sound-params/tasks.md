# Tasks

## 1. Format and writer

- [ ] 1.1 Add `tone: null` to `DEFAULT.drums` and `vary: null` to the drum and melodic channels (`src/music.js`); keep `settingsFor` and Crescendo (`src/song/crescendo.js:278`) from copying or ramping them; reject them in live build `set` steps (`src/song/build.js:569`). `npm run check:code` must not move.
- [ ] 1.2 Add `src/material/tone.js` (`TONE_RANGES`, `toneInRange`) and the tone code in the drum writer (`src/music.js:483-490`), per D2: order, one call per control, the open hat rule.
- [ ] 1.3 Add `src/material/variation.js` (`VARY_TARGETS` with caps, `varyRange(entry, value)`) and the variation code in the drum and synth writers, built with `randomCode`, per D4: relative ranges, controls merged in place, automated and rack-written targets skipped, `vowel` with `pick`.
- [ ] 1.4 Validator (`src/song/validate.js`, `src/song/ideas.js`): every error and warning of the specs, with JSON paths; add the cases to `tools/check-idea-errors.mjs`. Document `tone` and `vary` in `docs/SONG-FORMAT.md`.

## 2. Drum tones

- [ ] 2.1 `compose('tone', { seed, style, energy })` from the `material:tone` stream, one sub-stream per group (D3); the energy direction; `groove()` unchanged.
- [ ] 2.2 Check in the browser that `.decay().sustain(0)` shortens a drum sample and `.speed()` tunes it on three kits; if `decay` is ignored, use the form that works and update D2.
- [ ] 2.3 `check:material`: ranges, determinism, independent groups, energy direction, groove fixtures unchanged.
- [ ] 2.4 Measure peaks of toned rows in the browser over every style (D9) and narrow `TONE_RANGES` where a row passes 0.9 or the kick median moves more than 0.1.

## 3. Variation

- [ ] 3.1 `compose('vary', { seed, style, type, energy })` from its own stream (D8 amounts and defaults; never kick gain, never bass distortion).
- [ ] 3.2 Confirm `rib`, `rand`, `perlin`, `irand` and `pick` are in the catalog; `npm run catalog:strudel`, `npm run check:strudel`.
- [ ] 3.3 Node checks (`check:ideas` or a new `check:sound-params`): the code per target, relative ranges, never louder or brighter, merged controls, skipped targets, same haps twice, loops every `cycles` bars.
- [ ] 3.4 `check:functions` and `check:mixer`: song functions fold the longer lines, the hidden mixer keeps the varied gain.

## 4. Generator, option and recipes

- [ ] 4.1 Recipe fields `drums.material.tones` and `material.variation` in `src/endless/recipe.js`, `docs/STYLES.md` and every built-in style (D8 character); `npm run check:styles`.
- [ ] 4.2 `OPTION_DEFAULTS.sound = 0` and `SOUND_VERSION = 1` (`src/endless/director.js`); tones and variation in `applyMaterial` (`src/endless/material.js`) and in the radio's Vary (`src/endless/steering.js:516`) at `sound` ≥ 1.
- [ ] 4.3 Record `sound: SOUND_VERSION` in new radio sessions, compilations and the New song panel; read a missing value as 0; warn for an older value; `--sound` in `tools/endless.mjs`.
- [ ] 4.4 `check:endless`: existing fixtures unchanged (no `DIRECTOR_VERSION` bump), new fixtures at `sound: 1`, "1 minus the new fields equals 0" over 20 seeds and every style. `check:song-options` and `check:compilation` for the recorded value.

## 5. Compose dice

- [ ] 5.1 Dice button and number in the track panel (`src/main.js`, next to `composeRow`), seed `<song id>:<track id>:sound:<n>`, disabled without a recipe; synth, guitar and drum draws (D5).
- [ ] 5.2 Lock chips per group, each group from its own sub-stream, remembered per song and track in local storage (inside try and catch).
- [ ] 5.3 Toast with Undo restoring settings and rack; the `fm` device owned by the dice; user devices kept.
- [ ] 5.4 Strings in `src/i18n.js` (both languages), styles for both themes and 400 px, the Compose card in `src/guide.js`; `npm run check:guide`.
- [ ] 5.5 `tools/check-sound-dice.cjs`: every scenario of `app/sound-dice`, both languages and themes, 400 px, the dice while playing.

## 6. Docs and closing checks

- [ ] 6.1 `docs/ENDLESS.md` (Material), `docs/VARIETY.md`, `docs/knowledge/` (material, sounds, sound-and-levels, decisions with D1, D4, D6 and the rejected absolute form, glossary), the AGENTS.md tool list, `DEVLOG.md`; `npm run knowledge`, `npm run check:knowledge`.
- [ ] 6.2 Run `check:code`, `check:songs`, `check:material`, `check:endless`, `check:styles`, `check:strudel`, `check:functions`, `check:mixer`, `check:crescendo`, `check:live-code`, `check:typing`; the level run at `sound: 1` and `snapshot-levels.cjs check` (unchanged).
- [ ] 6.3 Add the owner tests of the design to the checklist.
- [ ] 6.4 (Left to the owner.) Open issues for the future work: live knobs through `.bmod()` buses, and rack Sweep devices with `.env()`, `.lfo()` and `lpenv` (with FM index variation).
