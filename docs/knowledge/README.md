# Knowledge base

This folder explains what the app is made of and how its parts affect each other. It is written for coding agents and new sessions with no history. With it, an agent should be able to take a task on this app without the original conversation.

`AGENTS.md` says how to work: rules, commands, checks. This folder says how things are: concepts, options, links between them, and recipes for the usual tasks. Read this to understand, read `AGENTS.md` to act.

The detailed references stay in `docs/*.md`. Each note links them.

## Reading order

1. [strudel.md](strudel.md): Strudel itself, and what the app adds on top. Then [strudel-functions.md](strudel-functions.md) before adding new moves or generator rules.
2. [songs.md](songs.md): the song format. Everything else reads or writes songs.
3. [music-engine.md](music-engine.md): keys, modes, progressions, meters and presets.
4. [ideas.md](ideas.md): parts written as small musical ideas.
5. [live-build.md](live-build.md): a song that builds itself while it plays.
6. [profiles.md](profiles.md): the named sets of controls for a live build.
7. [growth-shapes.md](growth-shapes.md): how a Live coder build opens and grows.
8. [comments-and-functions.md](comments-and-functions.md): what the code shows, and the app's own functions.
9. [styles.md](styles.md): style recipes, the source of generated songs.
10. [material.md](material.md): the generator that composes new parts.
11. [patterns.md](patterns.md): the Patterns tab and the user's saved patterns.
12. [radio.md](radio.md) and [radio-commands.md](radio-commands.md): endless sessions and the console.
13. [artists.md](artists.md): artists, a taste over styles and knobs.
14. [voice.md](voice.md) and [narrator.md](narrator.md): the voices.
15. [sounds.md](sounds.md) and [sound-and-levels.md](sound-and-levels.md): every sound, the missing ones, levels.
16. [visuals.md](visuals.md), [code-widgets.md](code-widgets.md), [export.md](export.md), [library.md](library.md), [settings.md](settings.md).
17. Before a task: [checks.md](checks.md), [pitfalls.md](pitfalls.md), [decisions.md](decisions.md), [status.md](status.md), [glossary.md](glossary.md).

## The notes

| Note | One line |
| --- | --- |
| [strudel.md](strudel.md) | Cycles, mini-notation, `$:` lines, sounds, notes, effects, orbits; what the app adds |
| [strudel-functions.md](strudel-functions.md) | Every Strudel function we ship, which ones the app writes, the useful ones not used yet |
| [songs.md](songs.md) | Song format v2: sections, tracks, patterns, clips, steps |
| [music-engine.md](music-engine.md) | Keys, modes, scales, progressions, meters, presets by kind, energy shapes |
| [ideas.md](ideas.md) | A part as a cell, steps, degrees, chords, seeded randomness or a shared line |
| [live-build.md](live-build.md) | Steps that bring tracks in, Crescendo, the Live coder growth, typing |
| [profiles.md](profiles.md) | Classic, Crescendo, Live coder, and every control they set |
| [growth-shapes.md](growth-shapes.md) | Openings, paces and developments of a Live coder build |
| [comments-and-functions.md](comments-and-functions.md) | Comment options, technical functions, helpers, library and song functions |
| [styles.md](styles.md) | Style recipes in `styles/`, their descriptions, families, mixing with chaos |
| [material.md](material.md) | Melodies, basslines, arpeggios, chords, grooves and sounds from a seed |
| [patterns.md](patterns.md) | Built-in presets as patterns, saved patterns, loops, Add to song |
| [radio.md](radio.md) | The director, sessions, knobs, transitions, compilation, curves |
| [radio-commands.md](radio-commands.md) | Every console command, when it applies, what it changes |
| [artists.md](artists.md) | Artist files, how each field steers the director, random artists |
| [voice.md](voice.md) | Spoken tracks: opening, passage, refrain, chop |
| [narrator.md](narrator.md) | Spoken step comments, speakers, explain or poetic |
| [sounds.md](sounds.md) | Synths, soundfonts, drum machines, samples, FM; sounds asked for and missing |
| [sound-and-levels.md](sound-and-levels.md) | Rack devices, the sound guard, level targets and snapshots, clipping |
| [visuals.md](visuals.md) | Themes, looks, the song soul, video and fragment layouts |
| [code-widgets.md](code-widgets.md) | Strudel's inline widgets written in the code panel: lines, counts, wrapper, settings |
| [export.md](export.md) | Real time and fast export, formats, video, fragments |
| [library.md](library.md) | Songs tab, filters, playlists, trash, backup |
| [settings.md](settings.md) | Appearance, audio, video, fragments, radio defaults, data |
| [from-a-reference.md](from-a-reference.md) | From a song, video, audio, MIDI, score or description to a style, artist, song or patterns |
| [recipes-music.md](recipes-music.md) | Recipes: artists, styles, genres, material from a reference |
| [recipes-parts.md](recipes-parts.md) | Recipes: sounds, songs, presets, patterns, generator rules, keys and progressions |
| [recipes-build.md](recipes-build.md) | Recipes: growth, profile controls, functions, radio commands, director changes |
| [recipes-app.md](recipes-app.md) | Recipes: checks, Strudel updates, texts, settings, looks, exports, levels |
| [checks.md](checks.md) | Every check: what it covers, what it needs, how long; fixtures and version bumps |
| [pitfalls.md](pitfalls.md) | Known mistakes and what to do instead |
| [glossary.md](glossary.md) | Words in English and Italian, interface terms from the app's texts |
| [status.md](status.md) | Open OpenSpec changes and issues |
| [decisions.md](decisions.md) | Decisions and rejected attempts, each with its reason and source |

## Tasks

Each task has a recipe with the files to change, the steps, the checks and the mistakes to avoid.

| Task | Recipe |
| --- | --- |
| Define an artist | [recipes-music](recipes-music.md#define-an-artist) |
| Generate an artist | [recipes-music](recipes-music.md#generate-an-artist) |
| Define a style | [recipes-music](recipes-music.md#define-a-style) |
| Add a sound or an instrument | [recipes-parts](recipes-parts.md#add-a-sound-or-an-instrument) |
| Write a song | [recipes-parts](recipes-parts.md#write-a-song) |
| Add a preset | [recipes-parts](recipes-parts.md#add-a-preset) |
| Add a pattern | [recipes-parts](recipes-parts.md#add-a-pattern) |
| Add a generator rule | [recipes-parts](recipes-parts.md#add-a-generator-rule) |
| Add a key, a progression or a meter | [recipes-parts](recipes-parts.md#add-a-key-a-progression-or-a-meter) |
| Add a genre | [recipes-music](recipes-music.md#add-a-genre) |
| Make material from a reference | [recipes-music](recipes-music.md#make-material-from-a-reference) |
| Add a growth opening or move | [recipes-build](recipes-build.md#add-a-growth-opening-or-move) |
| Add a profile control or option | [recipes-build](recipes-build.md#add-a-profile-control-or-option) |
| Add a technical or library function | [recipes-build](recipes-build.md#add-a-technical-or-library-function) |
| Add a radio command | [recipes-build](recipes-build.md#add-a-radio-command) |
| Add a transition, an energy shape or a quirk | [recipes-build](recipes-build.md#add-a-transition-an-energy-shape-or-a-quirk) |
| Add voice lines, a speaker or a language | [recipes-build](recipes-build.md#add-voice-lines-a-speaker-or-a-language) |
| Change the director safely | [recipes-build](recipes-build.md#change-the-director-safely) |
| Add a check | [recipes-app](recipes-app.md#add-a-check) |
| Update Strudel | [recipes-app](recipes-app.md#update-strudel) |
| Add interface text in both languages | [recipes-app](recipes-app.md#add-interface-text-in-both-languages) |
| Add a setting | [recipes-app](recipes-app.md#add-a-setting) |
| Add a look | [recipes-app](recipes-app.md#add-a-look) |
| Export audio, video or fragments | [recipes-app](recipes-app.md#export-audio-video-or-fragments) |
| Fix a level or clipping problem | [recipes-app](recipes-app.md#fix-a-level-or-clipping-problem) |
| Find why a sound is silent | [recipes-app](recipes-app.md#find-why-a-sound-is-silent) |

## Note template

Every concept note starts with a front block:

- `id`: the file name without `.md`.
- `related`: ids of the notes it affects or depends on.
- `code`: the main files, as paths from the repository root.
- `checks`: the commands that cover it.

Then five sections: What it is, How it connects, Options, Example, Where to read more. Recipe notes have one `###` section per task, each with **Files**, **Steps**, **Checks** and **Mistakes**. The checks, pitfalls, glossary, status and reference notes have their own fixed sections.

## Generated blocks

Some parts of a note sit between `<!-- generated:name -->` and `<!-- /generated -->`. They come from the code, the shipped packages, the app's help texts in `src/i18n.js`, the level snapshots and `openspec/changes/`. Code examples come from the example songs in `songs/examples/`.

`npm run knowledge` rewrites only those blocks. Text outside them is written by hand and kept.

## The check

`npm run check:knowledge` runs without a browser, in a few seconds. It fails when:

- a style, console command, profile control, technical function option, growth value, helper, rack device, progression, look or check has no note;
- a value has no help text in the app and no description written by hand;
- a link to a file or a heading is broken;
- a generated block is out of date, or an inventory block is missing;
- a task of the index has no recipe, a recipe is not in the index, or a recipe misses a part;
- a function the app writes under a synonym is listed as not written;
- a code example does not compile, or a note misses a template section.

It warns, without failing, when the Strudel coverage is older than the code it was built from (run `npm run catalog:strudel` when Strudel, the generator or app functions change, and before a merge to main), and when only the list of open changes in `status.md` is out of date (run `npm run knowledge`).

## Keeping it true

A change that adds a concept, an option or a kind of task updates its note or recipe in the same change. Run `npm run knowledge`, write what the generator cannot know, then run `npm run check:knowledge`.

When a decision is made or an attempt fails, add a line to [decisions.md](decisions.md). Remove lines that no longer hold.

## Audit of 2026-10-19

The knowledge base was tested against 35 tasks an outside agent could get, taken from the DEVLOG, the issues, the OpenSpec changes and the app's features. For each, an agent with only this folder and `AGENTS.md` had to find the files, the steps, the checks and the traps.

Gaps found and fixed: no recipe for any task; no list of sounds and no list of missing sounds; no keys, modes, progressions, meters or presets; no level targets or rack devices; no visuals note; no map of the checks with their needs and fixtures; no pitfalls; no glossary; no status; nothing on turning a reference into a style; style descriptions missing from the styles note; how artist fields steer the director; functions written under a synonym listed as unused; a Strudel coverage that could go stale unseen. The 35 tasks and where each answer lives are in [the audit of the change](../../openspec/changes/knowledge-base/audit.md).
