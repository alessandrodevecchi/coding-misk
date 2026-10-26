## Purpose

The names of the two voices in the interface: one scheme with the keyword "Voce" ("Voice") on every label, so the narrator and the voice instrument are told apart everywhere and a later live voice fits the same scheme.

## ADDED Requirements

### Requirement: Voice labels
Every label that names one of the two voices (titles, subtitles, switches, track types, knobs, curves, console groups and buttons, Library blocks, Guide titles) SHALL use "Voce: narratore" / "Voice: narrator" for the narrator (track type `voice`) and "Voce: traccia" / "Voice: track" for the voice instrument (track type `spoken`). Inside sentences the texts SHALL say "voce narratore" / "narrator voice" and "voce traccia" / "voice track"; "il narratore" / "the narrator" SHALL stay where the narrator is the one who speaks. The on/off switch in the title row of each voice block SHALL read "Accesa" / "On" or "Spenta" / "Off", and its tooltip SHALL name the voice ("Accendi o spegni Voce: narratore"). Labels SHALL keep the full form in narrow places (knob, curve, console). Every label SHALL come from the interface strings, in both languages.

#### Scenario: Compose Voices group
- **WHEN** the owner opens the Compose Voices group in Italian
- **THEN** the subtitles read "Voce: narratore" and "Voce: traccia", each with its switch reading "Accesa", and the add button reads "Aggiungi Voce: traccia"

#### Scenario: Track types
- **WHEN** the owner adds a track in English
- **THEN** the type list shows "Voice: narrator" and "Voice: track"

#### Scenario: Radio and console
- **WHEN** the owner opens the radio in Italian
- **THEN** the narrator knob, its curve and the console group read "Voce: narratore", and the console row of the voice instrument reads "Voce: traccia"

### Requirement: Guide card for the voices
The Guide card that presents the voices side by side SHALL be titled "Due voci" / "Two voices" and SHALL describe Voce: narratore (with its poetic style as a style of the same voice) and Voce: traccia, the sound controls, the voice styles, the phrase list, Where, and the console's Aggiungi frase. The voice instrument card SHALL be titled "Voce: traccia" / "Voice: track".

#### Scenario: Guide
- **WHEN** the owner opens the Guide in Italian
- **THEN** a card titled "Due voci" explains both voices, and no text calls the voice instrument "voce strumento"

### Requirement: Fixed track names
The fixed name of the narrator track that the director and new narrator tracks write SHALL be "Narrator" (it was "Voice"); the voice instrument track keeps "Words". Built-in songs whose narrator track is named "Voice" SHALL be renamed to "Narrator" with no change to their sound.

#### Scenario: New radio song
- **WHEN** the radio plays a generated song
- **THEN** its code shows the narrator block named Narrator

### Requirement: Room for a live voice
The label scheme SHALL leave room for a later third voice named "Voce: live" / "Voice: live"; this change SHALL NOT add it.

#### Scenario: No live voice yet
- **WHEN** the owner looks through Compose, the radio and the Guide
- **THEN** no "Voce: live" label appears
