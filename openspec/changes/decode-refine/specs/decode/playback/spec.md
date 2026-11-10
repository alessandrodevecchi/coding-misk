# Spec Delta

## Purpose

The Decode tab's controls, with the Lead track and the Tap button.

## ADDED Requirements

### Requirement: Lead track

In Full, when the code has a `lead` line, the track list SHALL show a Lead track after Chords, with mute and solo like the other code tracks.

#### Scenario: Mute the Lead

- **WHEN** the user mutes Lead in Full
- **THEN** the Lead's sound stops, its code text does not change and its notes stay lit

### Requirement: Tap button

The tempo row SHALL hold a Tap button next to ½× and 2×. Each press SHALL count as a tap at the moment the pointer goes down, and the button SHALL show the taps of the current series. It SHALL work only while the track plays, and its tooltip SHALL name the T key.

#### Scenario: Count

- **WHEN** the user presses Tap three times
- **THEN** the button shows 3/4 and the tempo does not change yet
