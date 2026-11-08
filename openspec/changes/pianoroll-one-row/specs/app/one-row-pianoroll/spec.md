# Spec Delta

## Purpose

Defines how a pianoroll widget whose hits all fall on one row shows their volume, so a single sound line stays compact when its hits are equal and shows its accents when they vary, the same way in the editor, on the stage and in videos.

## ADDED Requirements

### Requirement: One-row pianoroll

A pianoroll widget SHALL use the one-row looks when every audible hit of its line in the reference span has the same row value (the value the roll sorts its rows by: note, else n, else sound). The reference span SHALL be the first 8 cycles, cut at the section end, from the later of the section start and the bar the line's current code starts. A roll with two or more rows SHALL draw as before this change.

#### Scenario: Hi-hat line

- **WHEN** a line `s("hh*8")` has a pianoroll widget
- **THEN** the widget uses a one-row look

#### Scenario: Two sounds

- **WHEN** a line `s("hh*8, [~ oh]*2")` has a pianoroll widget
- **THEN** the widget draws exactly as before this change, following the "Widget notes" setting

#### Scenario: Stable within a code version

- **WHEN** a one-row line plays for a whole section without its code changing
- **THEN** its look and its height do not change before the next section or the next change of its code

### Requirement: Equal volume

The hits of a one-row roll SHALL count as equal volume when the quietest audible hit of the reference span is at least 95% of the loudest. A hit's volume SHALL be its gain times its velocity as the line writes them (1 when absent). Hits with a volume of 0.001 or less SHALL be neither counted nor drawn.

#### Scenario: Same gain

- **WHEN** a one-row line is `s("[~ hh]*4").gain(0.1)`
- **THEN** its hits count as equal volume

#### Scenario: Accents

- **WHEN** a one-row line is `s("hh*8").gain("0.5 0.15 0.3 0.15")`
- **THEN** its hits count as varying volume

#### Scenario: Silent hits

- **WHEN** a one-row line has gains `"0.4 0 0.4 0"`
- **THEN** its hits count as equal volume and the hits with gain 0 are not drawn

### Requirement: Equal-volume look

A one-row roll with equal volume SHALL draw as set by "One-row pianoroll, equal volume": Thin (default) draws the widget at half the row height (at least 12 px) with thin ticks of equal size at each hit; Full draws full-height bars of today's width at full strength.

#### Scenario: Default thin

- **WHEN** code widgets are on with default settings and a one-row equal-volume line has a pianoroll
- **THEN** the widget is half the row height and each hit is a thin tick

#### Scenario: Full

- **WHEN** the setting is Full
- **THEN** the widget has the row height and each hit is a full bar, as with "Always full" before this change

### Requirement: Varying-volume look

A one-row roll with varying volume SHALL have the row height and bars of today's width. Each bar's level SHALL be its volume divided by the loudest hit of the reference span, capped at 1. Height draws the bar as tall as its level from the bottom (at least 20% of the height); Transparency draws full-height bars with the level as opacity (at least 0.2); Both draws the height and an opacity of 0.35 plus 0.65 times the level.

#### Scenario: Height

- **WHEN** the look is Height and the line's gains are `"0.5 0.15 0.3 0.15"`
- **THEN** the first bar fills the height, the third is 60% of it and the other two are 30%

#### Scenario: Transparency

- **WHEN** the look is Transparency on the same line
- **THEN** every bar has the full height, the first at opacity 1 and the quiet ones fainter

#### Scenario: A louder hit later

- **WHEN** a hit after the reference span is louder than every hit in it
- **THEN** that bar is drawn at level 1 and the other bars keep their size

### Requirement: Random look per section

With "One-row pianoroll, varying volume" set to Random (default), the look SHALL be one of Height, Transparency and Both, chosen per section from the song seed, never the same in three sections in a row. Every one-row varying roll of a section SHALL use the same look, and the same song with the same settings SHALL give the same looks in every play, replay and export.

#### Scenario: Same song twice

- **WHEN** a song is played twice and exported once with the same settings
- **THEN** each section shows the same look in all three

#### Scenario: Variety

- **WHEN** a song has at least three sections
- **THEN** the looks of any three sections in a row are not all the same

### Requirement: Widget notes setting

The one-row looks SHALL use the hits' real volume whatever "Widget notes" is set to. "Widget notes" SHALL keep applying to rolls with two or more rows, punchcards, spirals and pitchwheels.

#### Scenario: Always full with accents

- **WHEN** "Widget notes" is Always full and a one-row line has accents
- **THEN** the accents show in the one-row look

### Requirement: One-row settings

The Code widgets card of Settings SHALL have "One-row pianoroll, equal volume" (Thin, Full) and "One-row pianoroll, varying volume" (Height, Transparency, Both, Random), each with a help line in the card's style, in English and Italian. They SHALL be saved with the code widget settings and in the backup; missing or unknown values SHALL read as Thin and Random.

#### Scenario: Italian

- **WHEN** the app language is Italian
- **THEN** both rows, their choices and their help lines are in Italian

#### Scenario: Old settings

- **WHEN** code widget settings saved before this change are read
- **THEN** the two settings are Thin and Random and every other setting is unchanged

#### Scenario: Change while playing

- **WHEN** the user changes either setting while a song plays
- **THEN** the editor, the stage panels and the next video use the new choice without a reload

### Requirement: Same looks everywhere

The one-row rules and looks SHALL be the same in the code editor, in the stage panels that draw a pianoroll (Monitor, side panels, big screen) and in every video, the fast video included. For the same song, settings, section and line, the row count, the equal-volume result and the look SHALL match.

#### Scenario: Fast video

- **WHEN** a song with a one-row varying line is exported as a fast video
- **THEN** each section's widget shows the same look as in the editor at that section

#### Scenario: Stage panel

- **WHEN** a hats instrument with one row and accents has a pianoroll panel on Monitor
- **THEN** the panel shows the section's look, in the panel's colours

#### Scenario: Light and dark

- **WHEN** the app theme is light or dark
- **THEN** ticks and bars use the theme's widget colours, and the quietest bar stays visible on the background
