# Knowledge base

This folder explains what the app is made of and how its parts affect each other. It is written for coding agents and new sessions with no history.

`AGENTS.md` says how to work: rules, commands, checks. This folder says how things are: concepts, options, links between them. Read this to understand, read `AGENTS.md` to act.

The detailed references stay in `docs/*.md`. Each note links them.

## Reading order

1. [strudel.md](strudel.md): Strudel itself, and what the app adds on top.
2. [songs.md](songs.md): the song format. Everything else reads or writes songs.
3. [ideas.md](ideas.md): parts written as small musical ideas.
4. [live-build.md](live-build.md): a song that builds itself while it plays.
5. [profiles.md](profiles.md): the named sets of controls for a live build.
6. [growth-shapes.md](growth-shapes.md): how a Live coder build opens and grows.
7. [comments-and-functions.md](comments-and-functions.md): what the code shows, and the app's own functions.
8. [styles.md](styles.md): style recipes, the source of generated songs.
9. [material.md](material.md): the generator that composes new parts.
10. [patterns.md](patterns.md): the Patterns tab and the user's saved patterns.
11. [radio.md](radio.md): endless sessions made by the director.
12. [radio-commands.md](radio-commands.md): the console that steers the song on air.
13. [artists.md](artists.md): artists, a taste over styles and knobs.
14. [voice.md](voice.md): the voice instrument, spoken lines in the music.
15. [narrator.md](narrator.md): the voice that comments the steps of a build.
16. [export.md](export.md): audio, video and fragments out of the app.
17. [library.md](library.md): the Songs tab, playlists, trash and backup.
18. [settings.md](settings.md): the settings page.
19. [decisions.md](decisions.md): important choices and rejected attempts, with reasons.

## The notes

| Note | One line |
| --- | --- |
| [strudel.md](strudel.md) | Cycles, mini-notation, `$:` lines, sounds, notes, effects, orbits; what the app adds |
| [songs.md](songs.md) | Song format v2: sections, tracks, patterns, clips, steps |
| [ideas.md](ideas.md) | A part as a cell, steps, degrees, chords, seeded randomness or a shared line |
| [live-build.md](live-build.md) | Steps that bring tracks in, Crescendo, the Live coder growth, typing |
| [profiles.md](profiles.md) | Classic, Crescendo, Live coder, and every control they set |
| [growth-shapes.md](growth-shapes.md) | Openings, paces and developments of a Live coder build |
| [comments-and-functions.md](comments-and-functions.md) | Comment options, technical functions, helpers, library and song functions |
| [styles.md](styles.md) | Style recipes in `styles/`, families, mixing with chaos |
| [material.md](material.md) | Melodies, basslines, arpeggios, chords, grooves and sounds from a seed |
| [patterns.md](patterns.md) | Built-in presets as patterns, saved patterns, loops, Add to song |
| [radio.md](radio.md) | The director, sessions, knobs, transitions, compilation, curves |
| [radio-commands.md](radio-commands.md) | Every console command, when it applies, what it changes |
| [artists.md](artists.md) | Artist files, their taste, random artists |
| [voice.md](voice.md) | Spoken tracks: opening, passage, refrain, chop |
| [narrator.md](narrator.md) | Spoken step comments, speakers, explain or poetic |
| [export.md](export.md) | Real time and fast export, formats, video, fragments |
| [library.md](library.md) | Songs tab, filters, playlists, trash, backup |
| [settings.md](settings.md) | Appearance, audio, video, fragments, radio defaults, data |
| [decisions.md](decisions.md) | Decisions and rejected attempts, each with its reason and source |

## Note template

Every concept note starts with a front block:

- `id`: the file name without `.md`.
- `related`: ids of the notes it affects or depends on.
- `code`: the main files, as paths from the repository root.
- `checks`: the commands that cover it.

Then five sections: What it is, How it connects, Options, Example, Where to read more.

## Generated blocks

Some parts of a note sit between `<!-- generated:name -->` and `<!-- /generated -->`. They come from the code and from the app's help texts in `src/i18n.js`. Code examples come from the example songs in `songs/examples/`.

`npm run knowledge` rewrites only those blocks. Text outside them is written by hand and kept.

## The check

`npm run check:knowledge` runs without a browser. It fails when:

- a style, console command, profile control, technical function option, growth value or helper has no note;
- a value has no help text in the app and no description written by hand;
- a link to a file or a heading is broken;
- a generated block is out of date;
- a code example does not compile, or a note misses a template section.

## Keeping it true

A change that adds a concept or an option updates its note in the same change. Run `npm run knowledge`, write what the generator cannot know, then run `npm run check:knowledge`.

When a decision is made or an attempt fails, add a line to [decisions.md](decisions.md). Remove lines that no longer hold.
