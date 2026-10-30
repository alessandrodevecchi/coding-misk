# Spec Delta

## ADDED Requirements

### Requirement: Voice-track lines just in time
In the code of the moment of a grown song (Live coder and Crescendo) a voice-track line SHALL show from the last code step in the 4 bars before its first start until the first code step after its last start. When no code step falls in those 4 bars, a display step on the bar before its first start SHALL bring it in; a display step changes only the code shown. Outside that span the line SHALL play from the hidden tail, so the sound is unchanged.

#### Scenario: Grown radio song
- **WHEN** the radio plays seed `f7zvee` with the Live coder profile and the song "Static" is on air at bar 0
- **THEN** the code of the moment shows no voice-track line, and each of the 12 voice lines shows only from shortly before it first speaks until the code step after it last speaks

#### Scenario: Same sound
- **WHEN** the same grown song is rendered with this change and with every voice line shown
- **THEN** every voice hap has the same time, sample and level in both

#### Scenario: Effects stay folded
- **WHEN** a voice-track line shows with "Voice effects" on
- **THEN** its effects show folded into one call, as before

### Requirement: Classic keeps every voice-track line
Classic, including its blocks code and the Sections option, SHALL keep every voice-track line in the code as today. A grown song's line whose first start is on bar 0 or 1 SHALL show from bar 0.

#### Scenario: Classic
- **WHEN** a song with 12 voice-track clips plays with the Classic profile
- **THEN** its code shows the 12 lines from bar 0, as before this change

### Requirement: Voice-track lines never take typing time
A voice-track line that comes into the code of the moment SHALL NOT delay, speed up or take typing time from any other edit. By default it SHALL appear whole, pasted, at its step. It MAY be typed at a person's pace only when the typing plan has a free gap before its step long enough for the whole line; this SHALL NOT count as one of the forced pastes of the fitted duration and SHALL NOT change the typing load used to choose a growth shape.

#### Scenario: Busy step
- **WHEN** a voice-track line is due at a step whose other edits fill the typing time before it
- **THEN** the line appears whole at that step and the other edits are typed as without the voice line

#### Scenario: Free step
- **WHEN** a voice-track line is due at a step with no other edit in the 4 bars before it
- **THEN** the line may be typed character by character before the step, finishing no later than the step
