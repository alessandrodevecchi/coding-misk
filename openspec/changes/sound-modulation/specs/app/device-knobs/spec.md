# Spec Delta

## Purpose

Knobs of the movement devices (later phase of this change): every Sweep, LFO and Pump shows one main knob that acts at once, also on notes already sounding, with a recorded path that plays back and exports. The placement is to be revisited at the planned UI review.

## ADDED Requirements

### Requirement: One main knob per movement device
Every movement device SHALL always show exactly one main knob on its card in the Compose rack: the Sweep's opening (its position from `from` to `to`), the LFO's depth, the Pump's depth. No mark or toggle SHALL be needed to show it. The knob SHALL start at the device's set value, and an untouched knob SHALL leave the device playing exactly as set. A track without a movement device SHALL show no knob, and its settings SHALL change from the next note as today.

#### Scenario: Adding an LFO
- **WHEN** the user adds Oscillazione to a pad and plays without touching anything
- **THEN** the card shows one knob at the LFO's depth, and the pad sounds the same as with the knob code left out

#### Scenario: Track without movement
- **WHEN** a track has only a Delay and a Low-pass device
- **THEN** its cards show their usual controls and no main knob

### Requirement: Knob acts at once
Turning the knob of a Sweep or LFO SHALL change the sound of notes already playing, within 50 ms, through a Strudel bus modulation that the page drives with the knob's offset from the set value. Turning the knob of a Pump SHALL change the ducking from the next kick. After Stop, Play or a new evaluation, the knob SHALL still work. A small drawn mark next to the knob SHALL show that it acts at once; the interface SHALL NOT use the word "Live" for it.

#### Scenario: Held chord
- **WHEN** a pad holds a chord for 4 bars and the user turns its LFO's knob in bar 2
- **THEN** the filter of that chord moves in bar 2, not at the next chord

#### Scenario: After Stop and Play
- **WHEN** the user stops, plays again and turns the knob
- **THEN** the sound moves as before the stop

### Requirement: Recorded path
With the card's record dot on, knob moves while the song plays in Compose SHALL be recorded on the device as a path of bar and value pairs at sixteenth resolution, at most 256 points. Without the record dot, moves SHALL NOT be saved. On playback the path SHALL move the knob and the sound; a hand on the knob SHALL win until it is released.

#### Scenario: Replay a gesture
- **WHEN** the user records a slow turn over bars 5 to 8, turns the record dot off and plays from bar 1
- **THEN** the knob moves by itself over bars 5 to 8 and the sound follows

### Requirement: Export of a path
A recorded gesture SHALL be saved as a path of the path engine (`app/movement-paths`, design D15) and SHALL play through it, so the real-time export, the fast export and code copied out of the app play it as the page does. Copied code SHALL hold no knob's live bus: the gesture SHALL be its path line, or the set value when there is no gesture.

#### Scenario: Fast export
- **WHEN** a song with a recorded path is exported fast and in real time
- **THEN** both files move the sound at the same bars, within the export checks' usual difference

#### Scenario: Copied code
- **WHEN** the user copies the code of that song and evaluates it in plain Strudel
- **THEN** it evaluates with no error and the target follows the recorded gesture

### Requirement: Knob placement without a new panel
No permanent panel SHALL be added for knobs. A knob SHALL appear only:
- on the movement device's card in the Compose rack, as the first row of the card's controls, with the record dot;
- in the Movement row of the radio console's track card (the card a Mixer row's name opens), only while that track plays a movement device, at most two knobs, acting while the song plays and never recorded;
- in code, as the editor's slider widget on the `knob(n)` call the app writes.

#### Scenario: Radio row
- **WHEN** a radio song plays and the user opens the track card of the pad, whose track has one movement device, then the card of the bass, whose track has none
- **THEN** the pad's card shows one knob in its Movement row, and the bass's card shows no Movement row

#### Scenario: Radio moves not recorded
- **WHEN** the user turns the pad's knob in the radio, then saves the song and opens it in Compose
- **THEN** the device has no new path

#### Scenario: Song without movement devices
- **WHEN** a song has no movement device
- **THEN** Compose and the radio console show no main knob anywhere

### Requirement: Generated songs hold no path
Decode, the generator and the director SHALL NOT write a knob's gesture. They MAY write Path devices of the path engine (`app/movement-paths`).

#### Scenario: Radio session
- **WHEN** a new radio session is generated
- **THEN** no track's device holds `path`
