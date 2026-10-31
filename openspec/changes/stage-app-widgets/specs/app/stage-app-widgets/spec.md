## ADDED Requirements

### Requirement: App widgets as stage panels

The hit grid and the tone cloud SHALL be stage panel widgets like the Strudel widgets: in the Monitor visual, in the side panels over other visuals and in the Stage visual's big screen. They SHALL be drawn by the same painters as in the code, from the same notes, on the page, in the session video, in the fast video, in fragments and in the live output. They SHALL be on by default in the stage widgets' widget list and MAY be turned off there.

#### Scenario: Monitor with drums and a pad

- **WHEN** a song with drums and a pad plays on the Monitor visual
- **THEN** Monitor shows a hit grid panel for the drums and a tone cloud panel for the pad

#### Scenario: Same picture in the fast video

- **WHEN** a fast video of the same song is made with the Monitor visual
- **THEN** its hit grid and tone cloud panels show the same rows and notes as on the page at the same bar

#### Scenario: Turned off

- **WHEN** the user turns the tone cloud off in the stage widgets' widget list
- **THEN** no stage panel shows a tone cloud, and the pad uses its next widget

### Requirement: One hit grid for the drums

On the stage the drum instruments SHALL share one hit grid panel, in the slot of the first drum instrument, with one row for each drum sound the song uses (the code widgets' "Rows" setting applies). While the hit grid shows, the other drum instruments SHALL NOT take panels of their own.

#### Scenario: Kick, snare and hats

- **WHEN** a song plays kick, snare and hats on Monitor with the hit grid on
- **THEN** one panel shows a hit grid with their rows, and the freed slots go to other instruments

### Requirement: At most one tone cloud on the stage

The stage SHALL show at most one tone cloud at a time. It SHALL go on the pad; without a pad on the first melodic instrument playing (bass, lead, arp); on the voice only if no other instrument can take it. A voice without the tone cloud SHALL have the scope as its main stage widget.

#### Scenario: Pad and voice

- **WHEN** a song with a pad and a voice track plays on Monitor
- **THEN** the pad has the tone cloud and the voice has a scope

#### Scenario: No pad

- **WHEN** a song with bass and lead and no pad plays on Monitor
- **THEN** the bass has the tone cloud and no other panel has one

### Requirement: Quick switch above the visual

The row of buttons above the visual SHALL have a "Widgets" button (it: "Widget") that turns the stage widgets over the visual on and off in one press. Turning on SHALL bring back the last mode chosen (Side panels the first time). The button SHALL show its state, have a tooltip in English and Italian, and be hidden on the visuals where panels never go over the scene (Monitor, Roll, the chat look, the soul). The choice SHALL be the same setting as in Settings and SHALL be saved.

#### Scenario: One press

- **WHEN** the stage widgets are off and the user presses "Widgets" on the Sunset visual
- **THEN** the side panels appear, and Settings shows the mode Side panels

#### Scenario: Mode kept

- **WHEN** the mode is Big screen and the user presses "Widgets" twice
- **THEN** the widgets go off and come back in Big screen

#### Scenario: Monitor

- **WHEN** the user picks the Monitor visual
- **THEN** the "Widgets" button is hidden

### Requirement: Clear mode names

The setting SHALL be named "Widgets over the visual" (it: "Widget sopra il visual") with the modes Off, Side panels (it: "Pannelli ai lati") and Big screen (it: "Maxischermo"). Under the control a one-line explanation SHALL describe the chosen mode. Stored settings SHALL keep their meaning.

#### Scenario: Explanation follows the choice

- **WHEN** the user picks Big screen
- **THEN** the line under the control says that the panels go inside the Stage visual's big screen, and appear as side panels on the other visuals

#### Scenario: Old setting

- **WHEN** a browser stored the mode "Palco" before this change
- **THEN** the setting shows Big screen and the stage looks as before
