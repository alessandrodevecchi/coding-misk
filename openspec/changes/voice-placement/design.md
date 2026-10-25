## Context

voice-controls (#77) added the narrator style, Narrated growth in a Voices group of the live build panel (shown only with the Live build on), voice instrument options for the radio (`#radio-voice`) and for a new song by an artist (a `<details>` menu in the Compose toolbar, `coding-misk-artist-voice`). The narrator controls of the radio sit in the Custom section. The director draws several phrases with `morePhrases` and places them with `spokenParts`; the spoken track of a song in Compose has no options.

## Decisions

### D1. Compose: one Voices group, always shown
The group stays in the live build panel (`#live-voices`) but is no longer `data-live-only`: it shows with the Live build off too, under the Code title. It holds two rows: Narrator (Narrator voice, Narrator style, Narrated growth) and Voice instrument · new song by an artist (the voice-controls panel in `song` mode). The toolbar menu `#tr-artist-voice` goes. When the song has a voice instrument track, a link "Edit this song's voice instrument" selects it.

### D2. Disabled, not hidden
Narrator controls that cannot apply are disabled with a tooltip that says why: Live build off ("Turn on the Live build: the narrator speaks the steps of a song that builds live"), Narrated growth outside Crescendo ("Only with the Crescendo build style"), narrator off (as before). Hiding them would make the group change shape with every toggle and leave the owner wondering where the control went; a disabled control with its reason teaches what it needs. Narrated growth was hidden outside Crescendo; it is now disabled instead.

### D3. The voice instrument of the song being edited
The panel of a spoken track shows, above the line editor, the voice instrument controls in a `track` mode: preset, phrases per song, phrases, ways, no presence (the track exists: to have none, remove the track), and a "New phrases" button. A change rewrites the track (`rewriteSpoken`, `src/endless/voice-track.js`, pure):
- lines: drawn like the director (`morePhrases`), from the song's style recipes (their lines, ways and vocabulary group), else every way and a vocabulary group; texts written out, so a rewrite does not depend on the seed of the song;
- places: one clip per phrase, each on a quiet section (the quiet rule of `placeSpoken`: at most half the tracks of the fullest section, or a quiet name), never two in one section, spread over the song; a single refrain covers the whole song, as the director writes it; with no quiet section, the section with the fewest tracks; the count is a ceiling;
- an opening line is bound (`before`) to the first track that comes in within its clip;
- settings, speaker and rack are kept; the track's live build `add` step moves to the first clip when it came later;
- the options are kept on the track as `voiceOptions: { phrases, kind, ways, draw }`; `draw` counts New phrases. The same options and draw give the same lines.
A track without `voiceOptions` shows options read from its clips (how many, how many different lines), so a generated song opens on what it has. A toast reports the phrases placed, with Undo.

### D4. Radio: one Voices group
`#radio-voices` holds the narrator row and the voice instrument block (`#radio-voice`, unchanged inside). The narrator row uses the Custom profile's controls (`data-custom`, `data-custom-chip`), so the Custom section loses its own Voices row. With another profile the row shows that profile's values, disabled, with a tooltip: "The narrator settings belong to the Custom profile: pick Custom in Profile to change them".

### D5. The song on air does not change
Changing the voice instrument or the narrator of the song on air is not offered. The song on air was written by the director when it was prepared and its code is being typed; its recipe drives Replay and saved sessions, so a change would make a Replay sound different from what was heard. The hint says so and points to Skip (hear the change now) and Open in Compose (change this song's voice instrument there, D3).

### D6. Stored values
`coding-misk-artist-voice` keeps its key and shape; the group reads it as before. The radio's `voice` and `custom` options are unchanged. No migration.

## Risks / Trade-offs

- A rewrite replaces lines written by hand in that track: Undo in the toast restores the track as it was.
- Sections with long bars give long clips: a chop speaks every bar of its section, as in the director.
