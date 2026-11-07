Estimate: about 8.5 agent hours, plus about 2 hours for the optional group 8.

## 0. Baseline (included in group 4)

- [x] 0.1 Before any code change, record a hash of `compose('drums', …)` output for breakbeat, two-step, half-time and euclid over 50 seeds and three energies, for the "other families unchanged" case of 4.1. Verify: the hashes are written in `tools/check-material.mjs` with a comment naming this change.

## 1. Kick variants in the generator (1.5 h)

- [x] 1.1 `src/material/drums.js`: add `KICK_VARIANTS` (`straight`, `pickup`, `push`, `rolling`, `broken`) and `kickRow(variant, meter)` following design D1, leaving out a variant equal to an earlier one in the meter. Export both. Verify: the D1 table rows for 3/4, 4/4, 5/4 and 7/8.
- [x] 1.2 `four-floor` branch: draw `u = r.next()` first, pick the variant with the D2 weights per band (weights of dropped variants go to `straight`), remove the old `N - 2` chance. Add `avoidKicks` to the options (renormalise with the same `u`; ignore when it lists every variant). Add the variant to `why` and `stats.kick`. Verify: `npm run check:material` passes after 4.1.

## 2. «+ kick» and «+ beat» from the generator (2 h)

- [x] 2.1 `src/endless/material.js`: add `airGroove(R, part, M, { avoid, others, seed })` that tries up to 8 seeds `<seed>:groove:<j>` and returns distinct candidate rows for a kick (`bd`) or a beat (the other rows, the second-beat rule of today), as step strings of the meter's length (design D4). `airIdea` keeps returning `null` for drums.
- [x] 2.2 `src/endless/steering.js` `newTrack`: when `composesOnAir(O)` and `R.drums.material`, put `airGroove` candidates before the built-in ones; then today's order (not held, not playing now), and as the last step the rhythm the fewest tracks of the instrument play. Patterns `A` and `B` as `{ rows }`. The kit rule does not change. Verify: three «+ kick» on a berlin-techno seed give three distinct `bd` rows (4.2).
- [x] 2.3 Confirm `partHas` and the console's enabled «+ kick» do not change (jazz still hides it). Verify: `npm run check:endless` arrangement cases.

## 3. Built-in grooves and style lists (1.25 h)

- [x] 3.1 `src/music.js`: append the eleven grooves of design D3 to `GROOVES`, after the existing 20, with `{ it, en }` names. Verify: `npm run check:patterns` counts 31 grooves.
- [x] 3.2 `styles/*.json`: append the new ids to `drums.grooves` of acid, ambient, berlin-techno, dark-cyberpunk, gated-trance, house, industrial, phonk, progressive-house, pure-trance and trance, as in D3. Verify: `npm run check:styles` and `npm run check:kit-rows` pass; the inventory script gives the "after" kick counts of D3.

## 4. Node checks (1.5 h)

- [x] 4.1 `tools/check-material.mjs`: replace the four-floor `[0, 4, 8, 12]` assertion; add every variant in every meter (step 0, inside the bar, at least 3 hits, distinct, 4 in 7/8), the band distribution over 300 seeds (no `push` in band 0), `avoidKicks`, and the baseline hashes of 0.1. Verify: `npm run check:material`.
- [x] 4.2 `tools/check-endless.mjs`: «+ kick» ×3 on berlin-techno gives 3 distinct `bd` rows over 20 seeds, composed and with the source `patterns`; the same for every four-floor-only style and for phonk and ambient; «+ beat» ×2 distinct; a sixth «+ kick» on berlin-techno still adds a track; replay gives the same tracks. Keep the "two kicks on different grooves" and complexity 0 cases. Verify: `npm run check:endless`.

## 5. Versions and fixtures (0.75 h)

- [x] 5.1 Raise `DIRECTOR_VERSION` to 20 in `src/endless/director.js` and run `npm run check:endless -- --write-fixtures` in the same commit as groups 1 to 3.
- [x] 5.2 Raise `STYLE_MAKER_VERSION` to 4 in `src/endless/style-maker.js` and run `npm run check:invent -- --write-fixtures` in the same commit.
- [x] 5.3 Confirm nothing else moves: `npm run check:code`, `npm run check:songs`, `npm run check:crescendo`, `npm run check:durations`. Verify: all pass with no snapshot written.

## 6. Browser checks and listening seeds (0.75 h)

- [x] 6.1 With the dev server: `PORT=5173 node tools/check-steering.cjs`, `PORT=5173 node tools/check-arrangement-levels.cjs berlin-techno,trance,phonk` (three kicks below clipping), `PORT=5173 node tools/check-add-lag.cjs --quick`, `node tools/check-endless-play.cjs`, `node tools/check-style-sounds.cjs`. Write long output to a temp log.
- [x] 6.2 Pick two radio seeds (berlin-techno, trance) where «+ kick» ×3 gives `pickup`, `rolling` and `broken`, and note them in the DEVLOG for the owner's listening test. Report measured levels; the agent cannot hear.

## 7. Docs (0.75 h)

- [x] 7.1 `docs/ENDLESS.md` Drums row: four-floor kick variants. `docs/knowledge/material.md`: variants, weights, `avoidKicks`. `docs/knowledge/` steering note: «+ kick» and «+ beat» compose first. Run `npm run knowledge` (groove list block) and `npm run check:knowledge`.
- [x] 7.2 Add the decision on soft steps and jazz to `docs/knowledge/decisions.md`. Add the `DEVLOG.md` entry in Italian.

## 8. Optional: thin spots of the inventory (about 2 h, owner decides)

Each item adds existing presets to a style's list unless it says "new". Each needs `npm run check:styles`, `DIRECTOR_VERSION` and `STYLE_MAKER_VERSION` handled together with group 5 if done in the same change.

- [x] 8.1 Guitar: country adds `held` and a new strum pattern `strum` (`x ~ x x ~ x x ~`, chords); darksynth adds `gallop` and `held`. (0.5 h)
- [x] 8.2 Acid: arp adds `pulsar` and `spezzato`; hook adds `cyber`; bass adds `rolling`. (0.25 h)
- [x] 8.3 Ambient: a new pad `swell` (attack about 2 s, long release, held); bass stays `sub`. (0.5 h)
- [x] 8.4 Jazz: a new bassline `twoFeel` (root on 1, fifth on 3, half notes). (0.25 h)
- [x] 8.5 Classic-rock and country drums (no generator): a new groove `rockPush` (`bd` `x.......x.x...x.`, `sd` on 2 and 4, 8th hats). (0.5 h)

## Notes from the implementation

- 5.3: `check:code`, `check:songs` and the Crescendo fixtures did not move. The Live coder fixtures and the durations did: the metamorphosis skin (`makeSkin` in `src/song/crescendo.js`) composes four-floor drums, which now draw a kick variant (switch-acid-prova, switch-prima-luce, switch-test-onda, switch-test-stanza). `SHAPES_VERSION` 10, `tools/fixtures/live-coder.json` and `npm run durations` in the same change; `radio-growth.json` and the soul v3 reference curves recorded again too.
- 6.1: `check-style-sounds`, `check-endless-play`, `check-arrangement-levels` (berlin-techno 0.38, trance 0.73, phonk 0.69 out) and `check-add-lag --quick` pass. `check-steering` passes; its saved-pattern row case now asserts the batch entry of #82 (it failed on develop too).
- `check:radio-profiles` 5.5 compares the choosers over up to 80 songs of 150 seeds: the 24-song sample flipped with the longer preset lists (sampling, no chooser changed).
- Owner's extra fix: a track added by hand on a grown song plays from its boundary (`transitSong` in `src/endless/waypoints.js`); `check:radio-profiles` asserts it.
