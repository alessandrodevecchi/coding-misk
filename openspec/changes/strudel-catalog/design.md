## Context

See proposal.md for the motivation. What is installed (October 2026):

- `@strudel/core` 1.2.6, `@strudel/mini` 1.2.6, `@strudel/tonal` 1.2.6, `@strudel/draw` 1.2.6, `@strudel/webaudio` 1.3.0, `@strudel/midi` 1.3.0, `superdough` 1.3.0, all AGPL-3.0-or-later, like this project (`package.json`). The app loads them through `@strudel/repl` 1.3.0; `src/render/page.js` imports `@strudel/core` directly.
- The sources (`*.mjs` outside `dist/` and `test/`) carry JSDoc blocks: about 346 `@name` entries and 140 `@synonyms` names. Controls are documented in `@strudel/core/controls.mjs` and registered with `registerControl(names, ...aliases)`; pattern functions with `register('name', ...)` in `pattern.mjs`, `signal.mjs`, `pick.mjs` and others.
- Some registered functions have no `@name` block: `chooseCycles`, `ply`, `pick`, `fm2` to `fm8` (found by a probe of the sources). `S$:` (solo) is not a function: the installed REPL handles it as a line label (`@strudel/core` repl.mjs), like `_$:` (mute); the catalog lists both labels in a separate "labels" section.
- `@strudel/codemirror` 1.3.0 bundles a prebuilt documentation list in `dist/index.mjs` for its autocomplete. It is built from another release than core 1.2.6.
- The app registers its own helpers (`installHelpers` and `preludeText` in `src/song/writer.js`): `o`, `drive`, `voice`, plus the hidden mixer.
- Generated code comes from `compileSong` (`src/song/compile.js`), the compact and per-moment views (`src/song/compile-compact.js`), the crescendo builds (`crescendoSong` in `src/song/crescendo.js`) shown through `liveCode` (`src/live/live-code.js`) with the profile controls, and the director (`src/endless/`). `tools/snapshot-code.mjs` already compiles every song in Node.

## Goals / Non-Goals

**Goals:**

- One committed catalog of the functions of the installed version, readable by people and by tools.
- Know, with numbers, which functions the app writes.
- Catch a generator that writes a function Strudel does not have, before it reaches the browser.

**Non-Goals:**

- Changing any generated code or adding new functions to the generators (that is `idea-model`, `material-generator`, `growth-shapes`).
- Running the functions or checking their arguments.
- A catalog page in the app or a Guide card.
- Mini-notation syntax inside strings.

## Decisions

### D1. Read the sources, not the bundled list

The tool walks the installed packages listed above (`*.mjs`, skipping `dist/`, `test/`, `bench/`), parses each `/** ... */` block with `@name`, and reads `@synonyms`, `@param {type} name text`, `@example` (until the next tag) and the text before the tags. It then scans the same files for `register('name'` and `registerControl(` names, and adds any name with no block as `documented: false`. Names are sorted; entries are written with stable key order.

Alternative: read the list bundled in `@strudel/codemirror`. Rejected: it is built from another release, so it would list functions that core 1.2.6 does not have.

### D2. Files

- `docs/strudel/functions.json`: `{ source: { packages: { name: version }, licence, url }, functions: [{ name, synonyms, description, params, examples, package, file, documented }] }`.
- `docs/strudel/variety.json`: hand-written, `{ name: { useful: true, note, changes: ["idea-model", ...] } }`. The first pass lists `voicing`, `chord`, `beat`, `sometimes`, `sometimesBy`, `almostNever`, `every`, `lastOf`, `iter`, `chooseCycles`, `off`, `ply`, `rib`, `seg`, `irand`, `perlin`, `pick`, `duck`, `lpenv`, `fmh`, `fmwave`, `fm2` to `fm8`, `penv`, `scrub`, `ir`. `S$` is listed with the note "not in the installed version".
- `docs/strudel/coverage.json`: per function, the kinds of code that write it (`songs`, `live`, `radio`) and how many sources.
- `docs/STRUDEL-FUNCTIONS.md`: the attribution header, a summary (functions, documented, written, never written), the coverage table (function, synonyms, package, written by, useful for variety), then one short section per function with its description, parameters and first example. Full examples stay in the JSON.

### D3. What code is compiled

The same set for coverage and for the check:

- Every song in `songs/` and `songs/examples/` through `compileSong`.
- Every song with a live build, in each profile (Classic, Crescendo, Switch) and each `functions` option (`full`, `short`, `mixer`), through `crescendoSong` and `liveCode`, every step.
- One radio session per style (10 minutes, seed `catalog-<style>`), each song compiled and its build steps shown as above.
- The app prelude (`preludeText`).

A full run should take well under a minute in Node; the endless check already builds similar sessions.

### D4. Finding function calls

A small scanner walks the code and skips strings, template strings and comments. It records every identifier followed by `(`, with or without a leading `.`. Names declared in the code itself (`const`, `let`, function parameters) and JavaScript built-ins (`Math`, `Array`, `console`, ...) are ignored. App helpers come from a list exported by `src/song/writer.js`, so adding a helper there keeps the check green.

Alternative: parse with `acorn`. It is installed only as a dependency of `@strudel/transpiler`; using it would mean a new direct dependency. The generated code is simple enough for a scanner, and the check proves it on every song.

### D5. The check

`tools/check-strudel.mjs` (`npm run check:strudel`) runs D3 and D4 and fails when:

- a called name is not a function name or synonym in the catalog and not an app helper (it prints the name and the first three sources that write it);
- a package version in `functions.json` differs from the installed one (it says to run `npm run catalog:strudel`).

It prints, without failing, functions written by the app that are marked undocumented, and a note when `coverage.json` is out of date.

### D6. Attribution

Both the JSON (`source` field) and the Markdown header state: "Function documentation extracted from Strudel (strudel.cc, source codeberg.org/uzu/strudel), packages and versions read, licence AGPL-3.0-or-later, by the Strudel contributors." The project is AGPL-3.0-or-later too, so committing the extracted text is allowed with this notice.

## Risks / Trade-offs

- [JSDoc blocks with odd formats are misread] → The tool reports blocks with no `@name` and names with no block; the first run is reviewed by hand and the count goes in the DEVLOG.
- [The Markdown page is large] → One short section per function; full examples only in the JSON.
- [The scanner misses a call, for example a function passed as a value] → Accepted for the first version: generators always write calls.
- [A Strudel update renames a function the app writes] → That is the point of the check: it fails before the app does.
- [Coverage changes with every new song] → The check does not fail on stale coverage; the catalog script refreshes it.

## Open Questions

- **Stale coverage.** Recommended: the check warns but does not fail when `coverage.json` is out of date. Alternative: fail, so the table is always current, at the cost of a rebuild after every song change.
- **Which packages.** Recommended: core, mini, tonal, draw, webaudio, midi and superdough. `@strudel/hydra` and `@strudel/codemirror` are left out: the app's generated code never uses them.
- **Language of the catalog page.** Recommended: English only, like the Strudel docs it quotes; no Italian copy.
