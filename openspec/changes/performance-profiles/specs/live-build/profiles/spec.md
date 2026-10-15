## ADDED Requirements

### Requirement: Performance profiles
The app SHALL offer performance profiles, each a named set of the controls that decide how a song builds and looks while it plays: build style, growth rules, typing speed, code view, generator, comments and note highlights. It SHALL include Classic, Crescendo and Switch.

#### Scenario: Choose Switch
- **WHEN** the user picks the Switch profile in Compose
- **THEN** the song grows with the Switch rules, in the code of the moment with short patterns, essential comments and highlighted notes

### Requirement: Classic and Crescendo unchanged
The Classic and Crescendo profiles SHALL give the same steps and the same code as the live build in blocks and Crescendo did before profiles.

#### Scenario: Same Crescendo
- **WHEN** a test song plays with the Crescendo profile
- **THEN** its steps and code at every bar equal those of Crescendo before profiles

### Requirement: Adjust a profile
Changing one control SHALL keep the others of the profile and mark the profile as custom, based on it. Going back to the profile SHALL drop the changes.

#### Scenario: Faster typing
- **WHEN** the user picks Switch and sets the typing to fast
- **THEN** the profile shows as custom (Switch) and every other control stays as in Switch

### Requirement: Profile of a style or a song
A style or a song MAY name its profile; a song opens with its own profile, else with its style's, else with the Compose choice. Switch styles SHALL name the Switch profile. A song's old `buildStyle` SHALL count as Classic or Crescendo.

#### Scenario: Switch song
- **WHEN** the user opens a song made from a Switch style
- **THEN** it plays with the Switch profile

### Requirement: Code comments
Comments SHALL have a title switch (on by default) and a level: all, essential (track headers only) or none. A track header SHALL appear when its track first comes in and stay afterwards, also when its block is empty. With none, a blank line SHALL separate the code blocks.

#### Scenario: Essential comments
- **WHEN** the level is essential
- **THEN** the code shows the title, the track headers and the code, without section or pattern comments

#### Scenario: Header stays
- **WHEN** a track leaves during a break
- **THEN** its header stays in the code

### Requirement: Note highlights
When highlights are on, the code shown in videos and in the live picture SHALL light up the notes of the parts that sound, in time with the music.

#### Scenario: Pause
- **WHEN** no step changes the code for some bars
- **THEN** the code still shows the playing notes lighting up
