## Context

The app writes one or more `$:` lines per track (one per clip and section in the song as written, one per part in the code of the moment), mutes a line with `_$:` and plays a line alone with `S$:` (growth openings, a voice line alone). About 40 places in `src/` read or rewrite those labels. Strudel's labels are not only `$:`: any JavaScript label works, and the transpiler turns `name: pattern` into `pattern.p('name')`.

## Strudel 1.2.6 (measured)

`@strudel/core` and `@strudel/transpiler` 1.2.6 (the repl package is 1.3.0), evaluated in Node by `tools/check-line-names.mjs` (part 1):

| Code | Plays | Why (`repl.mjs`) |
| --- | --- | --- |
| `kick: s("bd*2")` and `hats: s("hh*4")` | both | `p('kick')`, `p('hats')` |
| two `bass:` lines | only the last | `pPatterns[id] = this`: same key, last one wins; `$:` is numbered (`$0`, `$1`), a name is not |
| `kick:` `hats:` `kick:` | the last kick and hats | the key keeps the first place, the pattern of the last |
| `Snare: …` with `kick: …` | only Snare | a key longer than one character that starts with `S` is solo |
| `S: …` | plays normally | one character is not solo |
| `Skick: …` | alone, like `S$:` | same rule |
| `_kick: …` or `kick_: …` | muted | an id starting or ending with `_` returns silence |
| `note: …`, `s: …` | plays | labels have their own namespace in JavaScript |
| `new: …`, `2kick: …`, `kick-2: …` | syntax error | a label is an identifier, not a reserved word |

So the traps are: a capital S (solo), duplicate names (all but the last silent), a trailing or leading underscore (muted), and identifiers. The pattern `id` control (`state.setControls({ id: key })`) is not read by the app, by superdough or by the random functions, so the name never changes an event.

## The map

| Where | What it does with labels | Prototype |
| --- | --- | --- |
| `src/music.js` `sceneLayers` | writes `$:` per layer | unchanged (writes `$:`) |
| `src/music.js` `ideaCode` | reads the label off a layer | reads both |
| `src/song/compile.js` `lineMarks`, `codeLayer` | writes `$:`, `_$:` (hush), `S$:` (alone) | unchanged |
| `src/song/spoken.js` | writes `$:` per voice-track way | unchanged |
| `src/song/build.js` `voiceCode` | writes `$:` or `S$:` for the narrator | unchanged |
| `src/song/compile-compact.js` `parseCode`, `compileCompact`, `compileNow` | parses lines, mutes waiting and returning tracks (`_$:`) | reads both, `muteLine` |
| `src/song/compile-compact.js` `liftLanes` | parses lines, merges equal lines | reads both (runs before the names) |
| `src/song/crescendo.js` `heard`, shape search | parses solo and muted lines; measures the typing | reads both; the shape search measures `$:` |
| `src/song/writer.js` `lineKey`, `writeCode`, `splitSpoken` | strips the label for the mixer's keys | reads both (`LABEL_SPACE`) |
| `src/song/typing.js` `lineLike` | a pattern line is a kind of line | reads both |
| `src/live/live-code.js` `codeWith` | the code shown: `$: silence`, muted lines, lines ahead, returning lines, entries per line | **names the code shown here**; reads both |
| `src/live/written-plan.js` | the written part's plan: muted lines, line keys | reads both; the plan is made on `$:` |
| `src/live/typing-load.js` | earlier lines for the typing | reads both |
| `src/live/air-code.js` `localSolo`, `plays` | songs off air: `S$:` turned into mutes, a code that plays | songs off air are written with `$:` |
| `src/endless/waypoints.js` | the steering measures the typing | measured on `$:` |
| `src/live/widgets.js`, `src/widgets/app-widgets.js`, `src/widgets/song-rows.js` | widget lines, muted lines | read both |
| `src/video/video.js`, `src/video/code-over.js`, `src/video/widget-frames.js` | layers, dimmed muted lines, widget lines | read both |
| `src/code-themes/install.js` | dims muted blocks | reads both |
| `src/main.js` | the song as written (Live build off), dimmed widgets of muted lines | names the song as written; reads both |
| `src/decode/tab.js` | counts lines of the code shown | reads both |
| `src/decode/writer.js` | writes `$:`/`_$:` top lines | unchanged (named downstream by `liveCode`) |
| `src/player/preview.js`, `src/sounds/catalog.js`, `src/sounds/fm-lab.js`, `src/content.js` | previews, sound cards, lessons | unchanged: their own short code, always `$:` |
| `src/song/validate.js` | a code pattern may not contain `$:` | unchanged |
| copy to strudel.cc, exports | `standalone(shown)`, `codeFor` | follow the code shown |

Counts: at the base commit 131 lines mention `$:` in 31 files of `src/` (comments, lessons and help texts included); 27 places in 24 files read, write or rewrite labels in code. The prototype changes 23 files of `src/` (101 lines in, 58 out) and adds `src/song/line-names.js` (about 100 lines). Writers stay on `$:`; one function names the code at the end.

## Decisions

### D1. One writer, one namer
Every writer keeps `$:`. `nameLines` runs once, in `liveCode`'s `codeWith` on the code shown (after the lanes are lifted, before the writer folds the visuals), and in `playable` for the song as written. The hidden tail (mixer, hidden voice, lines hidden in place) keeps `$:`, so its lines never take a name of the code shown. Rejected: naming in the compiler (the code of the moment would show `kick3` for the only kick of a section, and `liftLanes` merges equal lines by text).

### D2. Names
Owner's rule (12 November): a name never starts with a capital letter. One word is lower case; several words are camelCase (`openHat`, `synthBass`), letters and digits only, at most 16 characters (`safeName`). Two styles, the setting "Names from" (`nameStyle`, owner 12 November): **instrument** (default) and **track**.

Instrument: the visual the line lights (`.analyze("kick")` or `.chan("kick")`): `kick`, `snare`, `hats`, `bass`, `pad`, `arp`, `hook`, `guitar`, `riser`; `crash` for a crash; for other `fx` lines the track's type from its header (`texture`); `voice` for spoken samples; else the track's name from its header; else `line`. A track may ask for its own name (`lineName`) for the visual it alone lights: the Decode tab's Lead lights the hook visual and is named `lead` (`_lead:` when hushed). Track: the track's name from its header (`Drums · drums` → `drums`, `drums2`, `drums3`; `Open Hat` → `openHat`); the code shown without headers (comments off) takes them from the same code before the comments, lifted the same way, and only when both have as many pattern lines; a line with no known track and a narrator line fall back to the instrument. Never a reserved word. Unique in order: `kick`, `kick2`, `kick3`, `openHat2`. A name already written counts.

### D3. Marks
`_name:` muted, `Sname:` alone (Strudel's own S rule). Names are lower case, so a capital S is only ever the solo mark. A trailing `_` is never written.

### D4. Random per song
Drawn from the id, not stored (open question 6, the owner left it to us): nothing to write into saved songs, the radio's songs and their replays look the same without a field, and an explicit choice is already stored in the song's configuration like every other control. Storing would freeze a form the user never chose, and a song copied or saved as new would keep it. The one place the id changes is Decode's Open in Compose (a new `u-…` id): there the form drawn from the file is written into the new song's configuration, so Compose shows what Decode showed.

`lineNamesOf(setting, song)`: a song's own `lineNames` first, then `dollar` or `names`, else Random from a hash of the song's id (title as fallback). About half the songs are named: 100 of 200 test ids, 17 of the 38 built-in songs. The same song looks the same on every replay; a radio song keeps its id.

### D5. The same song in both forms
The growth's shape search, the radio steering and the written part's plan measure the code with `$:`. The typing shown types the labels as written, so a step in the named form has a little more to type (+0 to +29 %, about +5 % in most songs). The rushed steps of the typing load stay the same in 23 of 28 song and profile pairs; in 5 they are one to three more (ferro Live coder 9 → 12). A rushed step pastes a line instead of typing it; it never moves a step.

### D6. Songs off air in the radio
A radio window evaluates the song on air with the next songs (visible during a transition, or hidden). Two songs can both have a `kick:`, and Strudel would keep only the last. `localSolo` writes the songs off air with `$:`, so only the song on air carries names.

### D7. Readers
`LINE` (`^\s*[_S]?(\$|[a-z][A-Za-z0-9]*):(?=\s|$)`), `MUTED_LINE`, `LABEL_SPACE`, `isMuted`, `isAlone`, `muteLine`, `withMark`, `toDollar`. A name is followed by a space: a mini-notation line such as `  bd:3 hh` is never a label. A user's `kick_:` (muted by Strudel) is not read as a pattern line.

## Risks

- **Checks that fingerprint the code shown** move for the songs Random names. `check:live-code` now pins `$:` (its fixtures are unchanged); `check:line-names` shows the named code is the same code with other labels.
- **Code typed by hand** with a capital-S name or two equal names behaves as Strudel says; the app only writes safe names.
- **Typing time** rises a little in the named form (D5).

## Owner's answers (12 November)

1. **Default:** Random per song. Confirmed. `$:` stays the default of the checks.
2. **Instrument or track name:** both, as the setting "Names from" (instrument by default, track: `drums`, `drums2`), in Compose's code options, the radio's Custom section and the Decode tab's Options. Confirmed.
3. **Numbering:** `kick2`. Confirmed. Names never start with a capital letter; several words are camelCase (`openHat`, `openHat2`). Owner's rule.
4. **The radio:** Random from the song's id, and both choices in the Custom section next to Comments. Confirmed.
5. **Decode:** both choices in its Options; Random drawn from the file's fingerprint; the Lead is `lead:` (`_lead:` muted); Open in Compose keeps the form. Confirmed.
6. **Saved songs:** left to us; drawn from the id, not stored (D4 says why).
7. **Lessons and sound cards:** stay `$:`. Confirmed.
8. **Song as written:** keeps numbered names (`kick` … `kick7`, one line per clip and section). Confirmed after the screenshots.

Hard rules: no name starts with a capital letter (so never Strudel's `S` solo), and the music is identical in every form (`check:line-names` compares the haps of `$:`, instrument names and track names at every step).
