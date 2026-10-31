# Spec Delta

## Purpose

The analysis that turns the audio of a decoded track into a song model, in two levels that share one analyser: level A while the track plays, level B over the whole file before it plays.

## ADDED Requirements

### Requirement: One song model
Both levels SHALL produce the same song model: tempo, bar length, the time of the first downbeat, bars in 4/4, the key, a chord per bar, a 16-step grid per drum band (kick, snare or clap, closed hat, open hat), the bass notes per step, a level per bar for each part, and sections. Level A SHALL fill the model bar by bar; level B SHALL fill it for the whole track.

#### Scenario: Same model shape
- **WHEN** level A has heard the first 16 bars of a track and level B has analysed the whole track
- **THEN** both models hold the same fields for bars 1 to 16, so the same writer turns either into code

### Requirement: Classical analysis only
The analysis SHALL use signal-processing methods (spectra, onsets, autocorrelation, pitch tracking, chroma, chord and key templates) and no machine-learning model. It SHALL run in the browser, with no server.

#### Scenario: Offline
- **WHEN** the network is off after the page and its analysis code have loaded
- **THEN** both levels analyse a file

### Requirement: Level A writes while it plays
With level A, Play SHALL start the file at once. The analysis SHALL follow the playhead and SHALL NOT block the page or the audio. The model SHALL be approximate: a drum pattern SHALL appear once it repeats, and a chord once a bar has been heard.

#### Scenario: Play at once
- **WHEN** the user opens a new file in level A and presses Play
- **THEN** the original is heard within half a second and code lines appear during the first bars

### Requirement: Look ahead
Level A SHALL offer a Look ahead option with the values Off, 2 seconds and 2 bars, default 2 bars. With look ahead on, the analysis SHALL read the audio that far ahead of the playhead, so a change is written before its bar and lands on it. With look ahead off, the analysis SHALL read only the audio already played, and a change SHALL reach the code 1 to 2 bars after it is heard.

#### Scenario: Two bars ahead
- **WHEN** look ahead is 2 bars and the original's drums stop at bar 33
- **THEN** the code mutes its drum lines on bar 33

#### Scenario: Off
- **WHEN** look ahead is Off and the drums stop at bar 33
- **THEN** the code mutes its drum lines on bar 34 or 35

### Requirement: Level B analyses first
With level B, the whole file SHALL be analysed before the code plays, away from the page's main thread, faster than real time, with the app's growing mark and a progress text. The user SHALL be able to cancel. The page SHALL stay usable while it runs.

#### Scenario: A 4-minute track
- **WHEN** the user picks level B for a new 4-minute track
- **THEN** the growing mark shows until the analysis is done, in less than the track's length, and then the track is ready to play

#### Scenario: Cancel
- **WHEN** the user cancels level B while it runs
- **THEN** the analysis stops, nothing is stored for level B, and level A stays available

### Requirement: Level B adds structure
Level B SHALL add to the model a global tempo and beat grid, sections with their bounds, variations of a part inside a section, and the ending. It SHALL choose sounds by measure (see code writing). Level B SHALL reuse level A's analyser for the per-bar data and add the whole-file steps on top.

#### Scenario: Sections
- **WHEN** level B analyses a track with an intro, two verses, a break and a final chorus
- **THEN** the model holds sections whose bounds fall within one bar of the changes in the original

### Requirement: Tempo always locks
The analysis SHALL always settle on a tempo, at least approximately. It SHALL keep the half and double tempo as candidates, and the tab SHALL let the user pick one of them. This change SHALL support a steady tempo in 4/4 only.

#### Scenario: Half tempo
- **WHEN** the analysis locks at 87 BPM on a track the user hears at 174 BPM
- **THEN** the user picks ×2 and the code is written at 174 BPM from the next bar

#### Scenario: No clear beat
- **WHEN** a track has no drums and a weak pulse
- **THEN** the tab still shows a tempo, marked as uncertain

### Requirement: Tap tempo
While the Decode tab is shown and no text field has focus, the space bar SHALL tap the tempo. Four taps or more SHALL set the tempo and the beat phase; the first tap of the series SHALL mark a downbeat. A tapped tempo SHALL replace the analysed one for the track and be stored with it.

#### Scenario: Four taps
- **WHEN** the user taps the space bar four times on the beat, starting on a downbeat
- **THEN** the tempo shows the tapped value and the code's bars start on the tapped downbeat

### Requirement: Stored analysis
A finished level B analysis and the level A model of the bars heard SHALL be stored with the track. Reopening a matching file SHALL reuse them. A change to the analysis code that changes results SHALL mark stored analyses as old and analyse again on the next open.

#### Scenario: Analysis version
- **WHEN** the analysis version goes up and the user reopens a stored track
- **THEN** the track is analysed again and the new result replaces the old one
