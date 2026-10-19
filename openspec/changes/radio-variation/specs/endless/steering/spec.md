## ADDED Requirements

### Requirement: Vary a part
The console SHALL offer a "Vary" command with a part to vary: lead (the melody), bass, arp or pad, the lead by default. At the next phrase boundary the varied part SHALL play new material composed for it, in the song's key, progression and style, with the same role and instrument, for the rest of the song or until a later command changes it. The new material SHALL differ from what the part played before. The command SHALL have a keyboard shortcut shown in its tooltip.

#### Scenario: Vary the lead
- **WHEN** the lead melody plays and the user presses "Vary"
- **THEN** from the next phrase the lead plays a new melody with the same sound, in the song's key

#### Scenario: Vary the bass
- **WHEN** the user picks bass and presses "Vary"
- **THEN** from the next phrase the bass plays a new line and the other parts do not change

### Requirement: Vary only what plays
"Vary" SHALL be disabled when no track of the chosen part plays at the bar where it would apply, and its tooltip SHALL say why. It SHALL also be disabled, saying why, when every track of that part is locked in the mixer.

#### Scenario: No arp playing
- **WHEN** the user picks arp and no arp plays
- **THEN** "Vary" is disabled with the reason "no arp is playing"

### Requirement: Vary in the queue and the code
A Vary SHALL be queued and cancellable like the other commands. Two Vary commands on the same part for the same boundary SHALL count as one. The step in the code SHALL carry a comment marking it as the listener's.

#### Scenario: Cancel a vary
- **WHEN** the user queues "Vary" and cancels it before its bar
- **THEN** the part keeps its notes

### Requirement: Add and More complex compose
When "Add" brings in a track the song has no material for, or "More complex" brings in a new track, the track SHALL play material composed for the song by the generator, in the song's key, progression and style, instead of a preset.

#### Scenario: New pad
- **WHEN** a song has no pad and the user presses "+ pad"
- **THEN** a pad with chords composed for this song starts at the next phrase

### Requirement: Curves steer composed material
Material composed on air (by Vary, Add or More complex) SHALL follow the targets of the part where it starts: the density target SHALL set how many notes a bar holds, the energy target SHALL set the register, and the session complexity SHALL set the range and the rhythmic variety. Automatic targets SHALL count as targets.

#### Scenario: Low density
- **WHEN** the user drags the density of the next part to 0.2 and then varies the lead
- **THEN** the new lead holds fewer notes per bar than a vary of the same lead with density 0.8

#### Scenario: More complex session
- **WHEN** the session complexity is raised and the bass is varied
- **THEN** the new bass line uses more different notes or rhythms than at low complexity

### Requirement: Growth shapes on air
When the radio builds the song on air with a growth (`radio-profiles`), the song's growth shape SHALL apply as in Compose, and a Vary SHALL reach the new part through small edits of the notes. Until then the radio SHALL build in blocks as today and a Vary SHALL switch the part in one step.

#### Scenario: Radio in blocks
- **WHEN** the radio builds in blocks and the user varies the lead
- **THEN** the lead line changes in one step at the boundary

### Requirement: Composed material replays the same
Composed material SHALL be seeded by the song and the command (its index among the song's commands), so cancelling a command or replaying a session with the same commands SHALL give the same notes. A session saved in a playlist SHALL store each Vary with its part and bar.

#### Scenario: Replay
- **WHEN** a session with two Vary commands is replayed from a playlist
- **THEN** the varied parts play the same notes as when the session was heard

### Requirement: Material source in the setup
The radio's compilation setup and the radio settings SHALL offer the material source of `material-generator` (patterns, varied patterns, composed, mix; default mix). The choice SHALL be saved with the session (the console also shows it, see "Material source in the console").

#### Scenario: A session with patterns only
- **WHEN** the owner sets the source to "patterns" in the compilation setup and starts the radio
- **THEN** the songs use library patterns as written, and the saved session replays the same

### Requirement: Director version
Because Add and More complex compose, the director version SHALL be raised in the same change. A radio session in a playlist SHALL warn that it may sound different when its director version differs from the app's, older or newer; a frozen session SHALL not warn.

#### Scenario: Old session
- **WHEN** a playlist holds a session saved before this change
- **THEN** its item shows "may sound different" and offers Freeze

### Requirement: Swap a part
The console SHALL have a Swap command next to Vary. Swap SHALL replace the chosen part, from the next phrase, with another ready part of the library (a preset or a saved pattern) that fits the song's style and key, and SHALL never compose. Vary SHALL always compose, whatever the material source.

#### Scenario: Vary with the patterns source
- **WHEN** the material source is patterns and the listener presses Vary on the lead
- **THEN** the lead gets a newly composed melody from the next phrase

#### Scenario: Swap
- **WHEN** the listener presses Swap on the bass
- **THEN** the bass plays another ready bassline from the next phrase, never a composed one

### Requirement: Pad vary keeps the progression
A vary of the pad SHALL keep the song's chords and change only its rhythm, register and voicing.

#### Scenario: Pad
- **WHEN** the listener varies the pad
- **THEN** the pad plays the same chords with a new rhythm or voicing

### Requirement: Material source in the console
The radio console SHALL show the material source (patterns, varied, composed, mix) next to the complexity control. A change SHALL apply from the next song and SHALL be recorded with the session for replays. Settings → Radio SHALL keep only the default for new sessions.

#### Scenario: Change on air
- **WHEN** the listener switches the source from mix to patterns during a song
- **THEN** the current song plays on unchanged and the next song uses ready parts only

