## Why

After `idea-model` the notes and rhythms are short, but the same effect chains repeat on many lines: `.decay(.12).sustain(0)`, `.lpf(sine.range(…).slow(8)).lpq(8)`, `.delay(.3).room(.3)`. Over the 38 built-in songs, `decay.sustain.delay.room` appears in 29 songs, a filter with resonance and an envelope in 29, a moving high-pass in 24. Live coders keep the code short by folding fixed sound chains into their own functions and leaving the knobs that move in view.

Three of our own helpers also take names that Strudel already uses: `o` (a synonym of `orbit`), `drive` (filter overdrive) and `voice` (a control). A viewer who knows Strudel reads `.drive(0.6)` as Strudel's overdrive and hears our distortion.

## What Changes

- **Our helpers never use a Strudel name.** `.o("bass")` becomes `.chan("bass")`, `.drive(.6)` becomes `.grit(.6)`, `.voice("flo")` becomes a song function. A check fails when a helper name is in the Strudel catalog. No old name stays registered.
- **Song functions.** In the code shown, a repeated chain of three or more effect calls can be one call with a name, defined once in the hidden code. Values that differ between uses become parameters: `.squelch(.12, 8)`. Standard Strudel stays the main language: sounds, notes, rhythms and masks stay written out.
- **A small library of functions.** Three or four functions for the most frequent chains (envelope, delay and reverb, filter with resonance, moving filter), with parameters. The library is a data file that grows with functions that emerge from songs and that the owner approves.
- **Names with a theme.** Function names come from the song: its style, genre, rhythm, track or title, from word lists per style, chosen by the song seed. Short abbreviations (two or three letters, like `o` for `orbit`) only for very frequent chains; a single letter only for a small function of one song.
- **Growth can change parameters.** A build step can change a parameter of a function in view. When a step changes a call inside a function that is not a parameter, that line is written out in full.
- **Technical functions: a preset over options.** The control keeps its name and becomes a preset (full, short, mixer, compact) over separate options, as Comments already do. Compact adds song and library functions. Live coder uses compact. Classic and Crescendo stay full and identical.
- **Hand-coded versions updated once.** Saved hand-coded code that uses `.o(`, `.drive(` or `.voice(` is rewritten to the new names when the app starts.

## Capabilities

### New Capabilities

- `live-build/song-functions`: helper names, song functions, the function library, names, parameters and growth, the Technical functions preset, the update of saved code.

### Modified Capabilities

None in `openspec/specs/`. The unarchived `code-writing` and `voice-function` changes describe the old names; this change replaces those names.

## Impact

- **Code:** `src/song/writer.js` (helpers, folding, prelude), `src/live/live-code.js`, `src/live/profiles.js`, `src/render/page.js`, a new data file for the library and the name lists, hand-coded versions in the song library.
- **UI:** the Technical functions control in the profile panel (preset and options), Guide and hints in Italian and English.
- **Checks:** `npm run check:strudel` (helper names never in the catalog), `tools/check-live-code.mjs` (Classic and Crescendo fixtures unchanged, compact code shorter and same events), event equivalence of compact against full for every built-in song.
- **Docs:** `docs/STRUDEL-FUNCTIONS.md`, the catalog, `docs/VARIETY.md`, DEVLOG.
- **Issue:** a new issue linked from `docs/VARIETY.md`.
