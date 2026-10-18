## Context

`crescendoSong(song, { seed, rules })` in `src/song/crescendo.js` builds every growth. It picks the reference section, sorts its tracks by `ORDER` (`drums`, `bass`, `pad`, `guitar`, `arp`, `hook`, `texture`, `riser`, `code`), thins patterns so the simplest drum variant keeps the kick on beat one, and spaces the steps. With `rules.coder` (the growth "natural, like a live coder") `coderPath` in `src/song/coder.js` draws 4 to 6 waypoints and orders small moves with a replaceable chooser. Voice tracks are left out of the growth. The first step is at bar 0 and already written. Profiles in `src/live/profiles.js` map to rules through `growthRules`. `liveBuild` in `src/main.js` types each step before its bar with `makeTyping`.

Three rules make every build open alike (local measurements, see proposal): the fixed order by type, thinning that keeps one kick, and a first step that sounds at bar 0. The Live coder profile adds slow spacing and long pauses.

Strudel 1.2.6 (the version we ship) already mutes a line labelled `_$:` and plays only the lines labelled `S…$:` when one exists, so mute and solo need no new function.

## Goals / Non-Goals

**Goals:**
- A shape as data (opening, pace, development) that sets the parameters of the live coder growth.
- Classic and Crescendo builds byte for byte as today.
- A first version with every opening, the three paces and the six developments, each simple.

**Non-Goals:**
- Shapes for Classic and Crescendo, or for builds in blocks.
- Shapes in the radio before `radio-profiles` (on hold) brings growths to the radio.
- New Strudel functions beyond those the `strudel-catalog` lists as shipped.
- Favourite shapes, votes and per-artist shapes (after the listening test).

## Decisions

### D1. Shape data and who chooses

A song may carry `growthShape: { opening, pace, development }`, each part optional. A style recipe may carry `growthShapes: { openings: { id: weight }, paces: { … }, developments: { … } }`. The field names avoid `shape` and `shapes`, which already mean energy shapes in recipes and sessions.

Resolution per part: the song's value, else a weighted draw from the style, else a draw from the defaults below. Draws use the stream `shape-<SHAPES_VERSION>` seeded by the song id, so the shape never changes the other draws of the growth. Impossible openings (D2) are removed before the draw.

Default weights when nothing is named: openings all 1 except `slow` 2 and `voice` 0.5; pace slow 1, medium 2, fast 2; development by type 2, as written 2, masks 1, parameters 1, second section 1, metamorphosis 0.5.

Alternative rejected: one list of whole shapes ("trance", "ambient"). Three parts give many more combinations from little data, and a style can still fix all three.

### D2. Openings set the first waypoint

Each opening is a function `(dest, plans, rng) → { first, before }`: `first` is the first waypoint, `before` optional steps before it. `coderPath` takes it instead of its anchor rule. Requirements per opening:

| Opening | Needs | First waypoint |
| --- | --- | --- |
| `slow` | drums | today: kick on beat one |
| `full-kick` | drums with a kick | the written kick row (or its idea) only |
| `typed` | any | today's first waypoint, but bar 0 to the typing end is silent (D6) |
| `broken` | drums | the core is the groove's strongest off-beat hits: a written breakbeat keeps its own; a straight kick gets a tresillo (`x..x..x.` per half bar) or a two-step kick from the idea model |
| `filtered` | drums with a kick | full kick with a low-pass at about 300 Hz; the next steps open it |
| `melodic` | arp, hook, guitar or a synth | that track at its simplest; drums enter late |
| `pad` | pad or texture | the pad holding its first chord, or one held root (drone) |
| `voice` | a voice instrument line (`voice-instrument`) | the spoken opening line, alone or over a drone |
| `muted-base` | at least 3 tracks | every track of the reference section written, all but one with `_$:` |
| `mid-set` | at least 3 tracks | the tracks written, two of them with `S$:` |

The thinning core (`thinRows`) takes the core from the opening: beat one for `slow`, all kick hits for `full-kick` and `filtered`, the off-beat hits for `broken`.

### D3. Pace sets spacing in seconds

Today's spacing counts bars, so a slow tempo makes a slow start. Pace counts seconds over the first minute, then bars:

| Pace | First minute | After |
| --- | --- | --- |
| slow | today's natural spacing (4 to 8 bars, pauses 4 to 8) | today |
| medium | a step every 10 to 15 s, pauses 2 to 4 bars | 2 to 6 bars |
| fast | a step every 7 to 9 s (7 to 8 moves), pauses at most 2 bars | 2 to 4 bars |

With medium and fast the kick reaches its written row within 60 s: the fullness units of the drums come first in the chooser's weights. The human typing (`human-typing`) already shrinks the listening pause first when steps are close. "Audible change" is a step that changes the events heard, so a comment or a muted line does not count.

### D4. Development orders the waypoints

| Development | What changes |
| --- | --- |
| `by-type` | today: `dest` sorted by `ORDER` |
| `as-written` | `dest` sorted by the bar of each track's first clip, then by `ORDER` |
| `masks` | every track gets a mask idea per phrase (`"<1 1 0 1>"`); waypoints switch a mask value; variations are a second pattern picked by the mask |
| `parameters` | all destination tracks in the first two waypoints at neutral values; waypoints differ only in cutoff, density (`degrade` or steps), room, delay |
| `metamorphosis` | the first waypoint is the full song; later waypoints are a second skin (D7) |
| `second-section` | after the last waypoint of the first part, new lines written with `S$:`, grown, then the marks removed |

### D5. New build actions

`BUILD_ACTIONS` gains `mute` and `unmute` (the line stays, with `_$:`), `solo` and `unsolo` (`S$:`), `tempo` (a new tempo from the step's bar), `key` (a new key or transposition), and `slide` (a value moved a little on each of several bars). `comment` already exists and covers prepared variants and the prepared key change (`// .add(note(-4))` written early, uncommented later). `pick` alternation and `seg(16)` are notes edits on an idea (`notes` action) once `idea-model` writes them. Seek, export and hand takeover handle them because they are ordinary steps; `stateAt` applies them like the others.

### D6. Typed opening and silence

The typed opening adds a lead-in of 1 to 2 bars (a person types the first line in 4 to 8 s) before bar 0 of the growth. The code panel types the first line during it; the first sound is the first step. Audio export starts at the lead-in (silence is part of the song); fragments and the fast video start their random picks after it, as they skip the sparse start today.

### D7. Metamorphosis

The song plays its first full section early (after 1 to 3 steps of reveal). The second skin is a plan, not free code: a new tempo within 12 BPM or a jump to half or double time, a key a fifth away or a prepared transposition, and the parts of one other style of the same family from `material-generator` in the new key. The moves rewrite one line at a time; tempo and key change on a phrase boundary. At most two skins in the first version. The build ends on the last skin. Classic export of the song "as written" stays the first skin.

### D8. Second thoughts and ideas

A passing melody is a hook or arp from the song's own ideas, or composed by `material-generator` in the section's scale with the song's seed, entering at a waypoint and leaving one or two waypoints later (a detour of a new kind). A refined part enters as a simpler form of its idea (fewer degrees, a shorter cell) and is rewritten later. A check scales every note of both against the section's scale. Growth of ideas uses the idea's own operations (add a beat step, add a degree, add `seg`) when `idea-model` stores the part as an idea; the thinning of results stays for other parts.

### D9. Profiles, controls, versions

The shape applies when the growth is `natural` (Live coder profile, or a custom profile with that growth). `CONTROLS` gains `opening`, `pace` and `development`, each `auto` or a value; `auto` is the default, so the stored profiles of the owner stay valid. `SHAPES_VERSION` starts at 1 and lives next to `CRESCENDO_VERSION`; the Live coder fixtures move with it. Crescendo fixtures and `CRESCENDO_VERSION` do not change. The radio does not use shapes until `radio-profiles`; when it lands, the radio resolves the shape in the same way.

### D10. Style weights

The `switch-*` styles (renamed in `clear-names`) get weights from the research: trance styles full kick and fast; acid filtered kick and medium; house broken beat or muted base. Ambient and lo-fi prefer pad, melodic and slow. Other styles get no field and use the defaults.

## Risks / Trade-offs

- **[Silence at the start sounds broken]** → only the typed opening, 1 to 2 bars, with the typing visible; never in Classic or Crescendo.
- **[Fast pace and long lines]** → fast pace prefers small moves (a number, a step) in the first minute; long lines wait for later.
- **[Metamorphosis is the largest piece]** → limited to two skins and one style change; if it slips, it ships after the listening test with weight 0 meanwhile.
- **[Mute and solo in code views]** → `_$:` and `S$:` are labels on whole lines; the compact and "now" views keep the label on the first line of the block.
- **[Live coder songs sound different]** → intended; `SHAPES_VERSION` lets saved items warn.

## Open Questions

- **Bursts of edits** (owner, 2026-10-18): in Prima luce around 2:54 many edits come close together and the human typing speeds up to fit, so the text is typed very fast. The pace of a shape should spread such bursts (move a step a few bars later, or merge two edits of the same line) before the typing has to speed up. Labor limae, after the main work.

- **Opening name "slow" next to pace "slow".** Recommended: keep the owner's names ("slow" / "Lenta") and show opening and pace as separate labelled groups in Compose, so the two never sit in one list.
- **Should the director write `growthShape` into generated songs?** Recommended: no for now; the shape is resolved at play time from the song id and style, so the endless fixtures and `DIRECTOR_VERSION` do not move in this change.
- **Default weights.** Recommended: the values in D1, adjusted after the owner's listening test (one exported song per opening, first two minutes).
