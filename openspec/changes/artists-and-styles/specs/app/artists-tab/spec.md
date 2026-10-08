# Spec Delta

## Purpose

The Artists tab presents the artists like characters, and lets the user shape their taste or create new ones.

## ADDED Requirements

### Requirement: Browse artists
The app SHALL have an Artists tab with a card per artist (portrait, stage name, a line of bio, favourite styles) and a character sheet for each, showing the taste as readable stats (ranges as bars, favourite styles with weights, shapes, pace, moves, voice, quirks with their chance).

#### Scenario: Character sheet
- **WHEN** the user opens the Avicii-inspired artist
- **THEN** the sheet shows portrait, name, bio, "inspired by", progressive house as favourite style, and the rest of the taste as stats

### Requirement: Edit, create, duplicate artists
Built-in artists SHALL be read-only with "duplicate". The user's artists SHALL be editable with a form and an advanced JSON view, validated as the user edits; the portrait SHALL be changeable (new seed, palette). The user's artists SHALL be kept in the browser and exportable and importable as JSON.

#### Scenario: New artist
- **WHEN** the user creates an artist, names it, picks two favourite styles and a quirk
- **THEN** it appears in the Artists tab and in the radio's artist picker
