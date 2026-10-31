# Spec Delta

## Purpose

The Decode tab itself: where it sits, what it plays, how the original and the code tracks are mixed, and how the user switches between the two levels.

## ADDED Requirements

### Requirement: The Decode tab
The Listen mode SHALL show the tabs in this order: Compose, Songs, Decode, Playlists, Radio. The tab SHALL be named "Decode" (it: "Decodifica") and its page heading SHALL read "Track to code" (it: "Da brano a codice"). The mode's subtitle SHALL list the new tab. The tab SHALL be remembered like the other tabs of the mode.

#### Scenario: Tab order
- **WHEN** the app opens in the Listen mode in English
- **THEN** the tabs read Compose, Songs, Decode, Playlists, Radio

#### Scenario: Italian
- **WHEN** the language is Italian
- **THEN** the tab reads "Decodifica" and the heading "Da brano a codice"

### Requirement: Original and code play in sync
The tab SHALL play the original file and the code on one clock, so a code drum hit on a beat sounds within 10 ms of the beat the analysis found in the original. Seeking SHALL move both. The code SHALL start on the first downbeat found.

#### Scenario: Seek
- **WHEN** the user drags the player bar's timeline to 2:00
- **THEN** the original and the code continue from 2:00 together, with the code of that bar

### Requirement: Original and code tracks
The tab SHALL list the tracks it plays: Original first, then Code. In level A, Code SHALL be one track. In level B, Code SHALL be one track per decoded part (for example drums, bass, chords). By default Original SHALL be on and every code track muted.

#### Scenario: Default
- **WHEN** a track opens
- **THEN** the original is heard and no code sound is heard, while the code is still written and its notes light up

#### Scenario: Level B tracks
- **WHEN** level B found drums, bass and chords
- **THEN** the track list shows Original, Drums, Bass and Chords, each with mute and solo

### Requirement: Mute and solo
Each track SHALL have a mute and a solo button, as in the Compose arranger. Mute and solo SHALL change only what is heard, never the code text. With one or more tracks soloed, only the soloed tracks SHALL be heard.

#### Scenario: Solo the bass
- **WHEN** the user solos the Bass code track
- **THEN** only the code's bass is heard, and the code text does not change

### Requirement: Original ↔ Code slider
The tab SHALL have a slider from Original to Code. Fully on Original, every code track SHALL be muted; fully on Code, the original SHALL be muted; in between both SHALL be heard, the balance moving with the slider at equal loudness in the middle. The original's level SHALL be matched to the app's song level, so the two ends sound about as loud.

#### Scenario: Middle
- **WHEN** the slider is in the middle and no track is muted
- **THEN** the original and the code are heard together at about the same loudness

### Requirement: Slider and mute stay consistent
Moving the slider to an end SHALL mute the other side's tracks; moving it away from that end SHALL unmute only the tracks the slider muted. Muting every code track, or soloing the original, SHALL move the slider to Original; muting the original, or soloing a code track, SHALL move it to Code. Unmuting a side while the slider is at the other end SHALL move it to the middle.

#### Scenario: From the default
- **WHEN** the tab opens (slider on Original, code muted) and the user unmutes the code
- **THEN** the slider moves to the middle and both are heard

#### Scenario: User mute kept
- **WHEN** the user mutes the Chords track, then moves the slider to Original and back to the middle
- **THEN** Drums and Bass are heard again and Chords stays muted

### Requirement: Level switch
The tab SHALL show a level switch: "Live" (level A) and "Full" (level B). The first open of a track SHALL use Live; a track with a stored level B analysis SHALL open in Full. Switching to Full while the track plays SHALL keep the original playing, run the analysis, and let the level B code take over at the next bar once it is ready, its code of that bar appearing whole.

#### Scenario: Switch while playing
- **WHEN** level A plays a new track and the user picks Full
- **THEN** the original keeps playing, the growing mark shows on the switch, and the level B code takes over at a bar boundary when the analysis ends

### Requirement: The stage and the code
The tab SHALL show the app's stage visual with the code over it, as the other players do, with the stage, look and code-over settings of the app. The visual SHALL react to the code's notes, also while the code tracks are muted.

#### Scenario: Muted code lights up
- **WHEN** the code tracks are muted and the code plays a kick on every beat
- **THEN** the kick tokens light up on the beats

### Requirement: The player bar
The player bar SHALL play the decoded track like a song: Play, Stop, the timeline, the time and the bar counter of the code. Previous and Next SHALL be disabled. Starting a song, a playlist or the radio SHALL stop the decoded track, and opening Decode SHALL not stop another player until the user presses Play there.

#### Scenario: Radio then Decode
- **WHEN** the radio plays and the user opens the Decode tab and presses Play
- **THEN** the radio stops and the decoded track plays

### Requirement: Phone width
At 400 px wide the tab SHALL show, in one column, the drop area or the track header, the level switch, the track list with mute and solo, the slider, and the stage with the code, with no horizontal scroll of the page.

#### Scenario: 400 px
- **WHEN** the tab is shown 400 px wide with level B playing
- **THEN** every control is reachable and the page does not scroll sideways
