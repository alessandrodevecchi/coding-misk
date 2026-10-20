---
id: pitfalls
related: [strudel, sound-and-levels, checks, decisions, comments-and-functions, ideas]
code: [docs/MUSIC-ENGINE.md, DEVLOG.md]
checks: [npm run check:knowledge]
---

# Known pitfalls

Mistakes that cost time before. Each line says what goes wrong and what to do. The reasons behind the big choices are in [decisions.md](decisions.md).

## Strudel

- **Tempo inside a pattern.** `.cps()` or `setcps` in a pattern drops notes. The player sets the tempo at bar lines; sections carry `bpm`.
- **Double quotes are mini-notation.** In evaluated code, `"…"` and backticks are patterns, even inside a helper. Use single quotes for plain strings.
- **Leading zero.** Inside mini-notation write `0.5`, not `.5`. Outside a string `.5` is fine (the writer prints `.15`).
- **`*n` around an alternation.** `"<a b>*2"` counts the alternation faster and the notes change. The idea writer never does it.
- **`add` outside the string on `n`.** `n("0 2").add("4")` does nothing useful on degrees. Sum the degrees first, then turn them into notes.
- **Chord names.** `voicing()` knows `F^7`, not `Fmaj7`. `Fmaj7` is only a key of the `CHORDS` table; an idea with `voicing()` must write `F^7`.
- **App names over Strudel names.** An app function named like a Strudel function or synonym hides it (`o` is `orbit`, `drive` is a filter overdrive, `env` exists). `npm run check:strudel` fails on it. `docs/MUSIC-ENGINE.md` still mentions `o`, `drive` and `voice` as helpers: that is out of date, they became `chan`, `crunch` and song functions.
- **A function the app has never written.** Look it up in [strudel-functions.md](strudel-functions.md) first: synonyms, parameters, whether it is documented.

## Sound and levels

- **Velocity is the section lane's.** A layer's own `velocity` is overwritten by the lane: shape volume with `postgain`.
- **Gain before drive.** Before heavy distortion `gain` only changes the saturation. Set the level after it with `postgain`.
- **A line above 1.0 is not clipping.** Lines pass the master (0.6) first and the browser audio is floating point. Only the output and exported files clip: read `out=` in `check-levels.cjs` and the export check. The output can clip with every line below 1.0.
- **Gain for saturation.** More `gain` does not make a sound dirty, it clips the output. Use distortion and `postgain`.
- **The limiter hides a loud mix.** `out=` stays at 0.95 whatever the mix does. Read `in=`: far above 0.95 the peaks are squashed. A new tap on the output goes on `destinationGain`, after the limiter; the master level is the limiter's `level` node, not `destinationGain` (it stays at 1).
- **Soundfont levels differ.** Organs and vibraphone are quiet, electric piano is loud. Measure every new `gm_` sound.
- **Kits without a row.** Some kits have no ride, crash or clap. The compiler plays the nearest row; see [sounds.md](sounds.md#missing-sounds).
- **Stretch at time zero.** A sound with `stretch` in the first tenth of a second of a render stayed silent. The fast export starts 0.1 s later.
- **Level noise.** Guitars and `fx` move between runs. Measure twice before blaming a change.
- **Editing `src/` during a browser check.** Vite reloads the page; the rest of the run measures silence.

## Generated code and fixtures

- **Fixtures move.** A director change that moves `npm run check:endless -- --write-fixtures` needs `DIRECTOR_VERSION` raised in the same commit. A growth change that moves the Live coder fixtures needs `SHAPES_VERSION` raised; the Crescendo fixtures must not move with it.
- **Seeds are named streams.** Add a new random stream for a new feature. Drawing from an existing stream changes every song after it.
- **Complexity 0 and source `patterns`** must keep giving the old songs. Saved sessions and fixtures depend on it.
- **Snapshots of code.** `npm run snapshot:code` rewrites `tests/snapshots/code/`. Do it only for an intended change, with the reason in the commit. `tests/snapshots/code-before-ideas/` is never rewritten: it is the reference of `tools/check-ideas.cjs`.
- **The Strudel catalog.** Any change to code the catalog reads makes `npm run check:knowledge` fail until `npm run catalog:strudel` runs again (several minutes).
- **Window steps name their tracks.** `windowSong` prefixes every track a step names (`s3-bass`): add, remove, set, pattern, rack, and the grown songs' mute, solo, hide, reveal, comment, notes, variant, mask and clone. A new step field that names a track must be added there and in `stepRefs` (`src/live/air-code.js`), or it silently does nothing on air.
- **Old recipes replay in blocks.** A recipe without `growth: 1` must never grow its songs (`growsOnAir`); it was heard in blocks. Do not drop the marker from new recipes.
- **Commands on a grown song keep its past.** `steerOnAir` copies the steps before the boundary verbatim and adds moves only from it; a track that came in by a step keeps an `add` (stateAt mutes every track an `add` names before its step), or it would play in the past. Commands record their boundary in the grown song's bars; the director's rewrite gets `at - airOffset`.
- **The code of the moment lists a section's later lines.** In the Live coder view a section shows every clip line it holds, with lanes; a guitar line gated with `postgain` shows every clip of its track. A command that rewrites the future changes those lines, never the sound or the steps before its boundary.
- **Two songs in one code.** Code that sits next to the song on air must not redeclare its constants, share its orbits or solo against it: use `apart()` in `src/live/air-code.js`.

## Browser checks

- **They need the dev server** on `http://localhost:5173` and `PLAYWRIGHT_CORE` set (see `AGENTS.md`).
- **Song lists are paged by 20.** A check that looks for a song on the first page breaks when songs are added. Search by title.
- **The first song selection can be ignored** by a fresh page. Select again until the editor shows the song's sections.
- **Background tabs stop animation frames.** Tempo, steps and the radio run from a worker timer when the tab is hidden; do not move them back to frames.

## Writing

- **No long dashes** in notes, docs or app texts. Write two sentences or use a colon.
- **Both languages.** Every interface string exists in English and Italian with the same key. `npm run check:guide` fails otherwise.
- **Private plans stay private.** Plans about where the output goes, and references that name real artists or brands, live in the owner's private notes. Docs, issues, specs and app texts name no platform.
- **Icons are drawn,** never emoji. Show the owner screenshots before changing a look.
- **Talk to the owner in Italian.** Docs and code comments are in English; `DEVLOG.md` is in Italian.
