## Why

The app has grown into many connected parts: profiles, styles, artists, recipes, ideas, patterns, growth shapes, the voice, the narrator, the radio, song functions and the material generator. What each part does is written in `AGENTS.md`, in one file per area under `docs/`, in OpenSpec changes and in the in-app Guide, but nothing shows how the parts affect each other. A new session or another agent cannot rebuild that picture quickly, and it may know nothing about Strudel itself. A knowledge base in the repo is also the first step before an MCP server (#26).

## What Changes

- **Knowledge base in `docs/knowledge/`.** An index and one note per concept, linked to each other. Each note says what the concept is, how it connects to the others, where it lives in the code, which checks cover it, and describes its options.
- **Strudel basics first.** An entry note on Strudel itself: cycles, mini-notation, `$:` lines, `setcpm`, chains, sounds and banks, notes and scales, effects and orbits. It links to the official Strudel documentation, our function catalog for the exact version we ship, and the in-app Strudel lessons, and says what the app adds on top (its own functions, the hidden code, the mixer).
- **Real code examples.** Notes show examples taken from the app itself: an idea and the code it gives, a pattern, a song function, a Live coder growth step before and after, a radio command and what it changes. They are generated from the example songs, not written by hand.
- **Generated parts.** Lists of styles, radio commands and profile options, and option descriptions, come from the code and the app's own help texts in English and Italian.
- **Decisions and lessons.** One note keeps the important choices and the rejected attempts with their reasons, drawn from the DEVLOG, so a new agent does not repeat them.
- **A check keeps it true.** `npm run check:knowledge` fails when a concept, option, command or style has no note, when a link is broken, when a generated part is out of date, or when an example no longer compiles.
- **Rule for future changes.** A change that adds a concept or an option updates its note; `AGENTS.md` points to the index.

## Capabilities

### New Capabilities

- `docs/knowledge-base`: structure, content, generated parts, examples and the check of the knowledge base for agents.

### Modified Capabilities

None.

## Impact

- **Docs:** new `docs/knowledge/`; `AGENTS.md` (pointer and rule); existing `docs/*.md` stay the detailed references and are linked from the notes.
- **Tools:** a generator for the generated parts and examples, and `tools/check-knowledge.mjs` (`npm run check:knowledge`), no browser.
- **App:** none.
- **Issue:** #74; #26 (MCP server) builds on it.
