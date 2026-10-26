## Purpose

The New song panel of Compose: one place to choose how a new song is made, with the radio's own controls and values, and the song it opens.

## ADDED Requirements

### Requirement: New song opens a panel
The "Nuovo brano" button in the Compose title row SHALL open and close an inline panel under the title row and SHALL show whether it is open. The panel SHALL close with its close button or Esc. The title row SHALL NOT keep a separate "New song from artist" select. The panel's open state SHALL be remembered on reload.

#### Scenario: Open and close
- **WHEN** the owner presses Nuovo brano
- **THEN** the panel opens under the title row with the quick row and five closed sections, and the button reads as expanded
- **WHEN** the owner presses Esc
- **THEN** the panel closes and the open song is unchanged

### Requirement: Quick row
The panel SHALL start with a quick row holding Artista (Personalizzato, the usable artists, a drawn random artist, and its die), Preset, Seme (empty means random), Genera and Brano vuoto. Picking an artist or a preset and pressing Genera SHALL be enough to make a song. Brano vuoto SHALL make the empty song Nuovo brano made before this change. Genera and Brano vuoto SHALL ask to press twice when the open song has unsaved changes.

#### Scenario: Artist and generate
- **WHEN** the owner picks an artist and presses Genera
- **THEN** a new song by that artist opens unsaved in Compose and the toast names the artist

#### Scenario: Empty song
- **WHEN** the owner presses Brano vuoto
- **THEN** an empty song with one drum track opens, as before this change

#### Scenario: Seed
- **WHEN** the owner types a seed and presses Genera twice with the same values
- **THEN** both songs are the same; with the seed empty, the two songs differ and the field shows each seed used

### Requirement: Sections
Below the quick row the panel SHALL have five sections: Stile e genere, Profilo e crescita, Voci, Materiale, Durata. Each SHALL be closed by default, show a one-line summary of its values when closed, and remember whether the owner opened it. Voci SHALL hold the "Voce: narratore" and "Voce: traccia" blocks with their on/off switches. Durata SHALL offer Come lo stile, Breve, Media, Lunga and Esatta with minutes.

#### Scenario: Summary when closed
- **WHEN** the owner sets chaos to 0.7 and closes Stile e genere
- **THEN** the section's summary line shows the styles and chaos 0.7

#### Scenario: Genre chips
- **WHEN** the owner presses a genre chip
- **THEN** the styles of that genre are selected in the style chips

#### Scenario: Generator needs a growing build
- **WHEN** the build is in blocks
- **THEN** the Generator select is disabled and its tooltip says why

### Requirement: Same values and controls as the radio
The panel and the radio SHALL read and write one set of values for how a song is made: styles, knobs, artist, sounds seed, profile, Custom controls, material and both voices. A control shown in both places SHALL be drawn and handled by the same code. A change in either place SHALL show in the other the next time it is shown, and SHALL be kept on reload. The panel SHALL say in one line that these are also the radio's settings for its next songs.

#### Scenario: Panel to radio
- **WHEN** the owner sets energy to 0.9 and switches "Voce: traccia" off in the panel, then opens the radio
- **THEN** the radio shows energy 0.9 and "Voce: traccia" off

#### Scenario: Radio to panel
- **WHEN** the owner picks the Live coder profile in the radio, then opens the panel
- **THEN** Profilo e crescita shows Live coder

#### Scenario: Radio on air
- **WHEN** a radio song is on air and the owner changes a value in the panel
- **THEN** the song on air does not change, and the radio's next songs use the new value

### Requirement: Growth shape with any profile
The opening, pace and development controls SHALL always be shown in Profilo e crescita. Changing one while Profile is Classic, Crescendo, Live coder or as the artist and style say SHALL switch Profile to Custom based on that profile (Live coder for the artist and style choice) with the new value.

#### Scenario: Shape with Live coder
- **WHEN** Profile is Live coder and the owner picks a pace
- **THEN** Profile becomes Custom based on Live coder with that pace, and the radio shows the same

### Requirement: Presets
The Preset select SHALL offer the built-in presets and the owner's presets. Picking a preset SHALL set the values it holds and leave the others as they are. The owner SHALL be able to save the current values as a named preset and delete the owner's presets; built-in presets SHALL NOT be deletable. The select SHALL show the last preset picked until a value changes, then Personalizzato. The owner's presets SHALL be part of the backup.

#### Scenario: Pick and change
- **WHEN** the owner picks Groove breve, then moves chaos
- **THEN** the values of Groove breve are set, and after the move the select shows Personalizzato

#### Scenario: Save
- **WHEN** the owner saves the current values as "Notte" and reloads
- **THEN** "Notte" is in the Preset select and picking it sets the saved values

### Requirement: The generated song
Genera SHALL write the song with the same director call and options as a radio song, plus the chosen length. The song SHALL open unsaved in Compose with the chosen profile, and with Custom its controls, as its own configuration, so it plays as chosen with no trial mark and Save keeps that configuration. With "Voce: traccia" off the song SHALL have no voice track; with "Voce: narratore" off its narrator SHALL be off. The panel SHALL stay open after Genera.

#### Scenario: Custom profile
- **WHEN** Profile is Custom based on Live coder with opening "one sound" and the owner presses Genera
- **THEN** the song opens with the Live build on, Live coder controls, that opening, and no "configuration changed" mark

#### Scenario: Composed material
- **WHEN** Materiale is Composti and the owner presses Genera
- **THEN** the song's parts are composed by the material generator

#### Scenario: Length
- **WHEN** Durata is Breve and the owner presses Genera
- **THEN** the written song lasts between 2 and 2.5 minutes, give or take half a double phrase

### Requirement: Artists tab
The Artists tab's new song button SHALL open Compose with the panel open, the artist picked in the quick row, and a song generated by that artist.

#### Scenario: From an artist sheet
- **WHEN** the owner presses the new song button on an artist's sheet
- **THEN** Compose opens with a new song by that artist, the panel open and the artist in the quick row

### Requirement: Look in both themes and on a phone
The panel SHALL use the app's own cards, chips, selects, folds and switches. Icons SHALL be drawn SVG, never emoji. In the hardware theme the panel's range controls SHALL be faders. At 400 px wide the panel SHALL fit without horizontal scrolling, the quick row wrapping onto several lines.

#### Scenario: Hardware theme
- **WHEN** the hardware theme is on and Stile e genere is open
- **THEN** chaos, energy and complexity are faders that move the same values as the radio's knobs

#### Scenario: Phone
- **WHEN** the window is 400 px wide and every section is open
- **THEN** nothing scrolls sideways and Genera is reachable without zooming
