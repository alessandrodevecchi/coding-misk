## Purpose

The Patterns tab lets the user listen to what a part plays, apart from any song: every preset and every saved pattern, in a loop with a chosen sound, key and tempo.

## ADDED Requirements

### Requirement: A Patterns tab in the Groove Lab
The Groove Lab SHALL have a Patterns tab next to the Sounds tab. It SHALL list patterns by kind: melodies, basslines, arpeggios, chords, grooves and riffs, with a search by name and a filter by kind and by source (built-in, mine). The mode SHALL remember the tab like its other tabs.

#### Scenario: Tab present
- **WHEN** the user opens the Groove Lab
- **THEN** the tabs show Patterns right after Sounds, and opening it lists the built-in patterns grouped by kind

#### Scenario: Remembered
- **WHEN** the user leaves the Groove Lab on the Patterns tab and comes back to the mode
- **THEN** the Patterns tab is open again

### Requirement: Play in a loop
Each pattern SHALL play in a loop with a sound, a key and a tempo the user chooses, and an optional simple beat under it. Changing sound, key, tempo or beat SHALL apply at the next bar without stopping. Only one pattern SHALL play at a time, and playing a pattern SHALL stop a song or the radio first.

#### Scenario: Change the key while it plays
- **WHEN** the bassline `rolling` plays in A at 128 BPM and the user picks the key D
- **THEN** from the next bar it plays in D, without a gap

#### Scenario: Over a beat
- **WHEN** the user turns on the simple beat for the melody `neon`
- **THEN** a kick on every beat and an offbeat hat play under the melody, quieter than it

### Requirement: Harmony for a pattern
A melodic pattern SHALL play over a progression the user chooses from the app's progressions, with the scale mode for melodies. Each kind SHALL start with defaults that fit it: a minor progression, a sound of its kind, 120 to 140 BPM.

#### Scenario: Defaults
- **WHEN** the user plays an arpeggio for the first time
- **THEN** it plays with an arp sound over the default progression, at the default tempo

### Requirement: Mini preview
Each pattern SHALL show a small preview: a note view (pitch against time) for melodic patterns and a step grid for grooves, drawn from what the pattern plays over one to four bars. While a pattern plays, its preview SHALL show the current step.

#### Scenario: Groove grid
- **WHEN** the groove `breakbeat` is listed
- **THEN** its preview shows one row per drum sound with the hits of the bar

### Requirement: Styles that use a pattern
The detail of a built-in pattern SHALL list the styles whose recipes name it, each linking to that style in the Styles tab.

#### Scenario: Styles listed
- **WHEN** the user opens the bassline `rolling`
- **THEN** the detail lists every style whose recipe names `rolling`, and a tap on one opens it in the Styles tab

### Requirement: Links from Styles, Sounds and Compose
A preset named in a style card SHALL link to that pattern in the Patterns tab. A sound in the Sounds tab SHALL offer to try it on a pattern of its kind. In Compose, a listen button next to a track's preset menu SHALL open that pattern in the Patterns tab with the track's sound, the section's key and the song's tempo.

#### Scenario: From Compose
- **WHEN** the user presses the listen button next to the bass preset menu of a track in a song in E at 140 BPM
- **THEN** the Groove Lab opens on the Patterns tab with that bassline selected, the track's sound, key E and 140 BPM, ready to play

#### Scenario: From Sounds
- **WHEN** the user picks "try on a pattern" on the electric piano in the Sounds tab
- **THEN** the Patterns tab opens with a chords pattern selected and the electric piano as its sound

### Requirement: Compose new in the tab
The tab SHALL offer "Compose new" for a kind, which asks the material generator for a part with the tab's key, progression and an energy value, and lists it as a generated pattern that is not saved until the user saves it.

#### Scenario: Generated and kept
- **WHEN** the user composes a new arpeggio and then saves it
- **THEN** it appears among the user's patterns with its kind and the source "generated"
