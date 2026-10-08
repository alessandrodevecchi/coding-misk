# Spec Delta

## Purpose

Style recipes describe a genre or mood as data, so the endless director can make songs in that style and several styles can be mixed into one session.

## ADDED Requirements

### Requirement: Recipe files
The system SHALL read style recipes from JSON files in `styles/`, one recipe per file, each with a unique `id` (lowercase letters, digits, hyphens) and a name in English and Italian. A recipe SHALL describe its parts with values the song format already accepts: tempo range, keys, chord progressions, meter and swing, drum machines and drum grooves, and for bass, arp, lead, pad, guitar and texture the allowed presets and sounds. It SHALL also give the allowed energy shapes, the song length range in minutes within 2 to 6, the phrase length in bars, the usual and soft maximum number of tracks, voice settings, and title words in English, Italian and Spanish.

#### Scenario: Recipe loaded
- **WHEN** `styles/berlin-techno.json` exists and is valid
- **THEN** the style `berlin-techno` is available to the director with its name in English and Italian

#### Scenario: Missing parts take defaults
- **WHEN** a recipe leaves out an optional part, such as guitar
- **THEN** songs made only from that recipe never get a track of that part, and the recipe is still valid

### Requirement: Recipe validation
The system SHALL validate a recipe and report every problem with its JSON path, as the song validator does. A recipe SHALL be rejected when a referenced preset, groove, chord progression, key, meter, drum machine or energy shape does not exist, when a range is empty or reversed, or when the song length is outside 2 to 6 minutes. Unknown sound names SHALL be reported as warnings, because sounds are loaded at run time.

#### Scenario: Unknown preset
- **WHEN** a recipe lists bass preset `wobbly`, which does not exist
- **THEN** validation fails with an error at the path of that entry that names the existing bass presets

#### Scenario: Reversed range
- **WHEN** a recipe sets tempo `[140, 120]`
- **THEN** validation fails with an error at `tempo`

### Requirement: Starting styles
The repository SHALL ship twelve valid recipes: Berlin techno, trance, synthwave, lo-fi, drum and bass, ambient, phonk, industrial, jazz, country, classic rock and melodic metal. Every sound a starting recipe names SHALL exist among the sounds the app loads, and every recipe SHALL respect the owner's taste rules recorded in `docs/CONTEXT.md` unless the genre needs otherwise (for example guitars in rock and metal).

#### Scenario: All starting styles valid
- **WHEN** the recipe check runs on `styles/`
- **THEN** twelve recipes pass without errors

#### Scenario: Sounds exist
- **WHEN** the app has loaded its sounds
- **THEN** every sound named by a starting recipe is present in the loaded sound map

### Requirement: Mixing styles with chaos
The system SHALL accept one or more styles and a chaos amount from 0 to 1. The parts that can come from different styles SHALL be tempo, drums, bass, harmony (keys, chords, meter, swing), lead (arp and hook), pads and texture, and voice. With chaos 0 every song SHALL take all its parts from one style, and consecutive songs SHALL rotate through the selected styles. With chaos 1 each part of a song SHALL be drawn independently from the selected styles. In between, a song SHALL have one dominant style and the chance that a part comes from another selected style SHALL grow with chaos. When parts come from different styles, the song tempo SHALL fall within the tempo range of the style that provides the tempo part.

#### Scenario: One style, any chaos
- **WHEN** only `jazz` is selected
- **THEN** every part of every song comes from `jazz`

#### Scenario: Chaos zero rotates styles
- **WHEN** `synthwave` and `country` are selected with chaos 0
- **THEN** each song takes all its parts from one of them, and two consecutive songs do not use the same style unless only one is selected

#### Scenario: Chaos one mixes parts
- **WHEN** `synthwave`, `jazz` and `country` are selected with chaos 1 over a long session
- **THEN** some songs have parts from at least two different styles, and the session report shows which style gave each part
