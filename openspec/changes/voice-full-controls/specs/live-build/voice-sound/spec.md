## Purpose

The sound of the two voices, the narrator and the voice instrument: which controls they have, where they appear, the single value every place reads and writes, and the voice styles shared by both voices.

## ADDED Requirements

### Requirement: Sound controls for both voices
The narrator and the voice instrument SHALL each have the same nine sound controls: speaker, volume, pitch, tempo, filter (cutoff), low cut, drive, reverb and delay, plus a voice style. Compose SHALL show them in the Voices group, under each voice's block, in a folded part named Sound that is closed by default; the track panel of a narrator or voice instrument track SHALL keep showing them. The radio Voices group SHALL show them for the next songs in the same folded form.

#### Scenario: Folded by default
- **WHEN** the owner opens Compose or the radio
- **THEN** each voice block of the Voices group shows its main row and a closed Sound part, and opening Sound shows the voice style and the nine controls

#### Scenario: Ranges
- **WHEN** the owner moves a sound control in the Voices group
- **THEN** its range and step are the same as the same control in the track panel

### Requirement: One value per control
In Compose, every place that shows a sound control of a voice (the Voices group, the track panel, a voice style picker) SHALL read and write the same value: the settings of that voice's track in the open song. A change in one place SHALL show in every other place at once, without a reload, and no place SHALL keep a copy of its own. Undo of a song edit SHALL restore the value in every place.

#### Scenario: Group to panel
- **WHEN** the owner sets the narrator's pitch to 0.8 in the Voices group while the narrator track panel is open
- **THEN** the panel shows 0.8 at once, and the next spoken line uses 0.8

#### Scenario: Panel to group
- **WHEN** the owner picks the speaker Reed in the voice instrument track panel
- **THEN** the Voice: track block of the Voices group shows Reed at once

#### Scenario: Style picker follows hand edits
- **WHEN** the owner picks the Radio style and then moves the reverb by hand in the track panel
- **THEN** the style shows Custom in the Voices group and in the panel

### Requirement: Song without a narrator track
When the open song has no narrator track, the Voices group SHALL show the sound the narrator uses today (the default narrator sound) and SHALL allow editing it. The first edit SHALL add a narrator track named Narrator to the song, holding the edited settings, with Undo; the song SHALL sound the same as before that edit except for the edited value. With several narrator tracks, the group SHALL edit the one that speaks steps without their own narrator, and SHALL say which track it edits.

#### Scenario: First edit adds the track
- **WHEN** the owner opens a song with no narrator track and sets the narrator voice style to Deep
- **THEN** the song has a Narrator track with the Deep settings, the timeline shows it, the toast offers Undo, and the narrator speaks with the Deep sound

#### Scenario: Looking does not change the song
- **WHEN** the owner opens and closes the Sound part of the narrator without changing anything
- **THEN** the song has no new track and is not marked as changed

### Requirement: Disabled with the reason
A narrator sound control SHALL be disabled, with a tooltip that says why, when the narrator cannot be heard in the open song: the Live build is off, or the narrator is off. Voice instrument sound controls SHALL be disabled with the reason when the song has no voice instrument, next to Add Voice: track.

#### Scenario: Live build off
- **WHEN** the Live build is off
- **THEN** the narrator sound controls show their values, disabled, with the tooltip saying the narrator speaks only in a song that builds itself

### Requirement: Voice styles
The app SHALL offer one list of voice styles for both voices: Clear, Radio, Distant, Robot, Deep, Bright, Cathedral, Echo, Dirty and Slow. A voice style SHALL set pitch, tempo, filter, low cut, drive, reverb and delay together, within the voice limits, and SHALL NOT change the speaker or the volume. The style picker SHALL show the style whose values match the current settings, else Custom. In the radio the picker SHALL also offer "As the style" for the next songs: each song draws its voice as today.

#### Scenario: Style keeps speaker and volume
- **WHEN** the voice instrument speaks with Shelley at volume 0.5 and the owner picks Robot
- **THEN** it still speaks with Shelley at 0.5, with the Robot pitch, drive, low cut and delay

#### Scenario: Same list everywhere
- **WHEN** the owner opens the style picker in the Compose Voices group, in the radio Voices group and in the console
- **THEN** the three pickers list the same styles with the same names

### Requirement: Default sound unchanged
Songs, saved sessions and radio sessions SHALL sound as before until the owner changes a voice's sound. The radio default for both voices SHALL be "As the style".

#### Scenario: Saved session
- **WHEN** the owner replays a radio session saved before this change
- **THEN** both voices sound as they did
