# Spec Delta

## Purpose

How the song model of a decoded track becomes Strudel code that is written over the original like a live coder, with the app's sounds, options and header, and how it becomes a normal song in Compose.

## ADDED Requirements

### Requirement: One writer for both levels
One writer SHALL turn the song model into code for both levels. The code SHALL set the tempo, then one line or block per part heard: drums by band, bass, chords, and other parts level B finds. A part never heard SHALL NOT be written.

#### Scenario: Drums and bass only
- **WHEN** the first 8 bars of a track hold a kick, a clap, closed hats and a bass line
- **THEN** the code holds the tempo, the three drum lines and the bass line, and no chord line

### Requirement: Written like the Live coder
The code SHALL look and type like the Live coder profile: short patterns, the human typist, lit notes, the code of the moment. It SHALL follow the original's arrangement, not the app's growth shapes.

#### Scenario: A full start
- **WHEN** the original starts with every part at once
- **THEN** the first lines appear within the first bars, several of them whole as if pasted

#### Scenario: Drums drop
- **WHEN** the original drops its drums for 8 bars and brings them back
- **THEN** the code mutes the drum lines with `_$:` for those bars and unmutes them when they return

### Requirement: Level A types reactively
In level A a change SHALL be typed when the model shows it, and SHALL take effect at the start of a bar. A drum pattern SHALL change only once it has held for one bar; a small difference of one or two steps SHALL hold for two bars before it is written.

#### Scenario: A fill
- **WHEN** the original plays a one-bar drum fill and returns to its pattern
- **THEN** the drum lines do not change for the fill

### Requirement: Level B types just before the change
In level B each change SHALL be typed before its bar and land on it, using the Live coder's written-part typing. A change that cannot be typed in time SHALL appear whole on its bar.

#### Scenario: A new section
- **WHEN** the chords change at the start of a section on bar 49
- **THEN** the chord line is typed during the bars before 49 and plays the new chords from bar 49

### Requirement: Sound presets
The tab SHALL offer two sound presets. "Our sounds" (default) SHALL let the generator choose drum kits, waves and filters by what level B or A measures (brightness, low-end weight, attack, level per part). "Simple kit" SHALL use one fixed set of sounds for every track. A preset SHALL change the code from the next bar.

#### Scenario: Simple kit
- **WHEN** the user picks "Simple kit"
- **THEN** every decoded track uses the same drum machine and the same bass and chord sounds

#### Scenario: Our sounds by measure
- **WHEN** level B measures a dark, heavy section and a bright one
- **THEN** with "Our sounds" the two sections use different filter settings or sounds

### Requirement: The existing code options
The code SHALL follow the existing Options (comments, technical functions, code view), with the Live coder's defaults, and SHALL add no new code setting. The tab SHALL show these options in a folded Options group. A change SHALL apply from the next code edit and be stored with the track.

#### Scenario: Compact code
- **WHEN** the user switches the code view to compact in the Decode Options
- **THEN** the decoded code is written compact, and the sound does not change

### Requirement: Header with attribution
The first line SHALL be the app's title line. With Attribution on (default), it SHALL name the original as a cover: `// coding-misk · cover of "<title>" by <artist>`, or without "by" when the artist is unknown. With Attribution off, it SHALL hold the title only. Edits to the title or artist SHALL update the line.

#### Scenario: Attribution on
- **WHEN** the title is "Night Run", the artist "Some Band" and Attribution is on
- **THEN** the first line reads `// coding-misk · cover of "Night Run" by Some Band`

#### Scenario: Attribution off
- **WHEN** Attribution is off
- **THEN** the first line reads `// coding-misk · Night Run`

### Requirement: Vocals placeholder
The code SHALL hold the comment line `// vox: …` after the parts, as a placeholder for the vocals. It SHALL never play.

#### Scenario: Placeholder
- **WHEN** a decoded track plays its code
- **THEN** the code shows `// vox: …` and no vocal sound plays from the code

### Requirement: Open in Compose
"Open in Compose" SHALL save the decoded code as a new v2 song of the user's, with the Live coder profile, its title and artist, its source marked as decoded, and no audio. If the track has no level B analysis yet, the button SHALL run it first, with the growing mark. The song SHALL play in Compose as it did in Decode and SHALL switch to Classic or Crescendo like any song.

#### Scenario: From level A
- **WHEN** the user presses "Open in Compose" while level A plays
- **THEN** level B runs, then Compose opens a new song with the decoded sections and tracks

#### Scenario: Switch profile
- **WHEN** the user picks Classic for the opened song in Compose
- **THEN** the song plays its decoded tracks in blocks like any Classic song

### Requirement: Follow the song
A decoded song SHALL grow with the Live coder growth value "Follow the song": no growth phase, the written song from bar 1, each line arriving just before the bar it first plays. This value SHALL be offered only for songs that come from Decode, and SHALL leave the growth of every other song unchanged.

#### Scenario: Other songs unchanged
- **WHEN** the Live coder fixtures are checked after this change
- **THEN** every built-in song grows as before
