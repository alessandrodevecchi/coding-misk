# Spec Delta

## Purpose

The Styles tab shows how each style is made and lets the user change styles or create new ones without editing files.

## ADDED Requirements

### Requirement: Browse styles
The app SHALL have a Styles tab listing every style (built-in and the user's), each opening a readable sheet: tempo, keys, chord progressions with their chords, meters and swing, each instrument with presets, sounds and settings, energy shapes, song length, phrase length, track counts, voice base, and title words.

#### Scenario: Read a style
- **WHEN** the user opens Berlin techno
- **THEN** the sheet shows its tempo range, keys, progressions with chords, drum machines and grooves, instruments with presets and sounds, shapes and voice

### Requirement: Edit, create, duplicate
Built-in styles SHALL be read-only and offer "duplicate". The user's styles SHALL be editable with a form (ranges, chips for lists, menus for presets) and an advanced JSON view, validated as the user edits, with each error shown next to its field; an invalid style SHALL NOT be used by the radio until fixed. "New style" SHALL start from a template.

#### Scenario: Duplicate and edit
- **WHEN** the user duplicates synthwave, renames it and raises its tempo range
- **THEN** the new style appears in the list, in the radio's style chips, and the built-in synthwave is unchanged

#### Scenario: Invalid edit
- **WHEN** the user types a reversed tempo range
- **THEN** the form shows the error at the tempo field and the style is marked invalid

### Requirement: Keep and share styles
The user's styles SHALL be kept in the browser and SHALL be exportable and importable as JSON files in the recipe format.

#### Scenario: Export and import
- **WHEN** the user exports a style and imports the file in another browser
- **THEN** the style appears there with the same content
