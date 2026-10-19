## Context

What exists on 2026-10-19 (read from the code, not edited):

- **Director.** `createSession(...).next(options)` plans one song (`makeSong`): a plan, a written song with its own build steps (energy moves per phrase) and a session entry. It copies the drums style's `profile` and `buildStyle` into the song (the four `live-coder` family styles declare `profile: "switch"`). `DIRECTOR_VERSION` is 5. The seed fixtures in `tests/snapshots/endless.json` use no `live-coder` style.
- **Radio.** Each stream item holds `{ song, entry, plan, base, commands }`. The player plays a window song (`windowSong` in `src/endless/join.js`: the song on air and the next one, tracks renamed `s<n>-…`) through `playable()` in `src/main.js`. The window song carries no `profile`, so `liveOf` falls back to the Compose pick; the radio sounds in blocks because the director writes its own steps. Recipes hold `seed`, `options`, `changes` (options per song), `steering` (commands with their song) and `lead` (song 0). `rebuild(recipe, count, until)` replays without audio for exports and playlists.
- **Steering.** `steerSong` rebuilds a song from its plan plus every standing command, with streams `steer:<n>:<i>`. Vary and Swap seed `vary:<song>:<index>` and `swap:<song>:<index>`.
- **Compilation.** Segments drawn from streams `compilation/<i>` and `compilation-length/<i>`; each is an artist, a random artist or styles with knobs. `compilationOptions` passes `transition`, `harmony`, `material`, `sounds` through.
- **Artists.** `artistSongOptions` draws everything from `rng.artist`, in a fixed order. Adding a draw there would shift every later draw.
- **Growth.** `crescendoSong(song, { seed, rules })` drops the song's own build and grows toward its reference section; with `rules.coder` and `rules.shape` it resolves a growth shape (`resolveShape`, stream `shape-<SHAPES_VERSION>`, `SHAPES_VERSION` 3), tries fallback shapes when typing would rush, and with free duration adds bars until the typing fits (measured at 80 columns). `pasteRule` forbids forced pastes with free duration and limits them with fitted duration. `coderPath` takes a replaceable `chooser`.
- **Code.** `liveCode(build, C)` writes each step with the profile's comment and function options; with `fnLevel` the hidden mixer tail (`miskMix`) gives lines their bus, level and section lanes. Song functions get themed names from the song id.

## Goals / Non-Goals

**Goals:**
- One precedence model, written once, used by the director, the radio, playlists and exports.
- "Only Live coder" (or any profile) as one session choice that always works, with any artist, compilation or style.
- Classic sessions and recipes saved before this change sound exactly as before.
- Growth, typing and code views on air reuse the Compose engines; nothing typed ever changes the sound.
- Stages that each end with passing checks.

**Non-Goals:**
- Changing Compose behaviour, Classic or Crescendo fixtures, or the director's written songs.
- Metamorphosis on air in the first version (D6).
- A decision model behind the chooser (the interface stays open, D10).
- Saved library songs drawn into a compilation (Open questions).
- Sung vocals or new voices.

## Decisions

### D1. Profile of a generated song

Per song `n`, the first rule that gives a value wins:

| Order | Source | Gives |
| --- | --- | --- |
| 1 | Session Profile control (`profile` option) set to one profile | that profile |
| 2 | Compilation setup `profiles` (when a compilation plays) | a weighted draw among the allowed profiles |
| 3 | Artist on air `profiles` (chosen, drawn by the compilation, or random) | a weighted draw |
| 4 | The song's styles: the drums style's declared `profile` (today the `live-coder` family) | that profile |
| 5 | Default | Classic |

Draws use the stream `profile/<n>` of the session seed, separate from every other stream. The result goes into `entry.profile`, written only when it is not Classic, so Classic sessions keep byte-identical entries and the seed fixtures do not move. If they move anyway, `DIRECTOR_VERSION` goes up in the same commit (`AGENTS.md`). `song.profile` keeps the style's declaration as today; the radio reads `entry.profile`. "Open in Compose" and "Save" write the profile the song played with into the saved song.

### D2. Profile of a saved song in a stream

Saved songs enter streams as song 0 (Continue in radio), as frozen sessions, in the playlist Mix, and as replayed recipes.

| Order | Source |
| --- | --- |
| 1 | The song's own profile (`songProfile`: `profile`, else `buildStyle`) |
| 2 | The radio session's forced profile (D1 rule 1), for the radio only |
| 3 | The player default: the Live build switch and the Compose profile, as when the song plays alone |

Song 0 from Compose keeps the profile and overrides it was playing with, so the handover changes nothing on screen. A frozen song stores its grown build as heard (D11) and is never grown again. The playlist Mix applies the same table without rule 2.

### D3. Session Profile control: override, not a filter

The radio gets an option `profile`: `artist` (default, "as the artist and style like it") or one of `classic`, `crescendo`, `switch`. It sits next to Transitions and Harmony, which already work as "artist or one value". It applies from the next song prepared and is recorded in the recipe's `changes`, like styles and knobs. Settings → Radio keeps the default for new sessions.

Two ways to make a session "only Live coder" were weighed:

| | A. Session choice overrides weights | B. Only matching artists are picked |
| --- | --- | --- |
| Chosen artist | plays its styles, knobs and transitions, grown as Live coder | must have a Live coder weight, else the choice is refused or the artist is dropped |
| Compilation artists | all stay in the pool | pool shrinks to artists with that weight; today no built-in artist has one, so only styles and random artists remain |
| Random artists | made as usual, profile forced | must be made with that weight (a second rule in the maker) |
| Styles and genres mode | forced on every song | nothing to filter except styles that declare it: four styles, one genre family |
| Curves and console | unchanged | unchanged |
| Predictability | always does what it says | can leave nothing to play, or change the music to satisfy the filter |

Recommended and specified: **A**. The profile is how a song builds and shows its code, not its taste; the artist keeps its musical character. B's useful part, artists that prefer the Live coder, stays available through rule 3 when the control is `artist`.

### D4. Artist and compilation fields

- Artist `profiles`: `{ classic, crescendo, switch }` weights, optional. Missing means "no opinion" (fall to rule 4), so existing artists keep Classic for every non-`live-coder` style and the built-in sessions do not move.
- Artist `growth`: `{ duration: 'fitted' | 'free', openings, paces, developments }`, all optional; shape weights use the ids of `growthShapes` in style recipes.
- Random artists: the maker draws `profiles` (and sometimes `growth`) from a new stream `artist-profile`, so every field it made before stays the same for the same seed.
- A new built-in artist made for the Live coder: the four `live-coder` family styles, `profiles: { switch: 1 }`, its own `growth` weights. Invented name and bio.
- Compilation setup `profiles`: `null` (as artists and styles say) or weights over allowed profiles. A new built-in preset "Live coder" (all genres, `profiles: { switch: 1 }`). Saved setups without the field keep `null`.

### D5. Growth of a radio song

A radio song with a profile other than Classic grows from the director's song, in a new pure module `src/endless/growth.js`:

1. **Written form.** The director's song with its own steps is turned into a song whose sections follow the plan's double phrases and whose clips follow `stateAt` at each boundary. Its sound in blocks equals the director's song (checked event by event).
2. **Growth.** `crescendoSong` grows the written form with the profile's rules: small steps for Crescendo, natural for Live coder with its growth shape. The rise ends at the reference section; later sections change in place (section lanes in the hidden mixer), as a Live coder song does in Compose today.
3. **Seeds.** The growth seed is the song id (`endless-<seed>-<n>`), so the same session grows the same songs.

Alternative rejected: using the director's phrase states as the waypoints of `coderPath` directly. It fits the energy plan better but needs a new waypoint mode before anything plays; it is kept for steering (D9), where the destination is given.

### D6. Shapes and duration on air

- **Shape parts**: the song's `growthShape`, then the artist's `growth` weights, then the style's `growthShapes`, then the default weights; impossible values are removed before any draw (`canPlay`), and the "typing never rushes" fallback applies as in Compose. There are no Compose controls in the radio.
- **Duration**: fitted by default in the radio, so the plan, the transitions and the length ranges of exports stay exact; pastes follow `pasteRule` (none in the first two minutes, at most one line a minute). An artist's `growth.duration: free` makes the song wait for its typing: the song gets longer and the next song's start moves, as Extend already does.
- **Openings and transitions**: after `mix`, `morph`, `echo` and `break` the first waypoint plays hidden during the overlap (D7). The `typed` opening only follows `cut` or `interlude`, where nothing else plays. The `voice` opening needs the spoken opening line the director already writes for some songs.
- **Metamorphosis** is left out on air (weight 0): it changes tempo and key at the end of the song, while the next song is planned from the last section's tempo and key.

### D7. Shown and evaluated code

- The panel shows only the song on air, written with its own profile's controls (`liveCode` per song, not per window).
- The evaluated code is the shown code plus a hidden tail: the hidden mixer, then the incoming song and the tail of the outgoing song in full technical form (no song functions, no lanes), on orbits of their own, separate from the song on air and from the voice instrument's 13 and 14.
- When the incoming song goes on air, its code appears whole at that bar, already in its own view; its growth goes on with small moves. The outgoing tail stays hidden until it ends.
- Option `radio-incoming`: `hidden` or `visible`. Default per incoming song: `visible` for Classic (today's window, both songs in the panel), `hidden` for Crescendo and Live coder.
- Lit notes and line breaks apply to the shown code only. Hand coding on air keeps today's behaviour; the hidden tail stays.

### D8. Code views and functions on air

Everything the profile sets works on the song on air: code of the moment with lanes in the hidden mixer, compact code, comments (Live coder: essential comments, voice code hidden, the narrator still speaks), short, mixer and compact technical functions, library functions, song functions, lit notes, line breaks, human typing with mistakes (seeded by the song id), and the typing speed. Song functions of the song on air never clash with the hidden songs, which use the full form. The sound never depends on these controls or on the panel width: the growth is measured at 80 columns, as in Compose.

### D9. Commands on a grown song

- **Past kept.** A command rewrites the song from its boundary with `steerSong` as today. On a grown song the steps before the boundary stay; from the boundary a new growth runs from `stateAt(grown, bar)` to the steered written song's state, with small moves, through `coderPath` with a given start and destination.
- **Boundary.** A command applies at the first boundary that leaves time to type its edit at a person's pace (the next phrase, or the one after); the queue shows that bar. With fitted duration and no boundary left, the edit may be pasted per `pasteRule`, else the command is disabled with `late`.
- **Waypoints.** Energy up and down, darker, brighter, dirtier, cleaner, more space, add, remove, more or less complex, a curve point and Extend each give the next waypoint. End leads to the ending as the last waypoint: lines muted or commented one at a time, not a cut.
- **Vary and Swap** (`radio-variation` 5.1): the new idea is reached by small `notes` edits of the line, ending on the new idea at the boundary. A Swap whose line differs a lot is typed as a new line or pasted per `pasteRule`.
- **Mixer commands**: mute and unmute type the `_` of `_$:`; a volume appears as `.gain()` on the line (mixer functions); lock changes no code.
- **Classic songs** keep today's one-step rewrites.

### D10. Chooser

The order of moves between waypoints comes from a chooser with `coderPath`'s interface `(lanes, ctx, rng)`. On air it is the default chooser plus two biases: listener moves first, and lanes that reach the energy and curve targets of the coming double phrase sooner. A later decision model can replace it with the same arguments.

### D11. Replay and versions

- The recipe stores the `profile` option and its changes. A recipe without the field (saved before this change) replays with `profile: classic` for every song, so it sounds as heard and needs no warning.
- A song's profile, shape and growth are pure functions of the session seed, the song index, the options and the commands; commands keep their bar.
- A session item in a playlist records `version` (`DIRECTOR_VERSION`) and, when it holds a grown song, `shapes` (`SHAPES_VERSION`) and `growth` (`CRESCENDO_VERSION`). It warns when any recorded value differs from the app's; a frozen item never warns.
- Freeze stores each song with its grown build and a mark that it is grown, so it is not grown again.
- `DIRECTOR_VERSION` goes up only if the endless fixtures move; `SHAPES_VERSION` only if the Live coder fixtures move (`AGENTS.md`). New radio fixtures (`tests/snapshots/radio-growth.json`) hash grown songs of a few seeds; they move only on purpose.

### D12. Exports

- Fast export, radio ranges (`rebuild`) and saved sessions build the same items as the radio: profile, growth, steering.
- The render page evaluates the shown code plus the hidden tail; the timeline stores the shown code per step.
- Session video and fast video show only the song on air, typed with the video's column width; typing never changes the sound.
- Fragments pick their start after a song's silent lead-in, as for Compose builds.
- Speed is measured on a one-hour session with Live coder songs.

### D13. Console

- The Profile control (as the artist, Classic, Crescendo, Live coder) next to Transitions and Harmony, with help text in English and Italian.
- The now playing card shows the song's profile and, for a Live coder song, its shape ("Live coder · full kick · fast · masks").
- The queue labels stay; a command on a grown song shows the bar where it applies after D9.
- The material source keeps its place next to complexity; it changes the written song from the next song, never the profile.

### D14. Knowledge base and docs

Notes to update in the same change (`AGENTS.md`): `radio.md` (option `profile`, `radio-incoming`, growth on air), `radio-commands.md` (commands as waypoints, Vary and Swap typed), `profiles.md` (profile in the radio, precedence), `artists.md` (`profiles`, `growth`, the new artist), `growth-shapes.md` (who chooses on air, metamorphosis off), `live-build.md` (growth of a director song), `comments-and-functions.md` (hidden tail with incoming code), `export.md` (hidden code in renders), `library.md` (playlist versions), `settings.md` (Profile default), `decisions.md` (override over filter, fitted on air, hidden incoming, old recipes replay Classic), and `recipes-build.md` "Change the director safely". Then `npm run knowledge` and `npm run check:knowledge`. Also `docs/ENDLESS.md`, `docs/ARTISTS.md`, the Guide card of the Radio, `DEVLOG.md`.

## Risks / Trade-offs

- **[Grown songs are longer or sparser at the start]** → fitted duration in the radio by default; the growth ends at the reference section, the rest follows the plan.
- **[The incoming song appears whole]** → accepted, like a DJ with the next record ready; its growth goes on with small moves. The visible option keeps today's look.
- **[Commands feel slower on grown songs]** → the queue shows the real bar; a command never rushes the typing.
- **[Two engines (director steps and growth) disagree]** → the written form is checked event by event against the director's song before any growth.
- **[Profile draws move old sessions]** → separate stream, `entry.profile` only when not Classic, old recipes replay Classic.
- **[Orbits run out with two songs plus voices]** → the hidden songs get their own orbit range; the check counts orbits in use per window.
- **[Export speed with many steps]** → measured on one hour; steps in one render block are joined if needed.

## Open questions

1. **Does a forced session profile also override saved songs that declare one?** Recommended: no. A declared profile is part of the song as written; the console shows it. An option "force on saved songs too" can come later.
2. **Session control or artist weights for "only Live coder"?** Recommended: the session control overrides (D3, option A). Artists that prefer a profile still matter when the control is "as the artist".
3. **Growth duration in the radio.** Recommended: fitted by default, free only as an artist trait. Free keeps the Compose feel but makes session lengths and export ranges unpredictable.
4. **Should the radio use the owner's Compose overrides for display controls (comments, functions, wrap, typing speed)?** Recommended: no; the radio uses the profile's defaults, so videos and exports look the same on every machine. A Settings → Radio choice can come later.
5. **Incoming song default by profile.** Recommended: hidden for Crescendo and Live coder, visible for Classic, decided by the incoming song's profile.
6. **Metamorphosis on air.** Recommended: off in this change; later only when the next song is planned from the second skin's tempo and key.
7. **Artist `growth` shape weights now or after the listening test?** Recommended: now, optional, because the new Live coder artist needs them; built-in artists get none.
8. **Saved library songs drawn into a compilation.** Recommended: not in this change. It needs a library filter and harmony rules for fixed songs; D2 already says how such a song would build.
9. **A "Live coder" compilation preset.** Recommended: yes, one built-in preset with `profiles: { switch: 1 }` and the Journey movement.
10. **Narrator style per artist (explain or poetic).** Recommended: not now; it stays with the style recipe, as `voice-instrument` decided.
