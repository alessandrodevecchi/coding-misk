# Spec Delta

## Purpose

The Songs tab lets the user find a song quickly: by search, genre, style, kind, free tags and favourites, in one list with a chosen order.

## ADDED Requirements

### Requirement: Song tags
A song SHALL be able to carry tags of three kinds: genres from a fixed list (techno, trance, house, synthwave, drum and bass, industrial, rock, metal, hip hop, pop, jazz, country, ambient, experimental), styles given by style recipe id, and free tags (short lowercase words). The tags SHALL be optional; a song without tags SHALL stay valid. The validator SHALL reject a genre outside the list and SHALL warn about a style id that no known style has.

#### Scenario: Valid tags
- **WHEN** a song has genres `metal`, styles `melodic-metal` and free tag `full-track`
- **THEN** the song validates without errors

#### Scenario: Unknown genre
- **WHEN** a song lists genre `polka`
- **THEN** validation fails with an error at the path of that genre that names the allowed genres

### Requirement: Genres follow styles
The genres shown for a song SHALL be the genres of its styles plus the genres the song names itself, without duplicates. A style tag SHALL be shown with the style's current name in the interface language, so renaming a style renames the tag everywhere. Every style, built-in or the user's, SHALL be available as a style filter as soon as it exists.

#### Scenario: Genre from a style
- **WHEN** a song has style `phonk` and no genres of its own
- **THEN** the card and the genre filter treat it as hip hop

#### Scenario: Renamed user style
- **WHEN** the user renames their style "Night drive" to "Late drive"
- **THEN** songs tagged with that style show "Late drive" and the style filter lists "Late drive"

### Requirement: Kind label
Every song card SHALL show one kind label: standard (a composed song without build steps), live build (a composed song with build steps), generated (a song made by the director), mine (a song the user made or edited), or code (a hand-written code track). A generated song saved by the user SHALL keep the generated label and also be counted as mine.

#### Scenario: Generated and saved
- **WHEN** the user saves a radio song
- **THEN** its card shows the generated label and appears under both the generated and the mine filters

### Requirement: One list with search and filters
The Songs tab SHALL show all songs in one list, with a search bar and filter chips for genre, style and kind, and a "favourites only" switch. Search SHALL match, ignoring case and accents, the title, the style and genre names, the key and the free tags. Chips of the same group SHALL combine with OR; groups and search SHALL combine with AND. The list SHALL show how many songs match and offer a clear action when nothing matches.

#### Scenario: Search
- **WHEN** the user types "frigio"
- **THEN** only songs whose description or tags mention Phrygian, in either language shown, remain

#### Scenario: Combined filters
- **WHEN** the user picks genres techno and trance and kind live build
- **THEN** the list shows live build songs that are techno or trance

#### Scenario: Nothing matches
- **WHEN** the filters leave no song
- **THEN** the tab says so and offers to clear the filters

### Requirement: Favourites
Every card SHALL have a star that marks the song as a favourite. Favourites SHALL be kept in the browser by song id, SHALL survive reloads, and SHALL be usable as a filter.

#### Scenario: Mark a favourite
- **WHEN** the user stars Kellerlicht and reloads the page
- **THEN** Kellerlicht is still starred and appears with "favourites only" on

### Requirement: Sorting
The list SHALL be sortable by default order (as today), title, BPM and length.

#### Scenario: Sort by BPM
- **WHEN** the user sorts by BPM
- **THEN** songs appear from the slowest to the fastest, using each song's first tempo

### Requirement: Remembered view
Search text, filters, "favourites only" and sorting SHALL be remembered in the browser and restored when the tab opens again.

#### Scenario: Restore view
- **WHEN** the user filters by metal, switches to Radio and back
- **THEN** the Songs tab still shows only metal songs

### Requirement: Edit tags of own songs
The user SHALL be able to edit the genres, styles and free tags of their own songs from the card. Built-in songs SHALL keep their tags read-only.

#### Scenario: Add a free tag
- **WHEN** the user adds the free tag "reel" to their song
- **THEN** the card shows it and the search for "reel" finds the song

### Requirement: Built-in songs tagged
Every built-in song and code track SHALL have genres or styles, so that each appears under at least one genre filter.

#### Scenario: Every song has a genre
- **WHEN** the user picks every genre chip one at a time
- **THEN** every built-in song appears under at least one of them
