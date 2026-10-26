## Purpose

The voices in the radio: the Voices group as the settings for the next songs, the console Voice group that changes the song on air, and lines the owner types and sends live.

## ADDED Requirements

### Requirement: Radio Voices group for the next songs
The radio Voices group SHALL hold the settings for the next songs only, in two blocks. "Voce: narratore": the title row with its on/off switch, the main row with the narrator knob (with its die), Narrator style and Narrated growth, then a folded Sound part. "Voce: traccia": the title row with its on/off switch, the main row with How often and Preset, then a folded Phrases part (Phrases per song, Kind of phrases, Ways, Where, and "Riempi con": the vocabulary the next songs draw from, "come lo stile" by default) and a folded Sound part. Folded parts SHALL be closed by default and SHALL remember whether the owner opened them. The group SHALL have no button that changes the song on air and SHALL say in one short line that the song on air changes from the console. The narrator's style and Narrated growth SHALL keep the voice-placement rule: enabled with the Custom profile, otherwise disabled with the reason; the knob and the Sound parts SHALL work with every profile.

#### Scenario: Layout
- **WHEN** the owner opens the radio
- **THEN** the Voices group shows two titled blocks, each with one main row, the folded parts closed, and one hint line

#### Scenario: No on-air button
- **WHEN** a song is on air and the owner changes the voice instrument preset in the Voices group
- **THEN** the song on air does not change, no command is queued, and the toast says it applies from the next song

#### Scenario: Narrator sound for the next songs
- **WHEN** the owner picks the Distant style for the narrator in the Voices group
- **THEN** the next songs' narrator speaks with the Distant settings and the speaker each song draws, and "As the style" brings back the drawn sound

### Requirement: A voice track chance in every style
Every style recipe SHALL say how likely a song of that style is to have a voice track; a style MAY say 0. The draw SHALL never change the music of a song. Styles with no lines of their own SHALL use vocabulary lines and any speaker that is not the narrator's.

#### Scenario: A style that had none
- **WHEN** the radio plays many songs of a style with a weight of 0.1 and How often is Come dice lo stile
- **THEN** about one song in ten has a voice track, and the music of every song is the same as without the voice track

#### Scenario: Zero
- **WHEN** a style has weight 0 and How often is Spesso
- **THEN** its songs have no voice track

### Requirement: How often: Sempre
The radio How often SHALL offer Mai, Come dice lo stile, Spesso and Sempre. Sempre SHALL give every next song a voice track, whatever the style's weight, the complexity, the profile or the artist. A phrase preset SHALL change How often only when it is Come dice lo stile or Spesso. Sempre SHALL apply to the voice track only; the narrator's amount SHALL stay the narrator knob.

#### Scenario: Sempre with a style at zero
- **WHEN** How often is Sempre and the next song's style has weight 0
- **THEN** the song has a voice track with vocabulary lines

#### Scenario: Preset keeps Sempre
- **WHEN** How often is Sempre and the owner picks the Discreto preset
- **THEN** How often stays Sempre

#### Scenario: Saved Sempre
- **WHEN** the owner reloads the radio after choosing Sempre
- **THEN** How often shows Sempre

### Requirement: Console Voice group
The console SHALL have a Voice group with two rows. "Voce: narratore": Talk more and Talk less, as today. "Voce: traccia": a phrase preset picker, a voice style picker and an Apply button that sends both to the song on air as one console command, queued, recorded in the session and rebuilt by Replay: the phrases from the next quiet part (as the voice command of voice-placement), the sound from the next phrase. Every control of the group SHALL follow the console scope switch: with "This song only" (the default) it changes the song on air only; with "The whole session" it also writes the same values into the radio Voices group for the next songs, which shows them at once. When the song on air has no voice instrument, Apply SHALL be disabled with the reason, except that with the whole session it still updates the Voices group.

#### Scenario: This song only
- **WHEN** the scope is This song only and the owner picks Present and Radio and presses Apply
- **THEN** the song on air speaks more phrases from its next quiet part with the Radio sound from the next phrase, the queue shows the command, and the Voices group is unchanged

#### Scenario: The whole session
- **WHEN** the scope is The whole session and the owner presses Apply with Present and Radio
- **THEN** the song on air changes as above and the Voices group shows Present and Radio for the next songs

#### Scenario: Replay
- **WHEN** the owner replays a session in which Apply was pressed
- **THEN** the song changes at the same bars

### Requirement: Add a line live
The console Voice: traccia row SHALL have an "Aggiungi frase" field and two buttons: Say now, and At the right moment. A line SHALL have at most 12 words. Say now SHALL say it on the first bar after its sample is ready; At the right moment SHALL place it on the next part of the kinds the voice instrument's Where allows (quiet first), from the next phrase, never over another line. The line SHALL use the voice instrument of the song on air (its speaker and sound), or, without one, a speaker that is not the narrator's with the Clear sound. The narrator SHALL yield on the bars of the line. The line SHALL be shown on stage, queued in the console with Cancel until it sounds, and recorded in the session with the bar where it sounded, so Replay says it there. The scope switch SHALL NOT apply: a typed line belongs to the song on air.

#### Scenario: Say now
- **WHEN** the owner types "stay with me" and presses Say now during bar 30
- **THEN** the line sounds on the first bar after its sample is ready (for example bar 31 or 32), is shown on stage, and the session records that bar

#### Scenario: At the right moment
- **WHEN** the owner presses At the right moment with quiet parts only and the next quiet part starts at bar 57
- **THEN** the queue shows the line at bar 57 with Cancel, and the line sounds there

#### Scenario: No part left
- **WHEN** no part of the allowed kinds is left in the song on air
- **THEN** the console says why and offers Say now

#### Scenario: No helper
- **WHEN** the voice helper is not available
- **THEN** the field and the buttons are disabled with a tooltip that says a typed line needs the local voice helper of the dev server

### Requirement: Stored radio options
Radio options and saved sessions from before this change SHALL be read as before: no narrator or voice instrument sound saved means "As the style", no Where saved means quiet only.

#### Scenario: Old options
- **WHEN** the browser holds radio options saved before this change
- **THEN** the Voices group shows them, with As the style for both sounds and quiet parts only, both voice switches on, and the vocabulary as the style says
