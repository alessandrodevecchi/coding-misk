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
- **The limiter hides a loud mix.** `out=` stays at the ceiling (0.97) whatever the mix does. Read `in=`: far above it the peaks are squashed. A new tap on the output goes on `destinationGain`, after the limiter; the master level is the limiter's `level` node, not `destinationGain` (it stays at 1).
- **Soundfont levels differ.** Organs and vibraphone are quiet, electric piano is loud. Measure every new `gm_` sound.
- **Kits without a row.** Some kits have no ride, crash or clap. The compiler plays the nearest row; see [sounds.md](sounds.md#missing-sounds).
- **Stretch at time zero.** A sound with `stretch` in the first tenth of a second of a render stayed silent. The fast export starts 0.1 s later.
- **Level noise.** Guitars and `fx` move between runs. Measure twice before blaming a change.
- **Editing `src/` during a browser check.** Vite reloads the page; the rest of the run measures silence.

## Page speed

- **Never grow songs for a list.** A growth (`crescendoSong`, Crescendo or Live coder) takes up to a few seconds per song. Growing every song for the Songs tab froze the page for 8 s and more, and over a minute with the Live build switch on and many songs. Song cards, the playlists tab and every other list use the written song (`cardOf`, `playable(tr, RADIO_LIVE())`) and the grown length from `src/library/song-durations.json` or the page worker (`src/live/card-duration.js`). A song grows in the page only when it is played, exported or edited in Compose; the song restored in Compose at start grows in the page worker. `node tools/check-startup.cjs` fails on a long task over 1.5 s at load.
- **A song changed means stale card lengths.** After a change to a built-in song, the growth rules, `SHAPES_VERSION` or `CRESCENDO_VERSION`, run `npm run durations`; `npm run check:durations` fails until then.
- **The radio's grow worker is not for page work.** A growth for the page waits in a second worker (`pageAway`), so the radio never waits behind it.

## Generated code and fixtures

- **Fixtures move.** A director change that moves `npm run check:endless -- --write-fixtures` needs `DIRECTOR_VERSION` raised in the same commit. A growth change that moves the Live coder fixtures needs `SHAPES_VERSION` raised; the Crescendo fixtures must not move with it.
- **Seeds are named streams.** Add a new random stream for a new feature. Drawing from an existing stream changes every song after it.
- **Complexity 0 and source `patterns`** must keep giving the old songs. Saved sessions and fixtures depend on it.
- **Snapshots of code.** `npm run snapshot:code` rewrites `tests/snapshots/code/`. Do it only for an intended change, with the reason in the commit. `tests/snapshots/code-before-ideas/` is never rewritten: it is the reference of `tools/check-ideas.cjs`.
- **The Strudel catalog.** Any change to code the catalog reads makes `npm run check:knowledge` warn until `npm run catalog:strudel` runs again. Rebuild it when Strudel, the generator or the app functions change, and before a merge to main; it is not needed for every commit.
- **Quick is not full.** `npm run check:crescendo` runs every check on a sample of songs and the fixtures on all of them. After a change to growth rules, shapes or typing, and before a merge to main, run `--full`: counts and medians over the corpus are checked only there.
- **The code cache.** `.cache/checks/` is keyed by the song, the recipes and the app code a tool imports. Code that a tool reads without importing it (a file read at run time) is not in the key: add it to the key, or run with `--no-cache`.
- **Window steps name their tracks.** `windowSong` prefixes every track a step names (`s3-bass`): add, remove, set, pattern, rack, and the grown songs' mute, solo, hide, reveal, comment, notes, variant, mask and clone. A new step field that names a track must be added there and in `stepRefs` (`src/live/air-code.js`), or it silently does nothing on air.
- **Old recipes replay in blocks.** A recipe without `growth: 1` must never grow its songs (`growsOnAir`); it was heard in blocks. Do not drop the marker from new recipes.
- **Commands on a grown song keep its past.** `steerOnAir` copies the steps before the boundary verbatim and adds moves only from it; a track that came in by a step keeps an `add` (stateAt mutes every track an `add` names before its step), or it would play in the past. Commands record their boundary in the grown song's bars; the director's rewrite gets `at - airOffset`.
- **The code of the moment lists a section's later lines without Sections.** Without the Sections option (`fnLanes`) a Live coder section shows every clip line it holds, and a guitar line gated with `postgain` shows every clip of its track; a command that rewrites the future changes those lines, never the sound or the steps before its boundary. With Sections (in compact, the Live coder default) the code shows only the clip that plays and the guitar's own section, edited at each clip change.
- **Sections adds steps.** With `fnLanes` the build gets a step at every section start and at every clip start or end inside a section (`clipBounds`). A check that compares the code at a step with the code in full must stop at the next step of both builds, and before the song's end: the code in full loops its lanes after the last bar.
- **A lane of 1 is a velocity of 1.** The code of the moment in full drops a lane that is 1 on the whole section, so its events have no velocity; with Sections the mixer plays the lane and sets velocity 1. The sound is the same: compare a velocity of 1 as no velocity (`check:mixer`, `check-compact-code.cjs`).
- **The mixer's lanes find their line by place.** Lines shown after a fade (`hidden`, the last bar of the section before) come after the code shown, so their events come in another order: compare events sorted by time.
- **A hap's first place is not its line.** A hap carries the places in the code of every value that made it, and the first one can be a constant outside its line (a section lane, a shared idea). The hidden mixer finds a hap's line by any of its places that falls inside a pattern line (`MIX_SOURCE` in `src/song/writer.js`); reading only the first one left the mixer and compact presets without levels on such lines. `npm run check:mixer` compares every hap with the code in full.
- **Two lines alike once the mix is out.** With the mixer preset, two lines that differ only in orbit, analyze or a written gain show the same text (prova-voce-notte: a crash on orbit 1 and a line on orbit 9). The code as written takes its mixer entries line by line, by position (`entries` of `writeCode`, kept per code shown in `liveCode`); only code edited by hand looks a line up by its text, and a text two different entries share keeps just the values they agree on. Never key mixer data by line text alone.
- **Two songs in one code.** Code that sits next to the song on air must not redeclare its constants, share its orbits or solo against it: use `apart()` in `src/live/air-code.js`.

## Browser checks

- **They need the dev server** on `http://localhost:5173` and `PLAYWRIGHT_CORE` set (see `AGENTS.md`).
- **No global Compose profile any more.** A check that sets `coding-misk-profile` or `coding-misk-live` changes nothing: set a trial in `coding-misk-song-trials` (`{ songId: { profile, live, options } }`) or a `config` on the song.
- **Song lists are paged by 20.** A check that looks for a song on the first page breaks when songs are added. Search by title.
- **The first song selection can be ignored** by a fresh page. Select again until the editor shows the song's sections.
- **The code shown types ahead of the sound.** Live typing starts the edit toward the next step early: a spoken line on bar 0 leaves the panel about a bar later, while what plays changes only at the step. Read the code shown often (every 0.2 s) or read the code evaluated.
- **Two fast exports are not bit-identical.** The render is seeded, but the WAV samples still differ a little from run to run. To prove an export unchanged compare the timeline, the recipe and the track list byte for byte, and the audio against the run-to-run difference.
- **Background tabs stop animation frames.** Tempo, steps and the radio run from a worker timer when the tab is hidden; do not move them back to frames.

## Writing

- **No long dashes** in notes, docs or app texts. Write two sentences or use a colon.
- **Both languages.** Every interface string exists in English and Italian with the same key. `npm run check:guide` fails otherwise.
- **Private plans stay private.** Plans about where the output goes, and references that name real artists or brands, live in the owner's private notes. Docs, issues, specs and app texts name no platform.
- **Icons are drawn,** never emoji. Show the owner screenshots before changing a look.
- **Talk to the owner in Italian.** Docs and code comments are in English; `DEVLOG.md` is in Italian.
