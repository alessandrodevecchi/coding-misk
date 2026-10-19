# Audit: ready for a task (task 5.1)

Date: 2026-10-19. Question for each task: "an external agent gets only `AGENTS.md` and `docs/knowledge/`: does it have everything it needs?" Sources: the spec, DEVLOG, open issues, open changes and the app's features. "Before" is what the knowledge base had; "Now" is where the answer lives.

| # | Task | Source | Gap before | Now |
| --- | --- | --- | --- | --- |
| 1 | Define an artist | spec, #35 | fields listed, no steps, no effect of fields, nothing on what not to write | `recipes-music` Define an artist; `artists.md` how fields steer, what not to write |
| 2 | Generate an artist | spec, #50 | no entry point for a seeded artist | `recipes-music` Generate an artist |
| 3 | Define a style | spec, #21 | no steps; style descriptions missing | `recipes-music` Define a style; descriptions block in `styles.md` |
| 4 | Invent a style from a mood | #51 | no mood to field mapping | `from-a-reference.md` (measures to fields, anchors) |
| 5 | Style or song from an audio file | owner | nothing on inputs, measures, tools | `from-a-reference.md` |
| 6 | From a MIDI file or a score | owner | nothing; not built | `from-a-reference.md` ideas not built yet |
| 7 | Add a sound or an instrument | spec | no inventory of sounds | `sounds.md`; `recipes-parts` Add a sound |
| 8 | Which sounds are missing | spec | none | `sounds.md` missing block (generated) |
| 9 | Pick a drum machine for a style | style work | kits and missing rows unknown | `sounds.md` drum machines, `KIT_MISSING` |
| 10 | Write a song | spec | format only, no checks flow, snapshots | `recipes-parts` Write a song |
| 11 | Add a preset | spec | presets not listed | `music-engine.md` presets; `recipes-parts` Add a preset |
| 12 | Add a pattern | spec, #72 | where saved patterns live | `recipes-parts` Add a pattern |
| 13 | Add a generator rule | spec, #71 | rules not listed, streams | `music-engine.md` rules; `recipes-parts` |
| 14 | Add a key, progression or meter | music work | tables not listed | `music-engine.md`; `recipes-parts` |
| 15 | Add a genre | #7 | `GENRES` and `g:` texts unknown | `recipes-music` Add a genre |
| 16 | Add a growth opening or move | spec, #64 | files, version bump, fixtures | `recipes-build` |
| 17 | Add a profile control | spec | `CONTROL_TEXT` and migrations | `recipes-build` |
| 18 | Add a technical or library function | spec, #73 | name rule only in decisions | `recipes-build` |
| 19 | Add a radio command | spec, #24 | files, streams, Guide, icons | `recipes-build` |
| 20 | Add a transition, energy shape or quirk | #23, #35 | none | `recipes-build`; `music-engine.md` lists |
| 21 | Voice lines, speaker, Spanish | #62, #63, #66 | none | `recipes-build` Add voice lines |
| 22 | Change the director safely | #24, DEVLOG | rule only in `AGENTS.md` | `recipes-build`; `checks.md` fixtures |
| 23 | Add a check | spec | conventions unknown | `recipes-app` Add a check |
| 24 | Update Strudel | spec | steps unknown | `recipes-app` Update Strudel |
| 25 | Interface text in both languages | spec, #48 | keys, Guide card, glossary | `recipes-app`; `glossary.md` |
| 26 | Add a setting | #31 | backup key | `recipes-app` Add a setting |
| 27 | Add a look | #58 | no visuals note | `visuals.md`; `recipes-app` Add a look |
| 28 | Export audio, video, fragments | spec, #8, #57 | command line tools | `recipes-app` Export |
| 29 | Fix a level or clipping problem | spec | no targets, no numbers | `sound-and-levels.md` levels block; `recipes-app` |
| 30 | A sound is silent | #54 | sound guard not explained | `sound-and-levels.md`; `recipes-app` Find why a sound is silent |
| 31 | Which checks after a change | spec | no map, no needs, no times | `checks.md` |
| 32 | Is this a known trap | DEVLOG | gotchas spread over docs | `pitfalls.md` |
| 33 | Translate a term for the owner | owner | none | `glossary.md` (generated) |
| 34 | What is open, what is next | DEVLOG, issues | none | `status.md` (changes generated, issues by hand) |
| 35 | Use an unused Strudel function | #69 | functions written as `rib`, `seg`, `fm2` listed as unused; coverage could go stale | `strudel-functions.md` fixed; catalog freshness in `check:knowledge` |

Not fixed here (outside the allowed files), reported to the owner:

- `docs/MUSIC-ENGINE.md` still says `o`, `drive` and `voice` are app helpers registered over Strudel names; they became `chan`, `crunch` and song functions.
- The catalog's code set does not include the "one line per track" view, so `pick`, which that view writes, counts as never written.
- `npm run catalog:strudel` reports names not in the catalog (`constructor`, `get`, `lane`, `laneOf`, `map`, `match`, `set`, `split`, `valueOf`), which `check:strudel` treats as unknown calls.
- The hats of `neon-rush-reel` peak above 1.0 in the level snapshot.
