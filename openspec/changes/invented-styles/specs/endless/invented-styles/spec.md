# Spec Delta

## Purpose

Invent new styles from the existing ones, try them in the radio, and keep the ones worth keeping. A genre is a broad family of music, a style is a precise recipe inside one genre, an artist is an invented name that mixes styles; this capability invents styles only.

## ADDED Requirements

### Requirement: Invent a style from existing recipes
The app SHALL make a new style recipe from a seed by taking a base style and one or two donor styles: the base gives the tempo part, and each other part (drums, bass, harmony, lead, pads, voice) comes whole from the base or a donor, with at least two parts from donors and two from the base. Lists SHALL be trimmed to a few items of their source. The maker SHALL only use building blocks that already exist (presets, grooves, drum machines, sounds, progressions, shapes); it SHALL NOT invent genres.

#### Scenario: Parts from several styles
- **WHEN** a style is invented from a seed
- **THEN** its origin lists, for each part, the existing style it came from, and at least two parts name a style other than the base

### Requirement: Musical coherence
An invented style SHALL follow the coherence rules of the design (D3): groove and tempo, drum machine and groove, swing, melody modes and chords, guitar and tempo, energy shapes, meter, and 4 to 5 usual tracks. Each rule reads the built-in styles: two building blocks fit when a built-in style uses both. The style SHALL pass recipe validation with no errors and no unknown sounds.

#### Scenario: Redraw
- **WHEN** a draw breaks a rule
- **THEN** it is drawn again from the same seed, at most 8 times, then a base with one donor part that fits is returned

#### Scenario: Groove and tempo
- **WHEN** an invented style takes the drum-and-bass grooves
- **THEN** its tempo range lies inside the home tempo of those grooves, not at 120 BPM

#### Scenario: No copy
- **WHEN** a style is invented
- **THEN** its similarity to every existing style is below 0.8

### Requirement: Name, genre and description
An invented style SHALL get a name in English and Italian from fixed word lists, never equal to an existing style, artist or genre name, nor to a real genre on a fixed list. It SHALL get exactly one genre, the closest by similarity (`experimental` when nothing is close), the closest existing style, and a description naming the source style of each part. When a genre is asked, the style SHALL land in that genre.

#### Scenario: Asked genre
- **WHEN** the listener presses "Inventa uno stile di questo genere" on the Techno card
- **THEN** the new style's genre is Techno

### Requirement: Trial in the radio
A new invented style SHALL first play as a trial: a chip marked "in prova" with keep, again and discard. It plays alone from the next song, with the artist set to Custom and the compilation off, and its songs are marked as trial songs. The trial SHALL survive a reload. Discard SHALL restore the state from before the trial.

#### Scenario: Other draws unchanged
- **WHEN** a trial style is in the radio
- **THEN** artist exploration, the dice for existing styles and the compilation draw exactly as without it

#### Scenario: Discard
- **WHEN** the listener invents a style while Berlin techno and Lo-fi are selected, then discards it
- **THEN** Berlin techno and Lo-fi are selected again and the trial chip is gone

#### Scenario: Again
- **WHEN** the listener presses again during a trial
- **THEN** a different invented style replaces the trial, from a fresh seed

### Requirement: Keep and use
Keeping SHALL save the style among the user's styles, with an `invented` field holding seed, maker version, origin per part and closest style. A kept style SHALL behave as any user style: shown in the Styles tab with an "Inventato" badge and its origin, editable (after an edit the badge reads "Inventato, modificato"), duplicable, exportable and importable, included in the backup, chosen by artists and random artists, offered by the New song panel and the compilation setup.

#### Scenario: Keep then edit
- **WHEN** the listener keeps a trial style and raises its tempo range in the Styles tab
- **THEN** the style appears among theirs, in the radio style chips under its genre, with the badge "Inventato, modificato"

### Requirement: Sessions saved during a trial
A radio session saved to a playlist while it uses a trial style SHALL carry that style's recipe, so Replay gives the same songs after the trial is discarded or in another browser. A saved song SHALL keep playing when its style is unknown, using its genre.

#### Scenario: Replay after discard
- **WHEN** the listener saves a session during a trial, discards the trial, and replays the session
- **THEN** the same songs play

### Requirement: Same seed, same style
The same seed SHALL give the same invented style in every browser, from the built-in styles only. The seed SHALL show in the tooltip. The maker SHALL carry a version that rises when an intended change moves its seed fixtures; a kept style SHALL be stored whole, so a new maker version never changes it. The director and its fixtures SHALL NOT change.

#### Scenario: Repeatable
- **WHEN** a style is invented twice from the same seed
- **THEN** both recipes are identical

### Requirement: Invent buttons
The radio SHALL offer an invent die in its Styles row, next to the dice of the random tools (#50). The New song panel of Compose SHALL offer the same die in its Styles row, with the same trial chip, kept in the panel's own options. The Styles tab SHALL offer "Inventa uno stile" with a trial card, and each Genres card with styles SHALL offer "Inventa uno stile di questo genere".

#### Scenario: Invent die
- **WHEN** the listener presses the invent die in the radio Styles row
- **THEN** a trial style chip appears with its seed in the tooltip

#### Scenario: Invent in the New song panel
- **WHEN** the listener presses the invent die in the New song panel and then Genera
- **THEN** the new song is made from the trial style, and the radio's styles do not change

### Requirement: Invented styles in compilations (phase 2)
A compilation setup SHALL offer a switch "Stili inventati", off by default. When on, a segment MAY play a style invented from the session seed in the segment's genre, with keep on the now playing tag; the same session seed SHALL give the same segments.

#### Scenario: Invented segment
- **WHEN** a compilation runs with "Stili inventati" on
- **THEN** some segments play invented styles, and Replay with the same seed plays the same ones
