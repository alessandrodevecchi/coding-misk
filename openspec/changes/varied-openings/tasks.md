## 1. Baseline and probe tool

- [ ] 1.1 Add `tools/opening-probe.mjs` from the investigation's `probe.mjs` and `an.mjs`: grow N songs per built-in style with the Crescendo and Live coder profiles (default 24, `--n 12` for a quick run), find the first sounding `$:` line, and report per profile and per style: kick-led share, share of each exact first line, kick patterns among kick-led openings, banks, and the opening drawn with its source. Add `npm run probe:openings`. Verify: it runs without a browser and prints the baseline of `research.md` (about 94% kick in Crescendo, 73% in Live coder) on `develop`.
- [ ] 1.2 Add a `--check` mode that compares the result with the targets of the spec (Opening distribution) and the per-style kick-led shares in `research.md`, and exits 1 naming each style and target missed. Verify: `--check` fails on the baseline.

## 2. Openings and kick starts in the shape rules

- [ ] 2.1 `src/song/shapes.js`: add `bass`, `chord`, `top` to `OPENINGS`; `canPlay` rules (bass track; pad or guitar; a non-kick drum row with at least four hits per bar); new `DEFAULT_WEIGHTS.opening` (slow 1, the new ids 1); `KICKS` (`one`, `pair`, `two`, `four`, `push`, `off`) with default weights; `RECIPE_KEYS` and `checkGrowthShapes` accept `kicks`; `checkGrowthShape` accepts the new ids. Verify: `npm run check:styles` and `npm run check:songs` pass, and a recipe with `kicks.gallop` fails at that path.
- [ ] 2.2 `resolveLead(song, { styles, seed, deny })` and `resolveKick(song, facts, { styles, seed })` in `shapes.js`, with streams `lead-1` and `kick-1`; a song's lead `growthShape.opening` wins; a kick start outside the written kick is playable only with an explicit style weight. Verify: a unit check in `tools/check-crescendo.mjs` (shape checks) draws them for fixed seeds, twice, with the same result.
- [ ] 2.3 Bump `SHAPES_VERSION` to 9 (keep `SHAPES_SEED` 5). Verify: `card-duration.js` keys change (durations measured again in 7.3).

## 3. Growth: lead track and kick start

- [ ] 3.1 `src/song/crescendo.js` `growSong`: without a shape, move the track named by `resolveLead` to the front of `dest` (same front rules as `orderByShape`, plus `bass`, `chord`, `top`). Verify: a Crescendo growth of an ambient radio song opens on its pad; Classic fixtures unchanged.
- [ ] 3.2 `orderByShape`: fronts for `bass`, `chord`, `top`; for typed, muted-base and mid-set the front comes from `resolveLead`; voice keeps the spoken track first. `src/song/coder.js`: drums with a kick enter no earlier than the third waypoint for `bass` and `chord`, and the kick track at the second for `top`. Verify: Live coder growths with `--opening bass|chord|top` in `npm run growth:probe` open on the named part.
- [ ] 3.3 Kick start core: a `{ hits }` core in `thinRows`, `beatForms` and `rowForms`, and the `top` core (non-kick rows only); `trackRules` passes the drawn start for the slow opening and for Crescendo drums. Verify: `slow` with `four` on a house song writes `s("bd*4")` as its first line and grows to the written groove; `pair` on a dnb song writes the two kicks.
- [ ] 3.4 Check that the writer writes every kick start in short form (`bd*2`, `bd*4`, `[bd ~ ~ bd]`, `~ bd`, the pair) in Live coder and Crescendo code. Verify: `npm run check:functions` and `npm run check:live-code` pass; fix the writer only if a start comes out long.
- [ ] 3.5 Bump `CRESCENDO_VERSION` to 3 (keep the stream name `crescendo-1`). Verify: `tools/fixtures/crescendo.json` version mismatch is reported until 7.1.

## 4. Instruments in the style recipes

- [ ] 4.1 Write `tests/snapshots/kit-rows.json` from the drum machine index (rows per bank) with a small script, and a Node check (`npm run check:kit-rows`, or a part of `check:styles`) that fails when a recipe kit lacks a row its grooves play and `KIT_MISSING` does not cover it. Verify: the check passes on `develop` and fails on a test recipe with `RolandTR727`.
- [ ] 4.2 Add `KIT_MISSING` entries for `RolandCompurhythm78` (`cp`, `rd`, `cr`, `rim`, `mt`, `ht`) and `MPC1000` (`rd`, `cr`, `rim`, `mt`, `ht`), as the snapshot lists them. Verify: `npm run check:code` unchanged for built-in songs.
- [ ] 4.3 Add the kits and sounds of `research.md` (Instruments per style) to all 20 `styles/*.json`. Verify: `npm run check:styles` without new warnings, the kit-rows check passes, and `PORT=5173 node tools/check-style-sounds.cjs` finds every sound (dev server on 5173 started by the owner or on another free port; never start a server on 5173-5175 from the agent).
- [ ] 4.4 Bump `DIRECTOR_VERSION` to 17. Verify: `npm run check:endless` reports the fixture move until 7.2.

## 5. Opening weights in the style recipes

- [ ] 5.1 Add `growthShapes.openings` and `growthShapes.kicks` from `research.md` (Openings per style) to all 20 recipes, replacing the six existing opening tables. Verify: `npm run check:styles` passes, and every recipe has both fields.
- [ ] 5.2 Run `npm run probe:openings -- --check`. Tune weights (not rules) until every target passes; record the final numbers in `research.md` (section Result). Verify: exit code 0, and the result table committed.

## 6. Compose, Guide and docs

- [ ] 6.1 Compose opening control: the new ids with labels in English and Italian (`src/i18n.js`), and the Settings count of openings (`shapeCounts`). Verify: `npm run check:guide` passes; the control lists 13 openings.
- [ ] 6.2 Docs: `docs/STYLES.md` (`growthShapes.kicks`, new openings, the kit-rows rule), `docs/COMPOSING.md` and `docs/SONG-FORMAT.md` (new opening ids), the Guide card on growth shapes (EN and IT), `npm run knowledge` then `npm run check:knowledge`. Verify: both checks pass.
- [ ] 6.3 `CHANGELOG.md` under `[Unreleased]` (Added: new openings, kick starts, instruments per style; Changed: Crescendo opening, default weights) and a `DEVLOG.md` entry in Italian with the probe numbers before and after. Verify: entries present.
- [ ] 6.4 Owner listening pass: a short list in `research.md` of one radio seed per style that opens on a new kit or sound, for the owner to play; drop any addition the owner rejects. Verify: the owner's answer recorded.

## 7. Fixtures and full checks

- [ ] 7.1 `npm run check:crescendo -- --write` and `-- --write-fixtures` (Crescendo and Live coder fixtures move together on purpose, both versions raised), then `npm run check:crescendo -- --full`. Verify: full level passes.
- [ ] 7.2 `npm run check:endless -- --write-fixtures`, `npm run check:radio-profiles -- --write-fixtures`, and `npm run check:invent -- --write-fixtures` only if its fixtures moved (then `STYLE_MAKER_VERSION` 2). Verify: `check:endless`, `check:radio-profiles`, `check:invent`, `check:material`, `check:spoken` pass; `endless-v14.json` still matches with gestures off.
- [ ] 7.3 `npm run durations`, then `npm run check:durations`; `npm run check:live-code -- --write` if its fixture moved. Verify: both pass.
- [ ] 7.4 `npm run check:songs`, `npm run check:code`, `npm run check:mixer`, `npm run check:strudel`, `npm run catalog:strudel`. Verify: all pass; `catalog:strudel` committed if it changed.
- [ ] 7.5 Browser checks on a free port (owner's dev server): `tools/check-growth-background.cjs`, `tools/check-endless-play.cjs` on a fresh session of every style, `tools/check-playlists.cjs` (old sessions show the badge, frozen sessions do not). Verify: all pass, no `evalError`.

## Workflow follow-up

- Merge into `develop` only after the owner's go; archive the change after the merge. When `growth-shapes` is archived first, reconcile its "Classic and Crescendo unchanged" requirement: Crescendo now draws its lead track.
