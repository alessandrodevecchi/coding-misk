# Spec Delta

## Purpose

Small random tools for variety: artists, styles, genres, knobs and instruments drawn at random, kept or thrown away.

## ADDED Requirements

### Requirement: Random artist
The app SHALL make a random artist from existing parts (name, portrait, bio, favourite styles, knob ranges, shapes, moves, quirks, transitions) that passes the artist validation. The listener SHALL be able to keep it (it joins their artists and can be edited), draw another, or discard it.

#### Scenario: Keep
- **WHEN** the listener presses Random artist in the Artists tab and then Keep
- **THEN** the artist appears among their artists and the radio can play it

### Requirement: Random styles, genres and knobs
The radio SHALL offer dice that pick random existing styles or a random genre, a die per knob and a die for all knobs; a switch SHALL choose between the full range and a sensible range. The Styles and Genres tabs SHALL offer playing a random one.

#### Scenario: All knobs in range
- **WHEN** the switch is on "in range" and the listener presses the die for all knobs
- **THEN** each knob gets a value inside its sensible range

### Requirement: Random sounds
The radio SHALL offer a die that draws new instruments and drum kits within the same styles, applied from the next song.

#### Scenario: Fresh sounds
- **WHEN** the listener presses the sounds die
- **THEN** the next song uses other instruments allowed by its styles

### Requirement: Seeds
Every random result SHALL come from a seed shown in its tooltip; the same seed SHALL give the same result.

#### Scenario: Same seed
- **WHEN** a random artist is made twice from the same seed
- **THEN** both are identical
