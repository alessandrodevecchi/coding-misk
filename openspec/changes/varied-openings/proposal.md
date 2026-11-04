## Why

Radio and Compose songs almost always open on the same sound. A probe over 440 radio songs (`#82`) found that Crescendo opens on the kick in 94% of songs and the Live coder profile in 73%. The most common exact first line, `$: s("bd").bank("RolandTR909")`, is 36% of Crescendo openings. This is not a bug: Crescendo always puts the drums first, 7 of the 10 Live coder openings lead with the kick, the default weights favour the `slow` opening, 14 of the 20 styles have no opening weights of their own, and five styles have only one drum machine. Songs should open the way their genre opens: ambient on a pad, lo-fi on keys or a soft bass, jazz on the ride or the bass, house and trance on a kick (and not always the same kick).

## What Changes

- **Opening weights for every style.** Every built-in style recipe gets `growthShapes.openings` weights, chosen per genre. The six styles that already have weights are reviewed.
- **New openings.** Three new opening ids join the ten existing ones: `bass` (the bass line first), `chord` (a chord part first: keys, a stab or a strummed guitar) and `top` (hats, ride or percussion first; the kick comes later).
- **Crescendo follows the style.** When no growth shape applies (the Crescendo profile), the first track is drawn from the style's opening weights instead of always the drums. Classic stays as it is.
- **The first kick varies.** When a song opens on the kick, the first kick pattern is drawn from a small set of kick starts (`one`, `four`, `push`, `off`, `two`), weighted per style through a new `growthShapes.kicks` field. Today it is always one kick on beat one.
- **Default weights.** `DEFAULT_WEIGHTS.opening.slow` goes from 2 to 1, and the new openings get default weights.
- **More instruments per style.** Each style gets a few more drum machines and sounds per role, chosen from genre research and taken only from banks and sounds the project already loads. See the appendix of `design.md` for the table and the reasons.
- **Opening control in Crescendo.** The Compose «Opening» control steers the first track in Crescendo too, with the lead openings only.
- **Kit menu.** The new kits join the hand-pick kit list (`KITS`), at its end.
- **Versions.** `CRESCENDO_VERSION` 2 to 3, `SHAPES_VERSION` 8 to 9, `DIRECTOR_VERSION` 16 to 17, `STYLE_MAKER_VERSION` 1 to 2 if the invented-style fixtures move. All growth, endless and invent fixtures are regenerated, and `npm run durations` is run.
- **Check.** The opening probe is kept as a tool and run before and after, with target ranges.

## Capabilities

### New Capabilities

- `live-build/openings`: how a live build chooses its first sound in Crescendo and Live coder: openings and their weights, the new `bass`, `chord` and `top` openings, kick starts, the default weights, determinism, versions and the distribution targets.

### Modified Capabilities

- `endless/style-recipes`: adds requirements for per-style opening weights and kick starts, and for the wider instrument lists (more drum machines and sounds per role, all present in the sound catalog).

## Impact

- **Code:** `src/song/shapes.js` (opening list, default weights, kick starts, `canPlay` for the new openings, recipe checks), `src/song/crescendo.js` (first track by weights when there is no shape, `orderByShape` for the new openings, kick-start core in `beatForms`, `rowForms` and `thinRows`), `src/song/coder.js` (drums later for `bass`, `chord` and `top`), `src/endless/recipe.js` (validation of `growthShapes.kicks`), `src/live/profiles.js` and the Compose opening control (new ids, Crescendo reads it, labels in `src/i18n.js`), `src/music.js` (`KITS`, `KIT_MISSING`), `src/endless/steering.js` (longer kit fallback).
- **Data:** all 20 `styles/*.json`.
- **Fixtures:** `tools/check-crescendo.mjs` (Crescendo and Live coder), `tools/check-endless.mjs` seed fixtures, `tools/check-invent.mjs` seed fixtures, song card durations.
- **Existing songs:** saved Compose and library songs keep their written tracks; their grown build is recomputed and can open differently. Radio sessions saved before the change replay with the new rules and show the existing "may sound different" warning. Details in `design.md`, Migration.
- **Docs:** `docs/STYLES.md`, `docs/COMPOSING.md`, `docs/SONG-FORMAT.md` (new opening ids), Guide card on growth shapes, `CHANGELOG.md`, `DEVLOG.md`.
