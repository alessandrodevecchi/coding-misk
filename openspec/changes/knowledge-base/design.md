## Context

Knowledge today: `AGENTS.md` (rules, commands, checks), `docs/*.md` (one reference per area: ARCHITECTURE, SONG-FORMAT, COMPOSING, STYLES, ENDLESS, MUSIC-ENGINE, VOCALS, ARTISTS, DESIGN-SYSTEM, VARIETY, STRUDEL-FUNCTIONS), OpenSpec changes, the in-app Guide (`src/guide.js`) and Strudel lessons tab, help texts in `src/i18n.js` (it, en), DEVLOG. Lists that matter live in code: `styles/*.json`, `COMMANDS` in `src/endless/steering.js`, `CONTROLS` and profiles in `src/live/profiles.js`, `FUNCTION_PRESETS`, `src/song/shapes.js`, `HELPERS` and `LIBRARY`.

A reference read on the way (WikiSkill, arXiv 2608.27454): keep curated knowledge separate from operational instructions, record rejected attempts with their reasons, link each rule to its motivation, prune stale notes.

## Goals / Non-Goals

**Goals:** an agent with no history understands Strudel, the app's concepts and how they connect, in a few files; the knowledge base cannot silently go stale.

**Non-Goals:** an MCP server or WebMCP (#26, later); replacing `docs/*.md` (they stay the detailed references); user documentation (the Guide stays); copying the Strudel documentation.

## Decisions

### D1. Layout
`docs/knowledge/README.md` (index, reading order), `strudel.md` (basics), one note per concept (`profiles.md`, `live-build.md`, `growth-shapes.md`, `comments-and-functions.md`, `songs.md`, `ideas.md`, `patterns.md`, `material.md`, `styles.md`, `artists.md`, `radio.md`, `radio-commands.md`, `voice.md`, `narrator.md`, `export.md`, `library.md`, `settings.md`), `decisions.md`. Short notes (target under 150 lines), English, plain words. `AGENTS.md` keeps the rules and points to the index: knowledge for understanding, AGENTS.md for doing.

### D2. Note template
Front block with `id`, `related` (note ids), `code` (paths), `checks` (commands). Sections: What it is · How it connects · Options · Example · Where to read more.

### D3. Generated blocks
`<!-- generated:<name> -->` … `<!-- /generated -->`. `tools/knowledge.mjs` (`npm run knowledge`) rewrites only these blocks. Option descriptions come from `src/i18n.js` (English text, Italian label in parentheses) so the app and the knowledge base say the same thing.

### D4. Examples
`tools/knowledge.mjs` builds examples from `songs/examples/` (Ideas, Material, Voices) through the same functions the app uses (compile, writer with the compact preset, live code steps, steering), and writes them into generated blocks. The check regenerates in memory and compares.

### D5. Coverage check
`tools/check-knowledge.mjs`: every style id, command, profile control, technical function option, growth opening/pace/development and helper appears in a note; every `related` id and relative link resolves; generated blocks equal a fresh generation; each note has the template sections.

### D6. Decisions note
Hand-written, seeded from the DEVLOG and the variety plan: one line per decision, the reason, the source (commit, change or DEVLOG date). Old entries that no longer hold are removed, not kept.

### D7. Ready for a task
Recipes in `recipes-music.md`, `recipes-parts.md`, `recipes-build.md` and `recipes-app.md`: one `###` section per task with **Files**, **Steps**, **Checks**, **Mistakes**; the index has a Tasks table that links each one. New notes: `sounds.md`, `sound-and-levels.md`, `music-engine.md`, `visuals.md` (inventories in generated blocks), `from-a-reference.md`, `checks.md`, `pitfalls.md`, `glossary.md` (generated from `src/i18n.js`), `status.md` (open changes generated, issues by hand). The audit is in `audit.md`.

### D8. Catalog freshness
`npm run catalog:strudel` writes `docs/strudel/inputs.json`: a SHA-256 of its inputs (the JavaScript it imports, followed through relative imports, the songs except `songs/endless/`, the style recipes, `docs/strudel/variety.json`, the versions of the installed Strudel packages). `check:knowledge` computes the same hash in milliseconds and fails when it differs. Rebuilding the coverage itself takes minutes, so the check never does it. Whole-line `//` comments of the JavaScript are left out of the hash, so a comment edit does not ask for a rebuild. Any other change to code the catalog reads does, even when the coverage would stay the same: over-sensitive on purpose, never stale.

## Risks / Trade-offs

- Notes drift from code → generated blocks and the coverage check.
- Too much text → short notes, links to `docs/*.md` for details.
- Strudel docs change → we link them and only explain basics in our words.
