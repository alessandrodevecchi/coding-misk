---
id: status
related: [decisions, checks, README]
code: [openspec/changes, DEVLOG.md]
checks: [npm run check:knowledge]
---

# Status

Where the work stands. The changes are generated from `openspec/changes/`; the issues are a snapshot written by hand. Private matters are not listed here.

Before starting work, read the last entries of `DEVLOG.md` (Italian) and run `gh issue list` for the current issues. Every feature starts with an OpenSpec change shown to the owner; code comes only after the owner says go.

## Open changes

<!-- generated:changes -->
OpenSpec changes not archived: 81. With open tasks: 25. All tasks ticked, waiting to be archived: 56.

| Change | Open tasks | Tasks |
| --- | --- | --- |
| [code-now](../../openspec/changes/code-now/tasks.md) | 1 | 9 |
| [code-widgets](../../openspec/changes/code-widgets/tasks.md) | 3 | 31 |
| [crescendo](../../openspec/changes/crescendo/tasks.md) | 1 | 31 |
| [crescendo-code](../../openspec/changes/crescendo-code/tasks.md) | 1 | 9 |
| [fm-groove-lab](../../openspec/changes/fm-groove-lab/tasks.md) | 1 | 16 |
| [generator-followups](../../openspec/changes/generator-followups/tasks.md) | 2 | 3 |
| [growth-shapes](../../openspec/changes/growth-shapes/tasks.md) | 3 | 25 |
| [idea-model](../../openspec/changes/idea-model/tasks.md) | 3 | 20 |
| [idiomatic-code](../../openspec/changes/idiomatic-code/tasks.md) | 2 | 8 |
| [live-output](../../openspec/changes/live-output/tasks.md) | 5 | 9 |
| [live-timeline](../../openspec/changes/live-timeline/tasks.md) | 1 | 11 |
| [live-typing](../../openspec/changes/live-typing/tasks.md) | 1 | 10 |
| [material-generator](../../openspec/changes/material-generator/tasks.md) | 1 | 22 |
| [narrator-ghost-row](../../openspec/changes/narrator-ghost-row/tasks.md) | 13 | 13 |
| [natural-growth](../../openspec/changes/natural-growth/tasks.md) | 2 | 10 |
| [new-song-panel](../../openspec/changes/new-song-panel/tasks.md) | 1 | 21 |
| [pattern-library](../../openspec/changes/pattern-library/tasks.md) | 1 | 16 |
| [performance-profiles](../../openspec/changes/performance-profiles/tasks.md) | 1 | 9 |
| [player-bar](../../openspec/changes/player-bar/tasks.md) | 1 | 8 |
| [radio-profiles](../../openspec/changes/radio-profiles/tasks.md) | 1 | 36 |
| [radio-variation](../../openspec/changes/radio-variation/tasks.md) | 1 | 17 |
| [song-library-meta](../../openspec/changes/song-library-meta/tasks.md) | 1 | 10 |
| [switch-styles](../../openspec/changes/switch-styles/tasks.md) | 2 | 8 |
| [voice-instrument](../../openspec/changes/voice-instrument/tasks.md) | 1 | 16 |
| [widgets-on-stage](../../openspec/changes/widgets-on-stage/tasks.md) | 20 | 20 |

Ticked and not archived: `after-tests-oct28`, `app-guide`, `arp-patterns`, `artists-and-styles`, `backfill-app-features`, `clear-names`, `code-lanes`, `code-writing`, `continue-in-radio`, `curve-look`, `extend-song`, `fast-export`, `fast-video`, `faster-checks`, `fragment-extras`, `growth-in-background`, `human-typing`, `knowledge-base`, `level-headroom`, `lines-ahead-balanced`, `live-coder-growth`, `pattern-followups`, `playlists`, `poetic-steps`, `procedural-visuals`, `profile-options`, `radio-chooser-versions`, `radio-compilation`, `radio-curves`, `radio-fast-export`, `radio-knob-locks`, `radio-sessions-in-playlists`, `radio-steering`, `random-tools`, `reused-lines`, `session-video`, `shape-search`, `song-functions`, `song-own-settings`, `song-search`, `song-soul`, `song-transitions`, `song-trash`, `sound-guard`, `strudel-catalog`, `test-fixes`, `timeline-growth`, `two-modes`, `typing-lines`, `typing-mistakes`, `vertical-clips`, `voice-controls`, `voice-full-controls`, `voice-function`, `voice-placement`, `written-like-coder`.
<!-- /generated -->

Many open tasks are the owner's listening tests or short videos for the owner. They are not code to write: leave them open and mention them.

## Open issues

Snapshot of 2026-10-19 (`gh issue list`). Well-defined work lives in GitHub issues; rough ideas live in the owner's private backlog.

- **Variety and growth:** `#64` live build in small steps, `#70` parts as ideas, `#71` composed parts, `#72` pattern library, `#73` song functions, `#69` Strudel catalog, `#74` this knowledge base.
- **Radio:** `#18` endless mode and its phases `#21` to `#26`, `#24` steering, `#40` curves, `#45` extend the song on air, `#49` compilation, `#59` knobs during a compilation, `#38` sessions in playlists.
- **Voice:** `#39` long spoken passages, `#62` spoken comments in Spanish, `#63` speaker variants sound the same, `#66` more varied voices.
- **Output:** `#8` fast export, `#27` video, `#53` fast video, `#55` console view in the video picture, `#56` new code in the spotlight, `#57` vertical clips, `#60` fragments ready for sharing, `#61` long exports to disk, `#65` timeline in the picture, `#52` a second window with only the picture.
- **Library and interface:** `#31` settings, `#32` player bar, `#33` code versions, `#34` search, `#36` playlists, `#42` two modes, `#43` genres view, `#44` interface review, `#48` the Guide, `#67` song dates, `#68` trash.
- **Later or concept:** `#7` more genres, `#16` tracker module track, `#19` device panels, `#26` MCP server (builds on this knowledge base), `#37` use from any device, `#41` add an instrument the song lacks, `#46` song soul, `#47` curves look, `#50` random tools, `#51` invented styles, `#58` new visual scenes.

Many issues stay open after their feature shipped, until the owner tests it and the release goes to `main`.

## Follow-ups

- "Long song from" on the radio (reused-lines, `#85`): the radio keeps 15 minutes for now; a radio song extended several times (continue in radio) can grow long, so the rule may matter there later.
- Lines typed ahead (reused-lines D8, `#85`): the Balanced limits, in the growth and in the written part (lines-ahead-balanced), give 16 lines over the built-in songs, 14 at growth steps, muted at most 58 s; the limits are to be tuned after the owner's screenshots (`AHEAD` in `src/live/written-plan.js`).
