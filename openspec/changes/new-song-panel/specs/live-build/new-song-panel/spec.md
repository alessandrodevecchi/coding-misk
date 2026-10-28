## Purpose

The New song panel of Compose: one place to start a new song: from scratch as today, generated with chosen options (the radio's controls, with values of its own), or fully at random.

## ADDED Requirements

### Requirement: New song opens a panel
The "Nuovo brano" button in the Compose title row SHALL open and close an inline panel under the title row and SHALL show whether it is open. The panel SHALL close with its close button or Esc. The title row SHALL NOT keep a separate "New song from artist" select. The panel's open state SHALL be remembered on reload.

#### Scenario: Open and close
- **WHEN** the owner presses Nuovo brano
- **THEN** the panel opens under the title row with the quick row and five closed sections, and the button reads as expanded
- **WHEN** the owner presses Esc
- **THEN** the panel closes and the open song is unchanged

### Requirement: Quick row
The panel SHALL start with a quick row holding, in this order, Da zero, Artista (Personalizzato, the usable artists, a drawn random artist, and its die), Preset, Seme (empty means random), Genera and Sorprendimi. Picking an artist or a preset and pressing Genera SHALL be enough to make a song. Da zero, Genera and Sorprendimi SHALL ask to press twice when the open song has unsaved changes.

#### Scenario: Artist and generate
- **WHEN** the owner picks an artist and presses Genera
- **THEN** a new song by that artist opens unsaved in Compose and the toast names the artist

#### Scenario: Seed
- **WHEN** the owner types a seed and presses Genera twice with the same values
- **THEN** both songs are the same; with the seed empty, the two songs differ and the field shows each seed used

### Requirement: From scratch
Da zero SHALL make the empty song Nuovo brano made before this change: one drum track, no configuration of its own, the code free to edit by hand. It SHALL read no value of the panel.

#### Scenario: From scratch
- **WHEN** the owner presses Da zero
- **THEN** an empty song with one drum track opens, as before this change, whatever the panel's values

### Requirement: Surprise me
Sorprendimi, drawn with the die icon, SHALL draw every value of the panel at random from a new seed (artist or Personalizzato, styles, chaos, energy, complexity, sounds seed, profile and growth shape, material, both voices, length), write them into the panel's values, and generate a song with them. The radio's values SHALL NOT change. The same seed SHALL give the same values and the same song.

#### Scenario: Fully random song
- **WHEN** the owner presses Sorprendimi
- **THEN** a new song opens unsaved, the panel's sections show the drawn values, the seed field shows the seed used, and the Preset select shows Personalizzato

#### Scenario: Repeatable
- **WHEN** the owner types the seed shown after Sorprendimi and presses Genera
- **THEN** the same song opens

### Requirement: Sections
Below the quick row the panel SHALL have five sections: Stile e genere, Profilo e crescita, Voci, Materiale, Durata. Each SHALL be closed by default, show a one-line summary of its values when closed, and remember whether the owner opened it. Voci SHALL hold the "Voce: narratore" and "Voce: traccia" blocks with their on/off switches. Durata SHALL offer Come lo stile, Breve, Media, Lunga and Esatta with minutes, and SHALL show the length as heard.

#### Scenario: Summary when closed
- **WHEN** the owner sets chaos to 0.7 and closes Stile e genere
- **THEN** the section's summary line shows the styles and chaos 0.7

#### Scenario: Genre chips
- **WHEN** the owner presses a genre chip
- **THEN** the styles of that genre are selected in the style chips

#### Scenario: Generator needs a growing build
- **WHEN** the build is in blocks
- **THEN** the Generator select is disabled and its tooltip says why

### Requirement: Same controls as the radio, values of its own
A control shown in both the panel and the radio SHALL be drawn and handled by the same code. The panel SHALL keep its own values, kept on reload: a change in the panel SHALL NOT change the radio, and a change in the radio SHALL NOT change the panel. The panel SHALL offer "Prendi dalla radio", which copies the radio's current values into the panel.

#### Scenario: Panel leaves the radio alone
- **WHEN** the owner sets energy to 0.9 and switches "Voce: traccia" off in the panel, then opens the radio
- **THEN** the radio shows its own energy and voice values, unchanged

#### Scenario: Take from the radio
- **WHEN** the owner picks the Live coder profile in the radio, then presses "Prendi dalla radio" in the panel
- **THEN** Profilo e crescita shows Live coder

### Requirement: Growth shape with any profile
The opening, pace and development controls SHALL always be shown in Profilo e crescita. Changing one while Profile is Classic, Crescendo, Live coder or as the artist and style say SHALL switch Profile to Custom based on that profile (Live coder for the artist and style choice) with the new value.

#### Scenario: Shape with Live coder
- **WHEN** Profile is Live coder and the owner picks a pace
- **THEN** Profile becomes Custom based on Live coder with that pace, and the radio keeps its own profile

### Requirement: Presets
The Preset select SHALL offer the five built-in presets, as a guide, and the owner's own presets. Picking a preset SHALL set the values it holds and leave the others as they are. The select SHALL show the last preset picked until a value changes, then Personalizzato.

#### Scenario: Pick and change
- **WHEN** the owner picks Groove breve, then moves chaos
- **THEN** the values of Groove breve are set, and after the move the select shows Personalizzato

### Requirement: Owner's presets
The owner SHALL be able to save the current values, length included, as a named preset of his own, overwrite one of his own after confirming, and delete his own. Built-in presets SHALL NOT be deletable or overwritten. The owner's presets SHALL be part of the backup.

#### Scenario: Save
- **WHEN** the owner saves the current values as "Notte" and reloads
- **THEN** "Notte" is in the Preset select and picking it sets the saved values

#### Scenario: Built-in kept
- **WHEN** the owner saves the current values under the name of a built-in preset
- **THEN** a new preset of his own is saved and the built-in one is unchanged

### Requirement: The generated song
Genera SHALL write the song with the same director call and options as a radio song, plus the chosen length. The song SHALL open unsaved in Compose with the chosen profile, and with Custom its controls, as its own configuration, so it plays as chosen with no trial mark and Save keeps that configuration. With "Voce: traccia" off the song SHALL have no voice track; with "Voce: narratore" off its narrator SHALL be off. The panel SHALL stay open after Genera.

#### Scenario: Custom profile
- **WHEN** Profile is Custom based on Live coder with opening "one sound" and the owner presses Genera
- **THEN** the song opens with the Live build on, Live coder controls, that opening, and no "configuration changed" mark

#### Scenario: Composed material
- **WHEN** Materiale is Composti and the owner presses Genera
- **THEN** the song's parts are composed by the material generator

#### Scenario: Length
- **WHEN** Durata is Breve, the profile is Classic and the owner presses Genera
- **THEN** the song lasts between 2 and 2.5 minutes, give or take half a double phrase

### Requirement: Length is the length heard
Durata SHALL set the length of the song as heard, growth included, as its card shows it. With Crescendo or Live coder and a Durata other than Come lo stile, the generated song SHALL carry the growth duration `planned` and its written length SHALL be drawn one phrase shorter than the range, so the grown song lands in the range.

#### Scenario: Medium with Live coder
- **WHEN** Durata is Media, the profile is Live coder and the owner presses Genera
- **THEN** the song opens with the Live build on, grows within the plan, and lasts between 3 and 4 minutes as heard, give or take half a double phrase

### Requirement: Length and free growth exclude each other
A Durata other than Come lo stile and the free growth duration SHALL exclude each other: choosing one SHALL set the other back (the growth duration to `planned`, Durata to Come lo stile), and a line SHALL say why. With Come lo stile the growth duration SHALL work as before this change, and the Durata summary SHALL say that a grown song lasts longer than written.

#### Scenario: Free growth chosen
- **WHEN** Durata is Media and the owner sets the growth duration to Libera
- **THEN** Durata becomes Come lo stile and a line says that a free growth decides its own length

### Requirement: Artists tab
The Artists tab's new song button SHALL open Compose with the panel open, the artist picked in the quick row, and a song generated by that artist.

#### Scenario: From an artist sheet
- **WHEN** the owner presses the new song button on an artist's sheet
- **THEN** Compose opens with a new song by that artist, the panel open and the artist in the quick row

### Requirement: Look in both themes and on a phone
The panel SHALL use the app's own cards, chips, selects, folds and switches. Icons SHALL be drawn SVG, never emoji. In the hardware theme the panel's range controls SHALL be faders. At 400 px wide the panel SHALL fit without horizontal scrolling, the quick row wrapping onto several lines.

#### Scenario: Hardware theme
- **WHEN** the hardware theme is on and Stile e genere is open
- **THEN** chaos, energy and complexity are faders drawn by the same code as the radio's knobs

#### Scenario: Phone
- **WHEN** the window is 400 px wide and every section is open
- **THEN** nothing scrolls sideways and Genera is reachable without zooming
