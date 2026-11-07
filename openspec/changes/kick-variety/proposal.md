## Why

A second or third kick added from the radio console often plays the same rhythm as the first (`#82`). «+ kick» (`newTrack` in `src/endless/steering.js`) takes the `bd` row of another built-in groove of the style (`GROOVES` in `src/music.js`, listed in the style's `drums.grooves`). In 8 of the 20 styles every listed groove has the same kick row: acid, ambient, berlin-techno, industrial, jazz (no kick at all), phonk, progressive-house and trance. On berlin-techno the three grooves (`techno`, `hard`, `rolling`) all kick `x...x...x...x...`, so «+ kick» twice stacks the same hits with another kit.

The drum material generator (`groove` in `src/material/drums.js`) is never used by «+ kick» or «+ beat». Inside the `four-floor` family it always puts the kick on every beat, plus one extra hit at high energy half of the time. Seven styles allow only `four-floor` (acid, berlin-techno, gated-trance, house, progressive-house, pure-trance, trance).

## What Changes

- **«+ kick» and «+ beat» compose on air.** When the session composes on air and the style declares drum material, the new kick or beat comes from the generator with the style's families, at the phrase's energy, and its rows differ from every kick or beat of the song while the generator and the style's grooves offer another one. Built-in grooves stay the fallback. The kit rule (a kit the instrument does not use yet) does not change. There is no cap per instrument; the song's track cap (`TRACK_CAP`, 12) stays.
- **Kick variants in `four-floor`.** Five named kick variants (`straight`, `pickup`, `push`, `rolling`, `broken`), defined on the beats of any meter and drawn with weights per energy band. A four-floor-only style gets up to five different kicks from the generator.
- **Eleven new built-in grooves.** `technoPickup`, `technoRolling`, `technoBroken`, `trancePush`, `trancePickup`, `housePickup`, `houseRolling`, `drift`, `heartbeat`, `phonkRoll` and `phonkHalf`, added to the `drums.grooves` of 11 styles. Every style with a kick then has at least 2 distinct kick rows among its built-in grooves (3 or 4 for the eight thin styles but jazz, which stays without a kick). They show in Groove lab → Patterns (built-in) and in Compose's groove menu.
- **Inventory.** A table of built-in patterns per style and kind, with the thin spots marked, and an optional task group for the owner to choose.
- **Versions and fixtures.** `DIRECTOR_VERSION` 19 → 20 and `STYLE_MAKER_VERSION` 3 → 4, with the endless and invented-style fixtures written again in the same commit.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `endless/steering`: a kick or beat added with "+" is composed from the style's groove families when the session composes on air, with a rhythm that differs from the instrument's tracks; built-in grooves are the fallback.
- `music/material-generator`: the `four-floor` family draws one of five kick variants by energy and seed; the kick no longer always plays every beat.
- `endless/style-recipes`: eleven new built-in grooves and longer `drums.grooves` lists for 11 styles.

## Impact

- Code: `src/material/drums.js` (variants, `avoidKicks`), `src/endless/material.js` (a helper that composes a kick or beat on air), `src/endless/steering.js` (`newTrack` drums branch), `src/music.js` (`GROOVES`), `styles/*.json` (11 files), `src/endless/director.js` (`DIRECTOR_VERSION`), `src/endless/style-maker.js` (`STYLE_MAKER_VERSION`).
- Fixtures: `npm run check:endless -- --write-fixtures`, `npm run check:invent -- --write-fixtures`. Built-in songs, level snapshots, Crescendo and Live coder fixtures do not move.
- Checks: `tools/check-material.mjs`, `tools/check-endless.mjs` gain new cases; `check:kit-rows`, `check:patterns`, `check:styles`, `check:knowledge` run unchanged.
- Docs: `docs/ENDLESS.md` (Drums row), `docs/knowledge/material.md`, `docs/knowledge/patterns.md` (generated block), `DEVLOG.md`.
- Old radio sessions replay with other drums; the existing `DIRECTOR_VERSION` warning covers it.

Estimate: about 8.5 agent hours, plus about 2 hours for the optional inventory group.
