# Spec Delta

## Purpose

Genres are visible as a whole in the Groove Lab, not only as tags.

## ADDED Requirements

### Requirement: Genres tab
The Groove Lab SHALL have a Genres tab with one card per genre that has styles or songs. A card SHALL show the genre's styles (from each style's genre), how many songs of the library carry the genre, and the artists whose favourite styles belong to it.

#### Scenario: Genre card
- **WHEN** the user opens Genres
- **THEN** the Hip hop card lists Lo-fi and Phonk and counts the songs tagged with them

### Requirement: Actions of a genre
A genre card SHALL offer to listen to the genre in the radio (the radio starts in the genre's styles, without an artist), to see its songs (the Songs tab filtered on the genre), and to open one of its styles (the Styles tab on that style).

#### Scenario: Listen to a genre
- **WHEN** the user presses "Listen in the radio" on Trance
- **THEN** the radio tab opens and plays songs in the Trance style
