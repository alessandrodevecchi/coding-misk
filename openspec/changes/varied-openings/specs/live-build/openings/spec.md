## Purpose

Openings decide the first sound of a live build. They let a song open the way its genre usually opens, in the Crescendo and Live coder profiles, instead of almost always on one kick.

## ADDED Requirements

### Requirement: Opening ids
The opening of a growth shape SHALL be one of: slow, full-kick, typed, broken, filtered, melodic, pad, voice, muted-base, mid-set, bass, chord, top. The first ten SHALL keep their current meaning. The song validator and the recipe validator SHALL accept the new ids and reject unknown ones with the list of valid ids.

#### Scenario: Unknown opening
- **WHEN** a song names `growthShape.opening` `"organ"`
- **THEN** validation fails at `growthShape.opening` and names the valid openings

### Requirement: New openings
`bass` SHALL put the bass track first. `chord` SHALL put a part that plays chords first: a pad with a rhythmic preset, keys, or a guitar. `top` SHALL put the drums first without the kick (hats, ride or clap rows), and the kick SHALL enter later.

#### Scenario: Bass opening
- **WHEN** a Live coder song with a bass track draws the opening `bass`
- **THEN** the first sounding line of its build is the bass, and no drum line sounds before it

#### Scenario: Top opening
- **WHEN** a song whose drums play a kick and a ride draws the opening `top`
- **THEN** the first sounding line plays the ride without the kick, and the kick enters in a later step

### Requirement: Impossible new openings
An opening that a song cannot play SHALL be left out before the draw. `bass` SHALL need a bass track in the destination of the growth, `chord` SHALL need a pad or a guitar track there, and `top` SHALL need a drum track with a row other than the kick that plays at least four hits per bar.

#### Scenario: No bass to open with
- **WHEN** a song has no bass track and its style gives `bass` a weight
- **THEN** `bass` is never drawn for that song, and the other weighted openings are drawn instead

### Requirement: Lead track without a shape
When a live build has no growth shape (the Crescendo profile), its first track SHALL be drawn from the style's opening weights, using only the lead openings: slow, full-kick, filtered and broken (the drums with the kick), and melodic, pad, bass, chord and top. A song that names a lead opening in `growthShape.opening` SHALL lead with it. Without style weights, the default weights SHALL apply.

#### Scenario: Ambient in Crescendo
- **WHEN** an ambient radio song plays with the Crescendo profile
- **THEN** its first track is a pad or another non-drum track in most songs, as the ambient weights say

#### Scenario: Live-coder-only openings skipped
- **WHEN** a style weighs `typed` and `muted-base` and a song of it plays with the Crescendo profile
- **THEN** its lead track comes from the other weighted openings only

### Requirement: Compose opening control in Crescendo
The Compose «Opening» control SHALL steer the first track of a Crescendo build as it steers a Live coder build. With the Crescendo profile the control SHALL list Auto and the lead openings only. A chosen lead opening SHALL win over the song's `growthShape.opening` and the style weights; Auto SHALL leave the draw to the song, the style and the seed. Pace and Development SHALL stay Live coder only.

#### Scenario: Crescendo with a chosen opening
- **WHEN** the user picks the opening `bass` in Compose and plays a song with a bass track in the Crescendo profile
- **THEN** the build opens on the bass

#### Scenario: Live-coder-only opening kept from before
- **WHEN** the control holds `typed` from a Live coder session and the user switches the song to Crescendo
- **THEN** the Crescendo build treats it as Auto, and the control shows Auto

### Requirement: Classic unchanged
The Classic profile SHALL NOT change.

#### Scenario: Classic build
- **WHEN** a built-in song plays with the Classic profile
- **THEN** its steps, bars, code and comments equal those before this change

### Requirement: Lead track for openings without one
In the Live coder profile the openings typed, muted-base and mid-set SHALL draw their first track from the style's lead weights, as the Crescendo profile does, instead of always taking the drums first.

#### Scenario: Muted base on keys
- **WHEN** a lo-fi song draws `muted-base` and its lead draw gives `chord`
- **THEN** the unmuted line of the written base is the keys or the pad, not the drums

### Requirement: Kick starts
When a build opens on the kick with the slow opening, or the Crescendo profile leads with the drums, the first kick form SHALL be drawn from the kick starts with the style's weights, else the default weights, and SHALL grow from there to the written kick. The starts: `one` (first kick, as today), `pair` (first two written kicks), `two` (beats 1 and 3), `four` (every beat), `push` (beats 1 and 4), `off` (beat 3).

#### Scenario: House kick start
- **WHEN** a house song opens slow and draws the kick start `four`
- **THEN** its first sounding line plays four kicks per bar, and the kick grows to the written groove from there

#### Scenario: Broken kick with pair
- **WHEN** a drum and bass song with a kick on the first and the eleventh sixteenth draws `pair`
- **THEN** its first sounding line plays those two kicks

### Requirement: Kick starts outside the groove
A kick start whose hits the written kick does not play SHALL be playable only when the style weights it explicitly. With the default weights it SHALL be left out. `one` SHALL be the fallback.

#### Scenario: Kick start the groove cannot play
- **WHEN** a song without style kick weights has a groove with no kick on beat three
- **THEN** `off` is never drawn for it

### Requirement: Default opening weights
When neither the song, the artist nor the style weights an opening, the draw SHALL use these default weights: slow 1, full-kick 1, typed 1, broken 1, filtered 1, melodic 1, pad 1, voice 0.5, muted-base 1, mid-set 1, bass 1, chord 1, top 1. The default kick-start weights SHALL be one 2, pair 1, two 1, four 1, push 1, off 0.5.

#### Scenario: Slow is not favoured
- **WHEN** many songs without style or song weights draw their opening
- **THEN** slow is drawn about as often as full-kick, not twice as often

### Requirement: Same opening every time
The lead track and the kick start SHALL be drawn from the song's seed, in streams of their own, so the same song with the same style and version opens the same way every time, in the app and in the Node checks.

#### Scenario: Replayed radio song
- **WHEN** the same radio song is grown twice with the same seed and the same versions
- **THEN** both builds open with the same line

### Requirement: Versions
A change to the openings, the lead draw or the kick starts SHALL raise `CRESCENDO_VERSION` when it moves Crescendo builds and `SHAPES_VERSION` when it moves Live coder builds. A grown build stored with an older version SHALL be grown again with the current rules.

#### Scenario: Stored growth of an older version
- **WHEN** a song's stored growth was made with `SHAPES_VERSION` 8 and the app runs version 9
- **THEN** the app grows the song again, and the new build may open differently

### Requirement: Opening probe
An opening probe SHALL grow at least 24 songs per built-in style with the Crescendo and Live coder profiles, report the first sounding line of each, and compare the result with the distribution targets.

#### Scenario: Probe after the change
- **WHEN** the opening probe runs on the built-in styles after this change
- **THEN** it reports every target as met, or names the style and the target it misses

### Requirement: Opening distribution targets
In each profile, no exact first line SHALL exceed 12% of the songs. The kick-led share of each style SHALL be within 15 points of the share its weights give. The kick-led share over all styles SHALL be at most 60% in Crescendo and at most 55% in Live coder. Among the kick-led openings of a style with more than one weighted kick start, no single kick pattern SHALL exceed 70%.

#### Scenario: One line dominates
- **WHEN** one exact first line opens 15% of the Crescendo songs of the probe
- **THEN** the probe check fails and names that line
