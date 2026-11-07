## Context

How a kick or beat track gets its rows today:

- **Director, new song.** `candidateTracks` (`src/endless/director.js`) picks two built-in grooves `gA` and `gB` from `R.drums.grooves` and splits each: the `bd` row goes to the `kick` track, the other rows to the `beat` track. Then `applyMaterial` (`src/endless/material.js`) may replace both with one generated groove (`compose('drums', …)`), when the session source and the recipe's `drums.material` (`source`, `share`, `families`) allow it.
- **«+ kick» and «+ beat» on air.** `newTrack` (`src/endless/steering.js`) shuffles the style's `drums.grooves`, keeps the `bd` row (kick) or the other rows (beat), and takes the first one no track of the instrument holds, else the first one not playing on the boundary, else any. A second beat keeps only the rows the other beats do not play. The kit is one the instrument does not use. The generator is never called: `airIdea` returns `null` for drums.
- **Generator, `four-floor`.** `groove` (`src/material/drums.js`) sets `bd` to every beat; at high energy it adds step `N - 2` half of the time. Clap on the back beats, hats by energy band, open hats at high energy.

Drum rows are strings of `x` and `.` (the validator rejects anything else, `src/song/validate.js`), so a step has no velocity.

Five styles have no `drums.material` and never compose drums: classic-rock, country, jazz, melodic-metal, phonk. Every built-in style plays in 4/4 today; invented and user styles may list `meters` (3/4, 5/4, 7/8).

## Inventory

Measured on 2026-11-07 with `inventory.mjs` (scratchpad, imports `src/music.js` and reads `styles/*.json`). Grooves counted on 16 steps. "Distinct kicks" counts different `bd` rows; "Distinct grooves" counts different full sets of rows. The other columns count the presets the style lists. "Composed" names the parts with a `material` source other than `preset`.

| Style | Drum families | Grooves | Distinct kicks | Distinct grooves | Bass | Arp | Hook | Pad | Guitar | Composed |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| acid | four-floor | 2 | **1** | 2 | **2** | **1** | **2** | - | - | drums, bass, arp, hook |
| ambient | euclid, half-time | 1 | **1** | **1** | **1** | - | 3 | **1** | - | drums, bass, hook, pad |
| berlin-techno | four-floor | 3 | **1** | 3 | 4 | 3 | 3 | 2 | - | all five |
| classic-rock | none | 2 | 2 | 2 | 3 | - | 3 | 2 | 4 | bass, hook, pad |
| country | none | 2 | 2 | 2 | 2 | - | 3 | 3 | **2** | bass, hook, pad |
| dark-cyberpunk | four-floor, half-time, breakbeat | 3 | 2 | 3 | 4 | 3 | 4 | 3 | - | all five |
| darksynth | four-floor, half-time | 3 | 3 | 3 | 4 | 2 | 4 | 3 | **2** | all five |
| dreamy-cyberpunk | half-time, two-step | 3 | 3 | 3 | 3 | 2 | 4 | 2 | - | all five |
| drum-and-bass | breakbeat, two-step | 2 | 2 | 2 | 4 | 2 | 3 | 2 | - | all five |
| gated-trance | four-floor | 2 | 2 | 2 | 3 | 3 | 3 | 2 | - | all five |
| house | four-floor | 2 | 2 | 2 | 3 | - | 3 | 3 | - | drums, bass, hook, pad |
| industrial | four-floor, euclid | 2 | **1** | 2 | 3 | - | 3 | - | 3 | drums, bass, hook |
| jazz | none | 1 | **1** (none) | **1** | **1** | - | 4 | 2 | - | bass, hook, pad |
| lo-fi | two-step, half-time, breakbeat | 2 | 2 | 2 | 3 | - | 3 | 2 | - | drums, bass, hook, pad |
| melodic-metal | none | 3 | 3 | 3 | 3 | - | 3 | 2 | 4 | bass, hook, pad |
| phonk | none | 1 | **1** | **1** | 3 | - | 3 | 2 | - | bass, hook, pad |
| progressive-house | four-floor | 2 | **1** | 2 | 3 | 3 | 4 | 3 | - | all five |
| pure-trance | four-floor | 2 | 2 | 2 | 3 | - | 3 | 2 | - | drums, bass, hook, pad |
| synthwave | four-floor, half-time | 2 | 2 | 2 | 4 | 3 | 4 | 3 | - | all five |
| trance | four-floor | 2 | **1** | 2 | 3 | 4 | 4 | 3 | - | all five |

Tables in `src/music.js`: 20 grooves, 13 basslines, 6 arpeggios, 22 hooks, 10 pads, 14 guitar patterns. Three grooves are in no style: `prog78`, `prog54`, `blast` (they show in Patterns only).

Thin spots (bold above):

- **Kicks.** 8 styles with one kick row. Gated-trance, house and pure-trance count 2 only because `pulse` (one hit per bar) is a second row; their real rhythm is still one four-on-the-floor. This change fixes all of them but jazz (D7).
- **Drums with no generator.** Phonk has one groove and no `drums.material`, so its variety depends on built-in grooves alone. Classic-rock and country have 2 grooves and no generator.
- **Bass.** ambient 1, jazz 1, acid 2, country 2. All four compose basslines too, so the gap shows only with composed material off.
- **Arp.** acid 1 (`acid`); darksynth, dreamy-cyberpunk and drum-and-bass 2. All compose arps.
- **Hook.** acid 2 (`colpi`, `allarme`), composes hooks.
- **Pad.** ambient 1 (`pad`); ten styles have 2, all with composed pads.
- **Guitar.** country 2, darksynth 2. Guitar parts never compose in a style (no style has `guitar.material`), so these are the thinnest melodic lists in practice.

Additions for the non-drum thin spots are the optional group 8 of the tasks; the owner decides.

## Goals / Non-Goals

**Goals**

- Two or three «+ kick» presses on any style with a kick give that many different kick rows while the style has them.
- Four-floor-only styles get 4 or 5 different kicks from the generator and 3 or 4 from built-in grooves.
- The same command replays the same track (seeded by the command, as today).

**Non-Goals**

- No soft or accented steps in drum rows (Open Question 1).
- No new groove family; no change to the `breakbeat`, `two-step`, `half-time` and `euclid` families.
- No cap per instrument; the song's 12-track cap and the recommended counts with their warning stay.
- No change to how kits, gains, the headroom rule or the console's buttons work.

## Decisions

### D1. Four-floor kick variants

`groove` in the `four-floor` family draws one kick variant. Each is defined on the meter's steps per bar `N` and its beats (`meterOf`: every 4th step below `N`; in 7/8 the last beat is a half beat). `back` is the beats at odd positions (beats 2 and 4 in 4/4), `L` is the last beat.

| Variant | Rule | 4/4 (16) | 3/4 (12) | 5/4 (20) | 7/8 (14) |
| --- | --- | --- | --- | --- | --- |
| `straight` | every beat | `x...x...x...x...` | `x...x...x...` | `x...x...x...x...x...` | `x...x...x...x.` |
| `pickup` | every beat and the last 16th (a double hit into the bar line) | `x...x...x...x..x` | `x...x...x..x` | `x...x...x...x...x..x` | `x...x...x...xx` |
| `push` | every beat and step `N - 2` (today's high-energy extra) | `x...x...x...x.x.` | `x...x...x.x.` | `x...x...x...x...x.x.` | dropped |
| `rolling` | every beat and the 16th before each back beat | `x..xx...x..xx...` | `x..xx...x...` | `x..xx...x..xx...x...` | `x..xx...x..xx.` |
| `broken` | the last beat moves to its off-beat 8th (a dropped beat), or goes when that is past the bar | `x...x...x.....x.` | `x...x.....x.` | `x...x...x...x.....x.` | `x...x...x.....` |

A variant whose row equals an earlier one in the same meter is dropped from that meter's list (7/8 `push` equals `straight`), so 7/8 has 4 variants and the others 5. Every variant keeps the kick on step 0 and has at least 3 hits. Verified for all four meters with `proposal-check.mjs` in the scratchpad.

Rejected: a "ghost kick" variant. Without soft steps, a ghost kick is a full hit and sounds like `rolling`. See Open Question 1.

### D2. How the generator picks a variant

The `four-floor` branch draws one value `u = r.next()` as its first draw, and picks the variant through cumulative weights for the energy band:

| Band (energy) | straight | pickup | push | rolling | broken |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0 (below 0.33) | 0.45 | 0.20 | 0 | 0.10 | 0.25 |
| 1 (0.33 to 0.66) | 0.30 | 0.25 | 0.15 | 0.15 | 0.15 |
| 2 (0.66 and up) | 0.20 | 0.20 | 0.25 | 0.25 | 0.10 |

Weights of variants dropped in the meter go to `straight`. The old `r.chance(0.5)` that added `N - 2` at high energy goes; `push` replaces it.

A new option `avoidKicks` (a list of `bd` rows as step strings of length `N`) removes those variants before the pick and renormalises the weights with the same `u`. When every variant is avoided, the pick ignores `avoidKicks`. The other families accept the option and ignore it; steering handles them by trying other seeds (D4).

What stays the same: the clap on the back beats, the hats and open hats by band, the kits, `stats.family`. `why` gains the variant name (`four on the floor, pickup`) and `stats` gains `kick`. The other four families draw exactly as before for the same seed, because the new draw lives only in the `four-floor` branch.

### D3. Built-in grooves

Eleven grooves join `GROOVES`, 16 steps, with names in Italian and English. Each uses only rows the style's current grooves already play, so `check:kit-rows` needs no new fallback.

| Id | Name (en) | bd | Other rows | Styles |
| --- | --- | --- | --- | --- |
| `technoPickup` | Techno pickup | `x...x...x...x..x` | cp `............x...`, hh `..x...x...x...x.`, rd `x.x.x.x.x.x.x.x.` | berlin-techno, acid, industrial |
| `technoRolling` | Rolling kick (techno) | `x..xx...x..xx...` | cp `....x.......x...`, hh `.xx..xx..xx..xx.` | berlin-techno, acid |
| `technoBroken` | Broken techno | `x...x...x.....x.` | cp `....x.......x...`, sd `..........x..x..`, hh `..x...x...x.....`, oh `..............x.` | berlin-techno, industrial, dark-cyberpunk |
| `trancePush` | Trance push | `x...x...x...x.x.` | cp `....x.......x...`, hh `..xx..xx..xx..xx` | trance, pure-trance, gated-trance, progressive-house |
| `trancePickup` | Trance pickup | `x...x...x...x..x` | cp `....x.......x...`, hh `x.x.x.x.x.x.x.x.` | trance, pure-trance, gated-trance |
| `housePickup` | House pickup | `x...x...x...x..x` | cp `....x.......x...`, hh `.x.x.x.x.x.x.x.x`, oh `..x...x...x...x.` | house, progressive-house |
| `houseRolling` | Rolling kick (house) | `x..xx...x..xx...` | cp `....x.......x...`, sd `...........x....`, hh `..x...x...x...x.` | house |
| `drift` | Drift (ambient) | `x.........x.....` | hh `....x.......x...` | ambient |
| `heartbeat` | Heartbeat (ambient) | `x..x............` | hh `........x.......` | ambient |
| `phonkRoll` | Phonk roll | `x......x..x...x.` | cp `....x.......x...`, hh `x.xxx.xxx.xxx.xx`, oh `......x.......x.` | phonk |
| `phonkHalf` | Phonk half-time | `x.........x..x..` | cp `........x.......`, hh `x.x.x.x.xxxxx.x.` | phonk |

Effect on distinct kicks (from `proposal-check.mjs`): acid 1 → 3, ambient 1 → 3, berlin-techno 1 → 4, dark-cyberpunk 2 → 3, gated-trance 2 → 4, house 2 → 4, industrial 1 → 3, phonk 1 → 3, progressive-house 1 → 3, pure-trance 2 → 4, trance 1 → 3. No new groove equals an existing one. `GROOVES` grows from 20 to 31; the order of the first 20 stays.

The new ids are appended to each style's list, so a draw that lands in the old part of a list picks what it picked before only by chance: `rng.pick` over a longer list moves most draws (D6).

### D4. «+ kick» and «+ beat» on air

`newTrack`'s drums branch builds the candidate rows in this order:

1. **Composed**, when `composesOnAir(O)` is true and the recipe has `drums.material`: up to 8 calls of `compose('drums', …)` with the seed `<command seed>:groove:<j>` (j from 0 to 7), the style `R.drums.material`, the song's meter, `energy` and `avoidKicks`, with `energy` the phrase target from `airInputs` and `avoidKicks` the `bd` rows the instrument's tracks hold. A kick keeps the `bd` row; a beat keeps the other rows, and a second beat keeps only the rows the other beats do not play (today's rule).
2. **Built-in**: today's list from the style's `drums.grooves`, shuffled with the command's stream.

Candidates that repeat each other are removed. The pick then follows today's order over the joined list: rows no track of the instrument holds, else rows not playing on the boundary, else the rhythm the fewest tracks of the instrument play (first in the list on a tie). The new track's pattern `A` is the first candidate and `B` the second when there is one, both as `{ rows }`, so `rowsOf`, `patternPart`, the Groove lab grid and Save as pattern work as before.

A new helper in `src/endless/material.js` (`airGroove(R, part, M, avoid)`) holds step 1, so `airIdea` keeps returning `null` for drums and the director's `applyMaterial` stays as it is.

Sessions with the source `patterns`, complexity 0, and styles without `drums.material` use step 2 alone. Their kicks vary through D3.

Every draw comes from the command's seed, so a replay of the same commands gives the same tracks (Requirement "Arrangement commands replay the same"). The composed candidates cost well under a millisecond each, inside the budgets of `check-add-lag.cjs`.

Alternative: built-in grooves first, generator as fallback. Rejected because the owner asked for the generator, and the built-in lists are short.

### D5. Director songs

The director keeps its flow. With D2, every generated `four-floor` groove (for the session sources `composed` and `mix`, at the recipe's `share`) draws a variant, so the first kick of a generated song also varies. With D3, the built-in draws `gA` and `gB` range over longer lists.

### D6. Versions, fixtures and replay

- **`DIRECTOR_VERSION` 19 → 20.** D2 changes generated four-floor grooves and D3 changes `rng.pick` over `drums.grooves`, so `npm run check:endless -- --write-fixtures` moves. One bump covers both, in the commit that writes the fixtures.
- **`STYLE_MAKER_VERSION` 3 → 4.** The style maker (`src/endless/style-maker.js`) reads the built-in styles' groove lists (tempo homes, kit pairs, likeness), so `npm run check:invent -- --write-fixtures` moves.
- **Unchanged.** Built-in songs, `npm run check:code` snapshots, level snapshots, Crescendo and Live coder fixtures (`SHAPES_VERSION`, `CRESCENDO_VERSION`) and `npm run durations`: none of them read the director or the style lists. The tasks verify it.
- **Replay of old sessions.** A radio session saved in a playlist replays through the director with the new version, so its drums and its «+ kick» tracks change; the saved session's older version already triggers the warning that it may sound different (`#38`). Songs saved from the radio or opened in Compose hold their own rows and do not change. Saved patterns do not change. An invented style saved inside a session keeps its own groove list; its generated four-floor grooves change, covered by the same warning. User styles that list grooves stay valid, because no groove is removed.

### D7. Jazz keeps no kick

`swing` has no `bd` row, so jazz songs have no kick track and the console hides «+ kick» for jazz. Adding a feathered kick groove would put a full-velocity kick into every jazz song where the director draws it. Jazz stays as it is (Open Question 2).

### D8. Groove lab and Compose

The Patterns tab lists every key of `GROOVES` (`src/library/patterns.js`) with its grid preview and the styles that use it, so the 11 grooves show without UI work. Compose's groove menu (`pt-groove`) and the Styles tab editor list them too. Kicks added on air show as rows in the console and the timeline, as today. No Guide card changes; the knowledge block that lists grooves is regenerated with `npm run knowledge`.

## Checks

New or changed cases:

- **`tools/check-material.mjs`.**
  - The four-floor assertion becomes "the kick plays step 0 and the row is one of the meter's variants".
  - Every variant in every meter: step 0, unique steps inside `[0, N)`, at least 3 hits, distinct within the meter (7/8 has 4).
  - Over 300 seeds per band, each allowed variant appears and band 0 never gives `push`.
  - `avoidKicks` with all but one variant gives that one.
  - Breakbeat, two-step, half-time and euclid give the same output as before for 50 seeds (a hash recorded before the change).
- **`tools/check-endless.mjs`.**
  - «+ kick» three times on berlin-techno gives three distinct `bd` rows, for 20 seeds, with composed material and with the source `patterns`.
  - The same for every four-floor-only style, and for phonk and ambient (built-in only).
  - «+ beat» twice gives two beats with different rows.
  - A sixth «+ kick» on berlin-techno still adds a track (no cap per instrument) and repeats the least-played rhythm.
  - Replaying the same commands gives the same tracks.
  - The existing "two kicks on different grooves" case now applies to every style with a kick.
  - The complexity 0 case still finds only built-in rows.
- **Run unchanged:** `npm run check:kit-rows`, `npm run check:styles`, `npm run check:patterns`, `npm run check:invent`, `npm run check:knowledge`, `npm run check:code`, `npm run check:songs`.
- **Browser:** `PORT=5173 node tools/check-steering.cjs` and `PORT=5173 node tools/check-arrangement-levels.cjs berlin-techno,trance,phonk` (three kicks stay below clipping), `PORT=5173 node tools/check-add-lag.cjs --quick`, `node tools/check-endless-play.cjs`, `node tools/check-style-sounds.cjs`.

## Risks / Trade-offs

- [Risk] Three kicks with different rhythms can sound busier than three identical kicks → Mitigation: the existing gain rule (×0.75, ×0.6) and the headroom rule stay; the recommended-count warning stays; `check-arrangement-levels.cjs` measures the level.
- [Risk] `rolling` and `pickup` in a low-energy intro can feel too busy → Mitigation: band 0 favours `straight` and `broken`.
- [Risk] Every generated session and invented style changes at once → Mitigation: one version bump each, fixtures written in the same commit, the replay warning.
- [Trade-off] A composed kick is stored as plain rows, not as an idea with its family. The track shows and saves like a built-in groove; the family name is lost after the press.

## Estimate

About 8.5 agent hours, plus 2 hours for the optional group:

| Group | Hours |
| --- | ---: |
| 1. Kick variants in the generator | 1.5 |
| 2. «+ kick» and «+ beat» from the generator | 2 |
| 3. Built-in grooves and style lists | 1.25 |
| 4. Node checks | 1.5 |
| 5. Versions and fixtures | 0.75 |
| 6. Browser checks and listening seeds | 0.75 |
| 7. Docs, knowledge and DEVLOG | 0.75 |
| 8. Optional: thin spots of the inventory | 2 |

## Open Questions

1. **Soft ghost kicks.** Drum rows have no velocity, so a true ghost kick needs a soft step (for example `o` at a lower velocity) in the row format, the compiler, the validator, the idea writer and the Groove lab grid. Recommended: not in this change; listen to the five variants first and open a separate change if ghosts are still wanted.
2. **A kick for jazz.** Add a feathered four-on-the-floor or a two-feel kick groove to jazz? Recommended: no. Without soft steps it would be a full-level kick in a ride-led style.
3. **Styles without drum material.** Should «+ kick» on classic-rock, country, jazz, melodic-metal and phonk compose with a default family? Recommended: no. Families stay a style decision; phonk gets two built-in grooves instead.
4. **The `patterns` source and complexity 0.** Should «+ kick» compose even when the session asked for presets only? Recommended: no, those sessions keep built-in material (the `composesOnAir` rule).
5. **Variant weights.** Accept the D2 weights, or start with equal weights? Recommended: the D2 weights, tuned after a listening session on berlin-techno and trance seeds.
6. **When every rhythm plays.** Repeat the least-played rhythm with another kit, or disable «+ kick»? Recommended: repeat, because the owner removed caps on purpose.
7. **Optional group 8.** Which inventory additions to make now? Recommended: the guitar lists (country, darksynth) and acid's arp and hook, because those parts compose least on air; skip the pad lists, which the generator covers.
