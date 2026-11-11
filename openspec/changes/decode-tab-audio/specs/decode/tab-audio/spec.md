# Spec Delta

## Purpose

Decode on the sound of another browser tab: how the user starts and stops it, what the browser is asked for, how level A and level B work on a stream the app cannot seek or pause, what is stored and exported, and how the track gets a name.

## ADDED Requirements

### Requirement: Listen to another tab
The Decode tab SHALL offer "Listen to another tab" (it: "Ascolta un'altra scheda") in the "Another file" panel and in the empty tab. A press SHALL first show the permission panel. The browser's picker SHALL open only from that panel.

#### Scenario: The button
- **WHEN** the user opens the "Another file" panel in Chrome on a computer
- **THEN** "Listen to another tab" is next to "Choose a file…"

### Requirement: The permission panel
The panel SHALL say: pick the tab that plays the music and keep its sound shared; the app hears only that tab's sound, does not see the page and never stores the sound; Stop here or the browser's Stop sharing ends it. Its "Choose the tab" button SHALL open the browser's picker on that click. "Cancel" SHALL close the panel and do nothing else.

#### Scenario: First use
- **WHEN** the user presses "Listen to another tab" for the first time
- **THEN** the panel explains what will happen, and the browser's picker opens only after "Choose the tab"

#### Scenario: Cancelled in the picker
- **WHEN** the user closes the browser's picker without choosing
- **THEN** nothing changes in Decode and no message is shown

### Requirement: A tab's sound only
The app SHALL ask the browser for a tab with its sound: audio processing (echo cancellation, noise suppression, gain control) off, two channels, no whole screen and no system audio. It SHALL stop the picture's track as soon as the stream arrives and SHALL NOT keep or draw the other tab's picture.

#### Scenario: The sound as played
- **WHEN** the user shares a tab with music
- **THEN** the captured sound is stereo with no audio processing, and no picture of the other tab is shown or kept

#### Scenario: Sharing without sound
- **WHEN** the user shares a tab with "Share tab audio" turned off
- **THEN** the stream is stopped and a message says to choose the tab again and keep its sound shared

### Requirement: Browsers without tab audio
In browsers that give no sound for a shared tab (Firefox, Safari, phones), the button SHALL be disabled with the reason "Needs Chrome or Edge on a computer". At phone width it SHALL be hidden.

#### Scenario: Safari
- **WHEN** Decode opens in Safari
- **THEN** "Listen to another tab" is disabled and its tooltip gives the reason

### Requirement: The captured sound plays as the Original
The other tab's own sound SHALL be muted while it is shared. The captured sound SHALL play through Decode's mix as the Original track, so mute, solo, the Original ↔ Code slider and the volume work as with a file. The code SHALL be scheduled on the beat grid found in the captured sound, on the same clock as the Original track, so a code hit lands within 10 ms of the captured beat.

#### Scenario: Slider
- **WHEN** the user moves the slider to Code while a tab is shared
- **THEN** the other tab's music gets quieter in the mix and the code louder, as with a file

### Requirement: Level A on a stream
Level A SHALL analyse the captured sound as it arrives. With Look ahead Off (the default for a tab), a change SHALL reach the code 1 to 2 bars after it is heard. Another Look ahead value SHALL hold the Original track back by that amount, and the panel SHALL say that the sound plays that much later than the other tab's picture.

#### Scenario: Drums stop
- **WHEN** Look ahead is Off and the drums of the shared music stop on a bar
- **THEN** the code mutes its drum lines 1 or 2 bars later

#### Scenario: Look ahead as a delay
- **WHEN** the user picks 2 bars of look ahead while a tab is shared
- **THEN** the Original track plays 2 bars later than before, and a drum stop is muted in the code on its bar

### Requirement: The other tab is not controlled
The app SHALL NOT try to play, pause or seek the other tab. A silence of 2 s SHALL pause the code, with "Paused in the other tab" on the track row; when the sound comes back, level A SHALL lock the tempo and the downbeat again. A jump in the music SHALL start a new section in the code after level A locks again. When the browser ends the share (the other tab closed, or the browser's Stop sharing), the session SHALL end as with Stop.

#### Scenario: Pause in the other tab
- **WHEN** the user pauses the music in the other tab for 5 s and plays it again
- **THEN** the code pauses within about 2 s and starts again on the beat after the music comes back

#### Scenario: The other tab is closed
- **WHEN** the other tab is closed while it is shared
- **THEN** Decode stops listening at once and offers Full on what was heard

### Requirement: A silent share
When a shared tab gives no sound for 10 s from the start, the track row SHALL say "This tab gives no sound to share. Some players protect their sound." and offer Stop. It SHALL name no player.

#### Scenario: A protected player
- **WHEN** the shared tab's player gives the capture only silence
- **THEN** after 10 s the message shows and nothing is written to the code

### Requirement: Full on what was heard
While a tab is shared, the app SHALL keep the mono analysis copy of the sound in memory, at most the last 10 minutes. Full SHALL be offered on Stop and, during listening, once 30 s have been heard. It SHALL run the existing level B on that recording, away from the main thread, with the growing mark and Cancel. The result SHALL play with the recording as the Original, with seek, until the user leaves the track. The recording SHALL NOT be written to storage, and leaving the track SHALL free it.

#### Scenario: Full after Stop
- **WHEN** the user listens to 4 minutes of a tab and presses Stop, then Full
- **THEN** level B analyses the 4 minutes, and the decoded song plays from the start with the recorded sound, without the other tab

#### Scenario: A long session
- **WHEN** a tab has been shared for 14 minutes
- **THEN** Full covers the last 10 minutes, and the row says so

### Requirement: Nothing captured is stored
The captured sound SHALL NOT be stored in IndexedDB, local storage, the cache or the backup. The analysis of a tab SHALL be stored only when the user presses "Save analysis" and gives a name. It SHALL be stored as a record of kind "tab", with the name, the date and the model, and with no audio and no fingerprint. The library SHALL list it with a tab icon. It SHALL open as code only, with Open in Compose.

#### Scenario: Leave without saving
- **WHEN** the user listens to a tab, runs Full and opens another file
- **THEN** nothing of that session is left in the browser's storage

#### Scenario: Saved analysis
- **WHEN** the user saves the analysis as "Night drive"
- **THEN** the library lists "Night drive" with a tab icon, and opening it shows the code and offers Open in Compose, with no Original track

### Requirement: The name is typed
The app SHALL NOT read a title from the other tab. The track SHALL be called "Tab · HH:MM" (it: "Scheda · HH:MM", the start time) until the user types a title and, optionally, an artist. The Attribution header and the rights line SHALL use what was typed. With no typed title, the rights line SHALL be the one for Attribution off.

#### Scenario: Attribution with a typed title
- **WHEN** the user types "Night Run" by "Some Band" and exports with Attribution on
- **THEN** the code header and the rights line name "Night Run" by "Some Band"

### Requirement: Exports of a tab session
Exports SHALL hold the code only by default. An export with the captured sound SHALL be possible only during the session, from the recording in memory, after a one-time confirmation per session that says the export holds the other tab's music, that it is for the user's own listening, and that the recording belongs to its rights holders. Its texts for sharing SHALL carry the rights line as for files. Fragments and videos SHALL follow the same rules.

#### Scenario: Default export
- **WHEN** the user exports a video of a tab session without changing anything
- **THEN** the video holds the code's sound only

#### Scenario: With the captured sound
- **WHEN** the user turns on the captured sound for an export and confirms
- **THEN** the file holds the recorded music mixed as in the Decode mix, and its texts carry the rights line
