## Context

Measured on `develop` 72698b5 (Node 26, Apple M4, 2026-10-26), Live coder with the default controls. Scripts kept out of the repo; their method is in task 1.1.

**Reused lines.** A "reused line" is a pattern line typed new (no alike line among the lines it replaces, `lineLike` < 0.5) although a line at least 0.8 alike was shown earlier and has left the code. Over 38 built-in songs: 2148 new pattern lines, 45 reused (28 identical, 3372 characters), 6 in the growth and 39 in the written part, 39 typed faster than a person (typing ratio need / usable above 1.1, up to 148.9 on neon-rush-reel's Hit). Songs: neon-rush-reel 7, circuito-ruggine 5, ghost-protocol-scenes 5, neon-ascent-scenes 5 (growth), ten-years-rebuild 5, drift 4, next-chapter 4, insert-coin 3, kellerlicht 2, five songs 1.

**kellerlicht** (440 bars, 13:20, growth to bar 280 at 8:29; owner's case). The acid track has clips `[0, 280]`, `[320, 24]`, `[360, 32]`. At bar 280 bass and hats go muted (they return at 296), but the acid line leaves the code; at bar 320 (Körper, 9:42) the 189-character line is typed new: 31.7 s of typing in 11.4 s (ratio 2.78). The line typed in the growth (bars 221 to 278, around 7:00) differs only in its note order (`!2 … [a3 …]*2` against `!3`) and the ramp of its cutoff. At bar 360 (Druck) the rolling bass line of bars 320 to 343 is typed again identical after the held bass of Nebel replaced it (43.8 s in 2.3 s for the whole step, ratio 18.7); at bar 392 the floor kick and the `a1` bass are typed again identical, at bar 408 the push kick.

**Causes.**
1. *Costs on the wrong text.* `muteOrDelete` (`src/song/compile-compact.js:313`) costs both ways on the compiled text before `rampLists` (`src/live/live-code.js:24`, `:77`). The acid line of the growth clip holds a cutoff sweep of about 130 literal values (1287 characters; 371 as a ramp). Raw: edit the muted line 51.2 s, type new 51.0 s, within `CLOSE` 1.35 (`:307`), a seeded draw deletes it. As shown: 7.2 s against 41.1 s.
2. *Costs on the whole track.* `kept` and `typed` (`:326`, `:328`) are the typing of the whole track, so a cost shared by both ways (other lines of the track typed new in both) pulls the ratio toward 1 and into the seeded band. drift at bar 153: the four drum lines cost 19.4 to 19.6 s kept against 22.1 to 35.5 s typed; the hats lines (2.5 s apart) went to the draw and were deleted, then typed again at Drop (bar 157, ratio 8.5).
3. *One key per place.* `returnKeys` (`:247`) keys a line by its visual and its order in its clip, so another pattern of the same track takes the same key: the old line is replaced, never kept muted, and when it returns the typing pairs it with an unlike line and types it new (20 of the 45).
4. *No memory of earlier code.* `typingPlan` (`src/song/typing.js:327`, `:342`) copies a long new line only from a like line above it in the target code; the lines pasted "as from notes" (`:356`, one in eight lines of 60 characters or more) are pasted whole at random, not from earlier code.
5. *Edits wait for the return.* A muted returning line is edited at the step it returns on, which is often a section change with little time.

**Simulation of causes 1 and 2** (a scratch copy of `compile-compact.js` loaded in place of the original, app code untouched): reused lines 45 to 35 (written part 39 to 29, identical 28 to 22); kellerlicht's acid line stays muted and its written part needs 251.8 s instead of 274.5 s over its 23 steps (rushed steps 11 to 10). The remaining 35 are mostly replaced lines (cause 3, 21) and lines the written part never offers as returning (14).

**Written part speed in general.** The section changes of the written part need much more typing than the song leaves: luci-rosse 206.9 s in 67.5 s, settimo-cielo 332.3 s in 44.8 s, kellerlicht 187.2 s in 197.7 s (but 43.8 s in 2.3 s at Druck). Reused lines are a small share of it; spare time before a section change is close to zero on luci-rosse and settimo-cielo, so preparing ahead cannot absorb it all. This change addresses the reused lines only.

**Radio growth time** (`growOnAir`, fitted, 16 Live coder sessions of `check:radio-profiles`' recipes, 3 songs each, 48 songs of 2:08 to 6:30, Node; each fitted growth tries up to 8 section boundaries, `TRIES`, `src/endless/growth.js:171`):

| Search | median | p90 | max | mean | rushed steps, all songs |
| --- | --- | --- | --- | --- | --- |
| cap 8 (radio today) | 0.67 s | 2.89 s | 5.22 s | 1.03 s | 220 |
| cap 32 | 1.00 s | 5.16 s | 8.85 s | 1.73 s | 212 |
| all, first good one | 1.02 s | 4.80 s | 13.63 s | 1.92 s | 212 |
| all, best one | 1.15 s | 6.33 s | 10.54 s | 2.02 s | 212 |

Try all costs 1.7 times the default (median, up to 4.9 times); every case stays far below the shortest song (128 s), but a browser worker is slower than Node, a steered song grows again on air, and `growNow` (`src/radio/radio.js:201`) grows on the page at once when a song is needed before its worker answer. The gain is small on these songs (rushed steps 220 to 212); the setting stays an option.

## Goals / Non-Goals

**Goals:** a line shown before is unmuted, kept beside its replacement, copied or edited while muted, whichever a person would do, measured by the typing model; a new line is typed ahead, muted, when a step has time to spare and a coming step is crowded; the radio follows the shape settings (shapes tried, try all, random order) without ever waiting for them.

**Non-Goals:** the general speed of the written part (a separate decision: fewer edits per section change, blocks as variables or song functions); the growth's own code (it keeps its steps, as in written-like-coder; D3's copy applies to its typing only); new lines typed ahead in the growth (D8 is written part only); "Long song from" on the radio (follow-up, below); Classic and Crescendo code; new shapes.

## Decisions

### D1. Costs on the code shown, per line
`compileNow` receives the text transform the code shown applies to a line (`rampLists` in a Live coder growth) and `muteOrDelete` costs both ways on transformed text. The band `CLOSE` applies to the line's own share: `base` is the typing of the track at the return without the line; the kept way's share is `kept - base`, the typed way's `typed - base`. Alternative: drop the band and always take the cheaper; rejected, written-like-coder chose variation on close calls on purpose (owner, 2026-10-26: keep it).

### D2. Replaced lines keep a place
A line keeps its key; when another pattern of the same track takes the key at a step and the typing would type the new line rather than edit the old one (`lineLike` < 0.5), the old line becomes a returning line of its own (its key with the pattern), placed muted above the new one, when it plays again later in the written part and D1 says muting is cheaper. On its return, the line that replaced it goes through the same rule. Only from the written part on, as written-like-coder D1.

### D3. Copy from earlier code
`typingPlan` takes an optional list of lines shown earlier in the song (`earlier`); a new line of 40 characters or more with no like line above it is pasted as a copy of the most alike earlier line (`lineLike` at least 0.5, as the copy from above) and edited. The paste costs the copy pause plus a look-up pause (about 1 s, lean: 0.4 s). `makeTyping` in `src/main.js`, `typingLoad` and `growth:probe` pass the lines of the code shown up to the step. Applied to the growth too: the same person types the whole song. Alternative: written part only; rejected, a typing model that changes at bar G would be a seam (owner, 2026-10-26: copy in the growth too, accepting that the kept shape of some songs changes).

### D4. Edit while muted
For a returning line kept muted whose return form differs, the code of the moment shows it in its return form, still muted, from the step inside its silence whose typing leaves the most spare time (usable minus need, measured as `typingLoad` does), the first one on a tie. When no step inside the silence has spare time, the edit stays at the return.

### D5. Radio search settings in the recipe
At session start the radio reads `coding-misk-shape-cap`, `-shape-all`, `-shape-keep` and stores the non-default ones in the recipe (`options.shapeSearch`). `growOnAir` passes them to `crescendoSong`. A recipe without them grows with the defaults, so old sessions and the fixtures do not move. It also reads `coding-misk-shape-random`: "Random order" applies on air too (owner, 2026-10-26), stored only when off; with it on, as by default, each radio song draws its shape order from its seed, so songs of one session do not share the same shapes. "Long song from" stays Compose only for now; the radio keeps 15 minutes (follow-up below). The cap (default 8) and try all were the owner's earlier request; this change is where they reach the radio.

### D6. Default first, wider second
For a song with non-default search, the worker grows the default growth first (as today) and answers; then it grows the wider one. The wider growth replaces the default one when it arrives before the song's limit (its start on air minus 20 s, at most 60 s after its default growth) and the song has no commands. `growNow`, steering and the page fallback use the default search. The result is recorded per song (`options.shapeSearch.played[n] = 'wide' | 'default'`), and a replay or an export grows each song as recorded. Alternative: one growth with a time budget inside the search; rejected, a growth cut by the clock is not repeatable.

### D7. Versions
D1 to D4 and D8 move the Live coder code fixtures (written part) and D3 may move the growth's typing measure, so the shapes kept may change for a few songs: `SHAPES_VERSION` 7 to 8, `SHAPES_SEED` stays 5, `npm run durations`. D5 and D6 leave the radio fixtures as they are (defaults); `DIRECTOR_VERSION` unchanged.

### D8. New lines typed ahead, muted
In the written part, a new pattern line (typed new after D2 and D3: no like line above, no earlier line to copy, no returning line to unmute) of a coming step may be typed earlier, muted, in its final form and in the place it takes at its step; its own step then only deletes the `_` of `_$:`. It is planned after D1 to D4, step by step from the start of the written part:

- **When there is time.** A step can take a line ahead only if its typing leaves spare time (usable minus need, measured as `typingLoad` does) of at least the ahead line's typing plus 2 s. Quiet bars and long gaps between changes are such steps; a step that is itself rushed never takes one.
- **Which line.** Candidates are the new lines of the steps up to the next section change included and at most 32 bars ahead. A rushed target step comes first (need over usable, largest gap first), then the longest line. A line whose step changes its form again before it plays is not a candidate.
- **Limits.** At most 2 lines ahead in the code at any moment, at most 1 typed ahead per step, at most 1 per track; none when the code of the moment already shows 4 or more muted lines (returning lines of D1, D2 and D4 included). The probe reports the most muted lines shown per song.
- **Same sound.** The ahead line is muted until its step; every hap stays the same, and the hidden mixer must find it (`check:mixer -- --full`).

Spare time before the crowded section changes of luci-rosse and settimo-cielo is close to zero, so D8 shortens rushed steps where quiet bars come first and leaves the general speed of the written part out of scope. Alternative: no ahead lines (the earlier recommendation, to measure D1 to D4 first); the owner chose to include them (2026-10-26). Alternative: also in the growth; rejected for now, the growth's steps and the shape search rest on its typing measure, and D8 would change every growth's shape.

## Risks / Trade-offs

- [More muted lines on screen in the written part] → D1 keeps the seeded band; the probe reports the longest code shown per song before and after; screenshots of kellerlicht at Körper and Druck for the owner.
- [D2 and D4 change how the hidden mixer finds lines] → `check:mixer -- --full` and `check-compact-code.cjs` must pass with every preset.
- [D3 makes the growth's typing cheaper, so another shape may be kept] → `check:crescendo -- --full` with the new fixtures, the shapes listed in the DEVLOG with the songs whose kept shape changed.
- [D8 fills the screen with muted lines] → the limits of D8 (2 ahead, 4 muted at most before adding one); the probe's most muted lines shown, screenshots of a song with lines ahead for the owner.
- [D8 makes a line appear before the music explains it] → look-ahead up to the next section change and at most 32 bars.
- [D6 doubles the worker's work for non-default settings] → the default growth is ready first; measured max 13.6 s in Node for try all.

## Migration Plan

Saved growths, card lengths and saved sessions with `SHAPES_VERSION` 7 grow again (existing mechanism). Radio recipes without `shapeSearch` keep their sound.

## Owner answers (2026-10-26)

1. D1 seeded band: keep it, some variation when muting and deleting cost almost the same.
2. D3 in the growth too: yes, one way of typing, even if the kept shape of some songs changes.
3. Lines typed ahead, muted: in scope (D8), when there is time and within limits.
4. The radio follows "Random order" too (D5). "Long song from" stays Compose only for now. The shapes tried (default 8) and try all apply on air (D5, D6).

## Follow-ups

- "Long song from" on the radio: a radio song that is extended several times (continue in radio) can grow long, so the rule may matter there later. Not in this change.

## Open Questions

1. "Random order" off on the radio: should the radio follow it (every radio song tries shapes in the fixed order) or keep the random order whatever the setting? Recommended: follow it, as the other shape settings; the default (on) keeps the variation.
2. D8 limits (2 lines ahead, 1 per step and per track, 4 muted lines at most, 32 bars of look-ahead): are these right for the screen? Recommended: start with them and look at the screenshots before tuning.
3. D8 in the growth too? Recommended: not in this change; measure it on the written part first.
