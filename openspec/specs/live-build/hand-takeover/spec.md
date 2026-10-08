# live-build/hand-takeover Specification

## Purpose
Hand takeover lets the user live code on top of a song that builds itself: typing in the code stops the build, and a resume action gives control back to the song.

## Requirements

### Requirement: Take over by typing
While a live build plays, the first character typed or deleted in the code panel SHALL switch the song to "by hand". Clicking, moving the cursor, selecting and copying SHALL NOT switch it. By hand, no build step SHALL change the code in the editor, the music SHALL keep playing the last code evaluated, and evaluating (Ctrl+Enter) SHALL play the user's code.

#### Scenario: Typing takes over
- **WHEN** a live build plays and the user types a character in the code
- **THEN** the "BY HAND" label appears, the next step does not change the code, and the music goes on

#### Scenario: Selecting does not take over
- **WHEN** the user clicks in the code, selects a line and copies it
- **THEN** the live build goes on and the next step is typed as usual

#### Scenario: Evaluate own code
- **WHEN** the user, by hand, changes a number and presses Ctrl+Enter
- **THEN** the change is heard from the next query of the scheduler

### Requirement: Song keeps time by hand
By hand, the tempo of each bar and the sections SHALL follow the song as written. At the end of the song the music SHALL NOT stop: it SHALL keep playing until the user stops it. Spoken comments SHALL be silent while by hand.

#### Scenario: Past the end
- **WHEN** the song reaches its last bar while by hand
- **THEN** the music keeps playing the user's code

#### Scenario: No comments by hand
- **WHEN** a step with a comment would play while by hand
- **THEN** no comment is spoken or shown

### Requirement: Resume live build
A "Resume live build" action SHALL be shown while by hand, with a switch "from where I was", on by default and remembered. With the switch on, the song SHALL go back to the bar where the user took over and go on from there with the code it had at that bar. With the switch off, the song SHALL go on from the bar it has reached meanwhile. In both cases the code SHALL be typed from the user's code to the song's code, and the build SHALL go on with its steps and comments. Before the code is replaced, the user's code SHALL be kept in a collapsible "your last code" block under the editor, with an action to copy it and one to go back to it by hand.

#### Scenario: Resume from where I was
- **WHEN** the user took over at bar 24, played by hand until bar 90, and resumes with the switch on
- **THEN** the song goes on from bar 24 with its code at that bar, and the user's code is in the "your last code" block

#### Scenario: Resume where the song has got to
- **WHEN** the user resumes at bar 40 with the switch off
- **THEN** the code becomes the song's code at bar 41 and the next step plays on its bar

#### Scenario: Back to the hand code
- **WHEN** the user presses "back to this code" in the block
- **THEN** the song is by hand again with that code in the editor, evaluated

### Requirement: Compose and Radio
Hand takeover SHALL work in Compose, for songs with their own steps and with the "Live build" switch, and in the Radio. In the Radio, by hand SHALL hold the song on air: no song change happens until resume; with the switch off, on resume after the end of the song on air, the next song SHALL start on the next bar.

#### Scenario: Radio held
- **WHEN** the user takes over in the Radio and the song on air reaches its end
- **THEN** no new song starts and the user's code keeps playing

#### Scenario: Radio resume after the end
- **WHEN** the user resumes with the switch off after the song on air has ended
- **THEN** the next song starts on the next bar and the radio goes on
