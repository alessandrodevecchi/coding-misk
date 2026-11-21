# Spec Delta

## Purpose

Live knobs (later phase of this change): a movement device marked "live" gets a knob that moves notes already sounding, with a recorded path that plays back and exports. The placement is to be revisited at the planned UI review.

## ADDED Requirements

### Requirement: Live mark
A movement device MAY hold `live: true`. A track SHALL hold at most two live devices; the validator SHALL report a third. A live device SHALL show exactly one knob: the Sweep's position from `from` to `to`, the LFO's centre, or the Pump's depth.

#### Scenario: Third live device
- **WHEN** a track has three movement devices and the user turns on "Live" on two of them
- **THEN** the third device's Live chip is disabled, with a tooltip that two is the limit

### Requirement: Knob moves sounding notes
Turning the knob of a live Sweep or LFO SHALL change the sound of notes already playing, within 50 ms, through a Strudel bus modulation that the page drives. Turning the knob of a live Pump SHALL change the ducking from the next kick. After Stop, Play or a new evaluation, the knob SHALL still work.

#### Scenario: Held chord
- **WHEN** a pad holds a chord for 4 bars and the user turns its live LFO's knob in bar 2
- **THEN** the filter of that chord moves in bar 2, not at the next chord

#### Scenario: After Stop and Play
- **WHEN** the user stops, plays again and turns the knob
- **THEN** the sound moves as before the stop

### Requirement: Recorded path
With the device's Rec dot on, knob moves while the song plays in Compose SHALL be recorded on the device as a path of bar and value pairs at sixteenth resolution, at most 256 points. On playback the path SHALL move the knob and the sound; a hand on the knob SHALL win until it is released.

#### Scenario: Replay a gesture
- **WHEN** the user records a slow turn over bars 5 to 8, turns Rec off and plays from bar 1
- **THEN** the knob moves by itself over bars 5 to 8 and the sound follows

### Requirement: Export of a path
The real-time export and the fast export SHALL play a live device's path as it plays in the page. Code copied out of the app SHALL hold no bus modulation: the path SHALL become values per bar of the target's base, or the knob's value when there is no path, with a comment that the knob became steps.

#### Scenario: Fast export
- **WHEN** a song with a recorded path is exported fast and in real time
- **THEN** both files move the sound at the same bars, within the export checks' usual difference

#### Scenario: Copied code
- **WHEN** the user copies the code of that song and evaluates it in plain Strudel
- **THEN** it evaluates with no error and the target steps through the path's value per bar

### Requirement: Knob placement without a new panel
No permanent panel SHALL be added for knobs. A knob SHALL appear only:
- inline on the live device's card in the Compose rack, as the first row of the card's controls, with the Rec dot;
- in the radio console's Parts row, after the Vary and Swap keys, only while the selected part plays a live device, at most two knobs, not recorded;
- in code, as the editor's slider widget on the `knob(n)` call the app writes.

#### Scenario: Radio row
- **WHEN** a radio song plays and the user selects the pad chip, whose track has one live device, then the bass chip, whose track has none
- **THEN** one knob shows next to Vary and Swap for the pad, and no knob shows for the bass

#### Scenario: Compose without live devices
- **WHEN** a song has no live device
- **THEN** Compose and the radio console show no knob anywhere

### Requirement: Generated songs never live
Decode, the generator and the director SHALL NOT write `live` or a path.

#### Scenario: Radio session
- **WHEN** a new radio session is generated
- **THEN** no track's device holds `live` or `path`
