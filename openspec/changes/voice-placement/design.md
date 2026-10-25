## Context

voice-controls (#77) added the narrator style, Narrated growth in a Voices group of the live build panel (shown only with the Live build on), voice instrument options for the radio (`#radio-voice`) and for a new song by an artist (a `<details>` menu in the Compose toolbar, `coding-misk-artist-voice`). The narrator controls of the radio sit in the Custom section. The director draws several phrases with `morePhrases` and places them with `spokenParts`; the spoken track of a song in Compose has no options.

## Decisions

### D1. Compose: one Voices group, always shown
The group stays in the live build panel (`#live-voices`) but is no longer `data-live-only`: it shows with the Live build off too, under the Code title. Three rows:
- **Narrator**: Narrator voice, Narrator style, Narrated growth.
- **Voice instrument of the open song**: the same controls as the voice track panel (D3), drawn from the track, so the two stay in sync (each change re-renders both). A song without a voice instrument track offers "Add a voice instrument": a spoken track with one phrase, then the controls. A link opens the track's panel.
- **In the next song**: a small folded row with the settings for a new song by an artist (the voice-controls panel in `song` mode), until the New song panel (#78) takes them over.

The toolbar menu `#tr-artist-voice` goes.

### D2. Disabled, not hidden
Narrator controls that cannot apply are disabled with a tooltip that says why: Live build off ("Turn on the Live build: the narrator speaks the steps of a song that builds itself while it plays"), Narrated growth outside Crescendo ("Only with the crescendo build style"), narrator off (as before). Hiding them would make the group change shape with every toggle and leave the owner wondering where the control went; a disabled control with its reason teaches what it needs. Narrated growth was hidden outside Crescendo; it is now disabled instead.

### D3. The voice instrument of the song being edited
The panel of a spoken track shows, above the line editor, the voice instrument controls in a `track` mode: preset, phrases per song, phrases, ways, no presence (the track exists: to have none, remove the track), and "New phrases". A change rewrites the track (`rewriteSpoken`, `src/endless/voice-track.js`, pure):
- lines: drawn like the director (`morePhrases`), from the song's style recipes (their lines, ways and vocabulary group), else every way and a vocabulary group; texts written out;
- places: one clip per phrase on a quiet part, a phrase of 8 bars inside a quiet section (the quiet rule of `placeSpoken`: at most half the tracks of the fullest section, or a quiet name), never two in one part, spread over the song; a single refrain covers the whole song, as the director writes it; with no quiet section, the phrases of the section with the fewest tracks; the count is a ceiling;
- an opening line is bound (`before`) to the first track that comes in within its clip;
- settings, speaker and rack are kept; the track's live build `add` step moves to the first clip when it came later;
- the options are kept on the track as `voiceOptions: { phrases, kind, ways, draw }`; `draw` counts New phrases. The same options and draw give the same lines.

A track without `voiceOptions` shows options read from its clips (how many, how many different lines), so a generated song opens on what it has. A toast reports the phrases placed, with Undo.

### D4. Radio: one Voices group
`#radio-voices` holds the narrator row and the voice instrument block (`#radio-voice`). The narrator row uses the Custom profile's controls (`data-custom`, `data-custom-chip`), so the Custom section loses its own Voices row. With another profile the row shows that profile's values, disabled, with a tooltip: "The narrator settings belong to the Custom profile: pick Custom in Profile to change them" (with the artist's style profile: the narrator follows each song).

### D5. The song on air: a recorded steering command
A change of the voice instrument while the radio plays does two things: it is kept for the next songs (as before), and it becomes a steering command `{ kind: 'voice', at, voice: { phrases, kind, ways, presence } }` on the song on air, queued and recorded like Energy or Mute (`S.recipe.steering`, the console's queue, Cancel). `at` is the next phrase (`applyBar`); the change starts on the first quiet part from there (`nextQuiet`), so the lines heard so far stay: clips before that part are kept (cut at it), new phrases go to the quiet parts after it, with letters the kept clips do not use; "never" leaves only the kept clips. `steerSong` keeps the changes in the plan (`P.voiceAir`) and applies them again, in order, after every later rewrite (which writes the spoken track again from the plan), so Replay and saved sessions rebuild the same song. A song with no quiet part left says why (`steerWhy:no-quiet`) and the change applies from the next song only. A second voice change before the first applies replaces it, like a volume. The narrator of the song on air does not change: its comments are steps the director already wrote; the hint says so and points to Skip.

### D6. Stored values
`coding-misk-artist-voice` keeps its key and shape; the "In the next song" row reads it as before. The radio's `voice` and `custom` options are unchanged. No migration.

### D7. The radio Voice knob, curve and console group (analysis)
What they drive today:
- The **Voice** knob (`talk`, 0 to 1, with its die, next to Chaos, Energy and Complexity, in range with the artist) and the compilation's **Voice** range (`ranges.talk`, for example 0.3 to 0.9) set `opts.talk`. In `directSong` it is the chance that a phrase boundary gets a narrator comment (`say` on a build step, about `1.1 × talk`; 0: none; the start, big events and the end always speak). The **Voice** curve (`curves.voice`, per part) overrides it part by part; **Talk more / Talk less** in the console's **Voice** group move it by 0.2 from the next phrase; an artist's `talk` range and the `talks-a-lot` quirk set it too.
- So it drives the **narrator** (the `voice` track type, which speaks the `say` comments), not the voice instrument (`spoken` tracks, drawn by `spokenFor` with the style's weight and the voice options) and not a synth voice. With Narrator voice off the comments are still written (stage text, code comments) but not spoken; with `talk` 0 they are not written at all.
- It does not interact with the voice instrument presets or How often: two separate draws on separate streams. The narrator yields where a voice instrument line sounds.

Decision: the knob keeps its behaviour and its stored key (`talk`), and is renamed **Narrator** (Narratore): the knob, the compilation range, the curve, the console group and the artist trait, with tooltips that say it sets how often the narrator comments the changes and does not touch the voice instrument. It neither drives nor scales the voice instrument: How often already says how often a song gets one, and a knob that moved both would mix two voices the owner wants told apart. Whether the knob should move into the Voices group, and whether the voice instrument should get a knob, curve or console buttons of its own, stay open for the owner.

## Risks / Trade-offs

- A rewrite replaces lines written by hand in that track: Undo in the toast restores the track as it was.
- A later steering command that changes how many tracks play can move which parts are quiet; the voice change is applied again on the new song, so a few of its phrases may land elsewhere after that point (before it, nothing changes).
- A chop speaks every bar of its 8-bar part, as in the director.
