# Spec Delta

## Purpose

The Decode tab's controls: the Tap and Auto buttons, Full picked by hand before Play and proposed while Live plays (part 1), the Lead track (part 2).

## ADDED Requirements

### Requirement: Tap button

The tempo row SHALL hold a Tap button next to ½× and 2×. Each press SHALL count as a tap at the moment the pointer goes down, and the button SHALL show the taps of the current series. It SHALL work only while the track plays, also before the tempo is found, and its tooltip SHALL name the T key. After a tapped, halved or doubled tempo a small Auto button SHALL sit next to it.

#### Scenario: Count

- **WHEN** the user presses Tap three times
- **THEN** the button shows 3/4 and the tempo does not change yet

#### Scenario: Auto

- **WHEN** the user pressed 2× and then Auto
- **THEN** the tempo is the analysed one again and the Auto button goes

### Requirement: Lead track (part 2)

In Full, when the code has a `lead` line, the track list SHALL show a Lead track after Chords, with mute and solo like the other code tracks.

#### Scenario: Mute the Lead

- **WHEN** the user mutes Lead in Full
- **THEN** the Lead's sound stops, its code text does not change and its notes stay lit

## MODIFIED Requirements

### Requirement: Level switch

The tab SHALL show a level switch: "Live" (level A) and "Full" (level B). The first open of a track SHALL use Live; a track with a stored level B analysis SHALL open in Full. Full SHALL be selectable as soon as a track is open, before Play too: the analysis runs and Play then starts in Full. Switching to Full while the track plays SHALL keep the original playing, run the analysis, and let the level B code take over at the next bar once it is ready, its code of that bar appearing whole. While Live plays, after 8 bars the tab SHALL propose Full once per track.

#### Scenario: Switch while playing

- **WHEN** level A plays a new track and the user picks Full
- **THEN** the original keeps playing, the growing mark shows on the switch, and the level B code takes over at a bar boundary when the analysis ends

#### Scenario: Full before Play

- **WHEN** the user opens a new track, picks Full without pressing Play, and presses Play when the analysis ends
- **THEN** the track plays in Full from its first bar

#### Scenario: The proposal

- **WHEN** a new track plays in Live past bar 8
- **THEN** the tab shows a note that proposes Full, once for that track
