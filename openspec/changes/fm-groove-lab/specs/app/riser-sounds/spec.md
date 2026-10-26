# Spec Delta

## Purpose

Phase 2 of the change, recommended as its own change (design D9): more riser sounds than the noise sweep, heard on their own in the Groove Lab, chosen in the radio console, and kept as patterns.

## ADDED Requirements

### Requirement: Riser sounds
A riser track SHALL have a sound: `noise` (the default, today's sweep), `fm-up` (a held note whose FM amount and level rise over the riser's bars) or `fm-down` (the same falling after the change). A song or a style without a riser sound SHALL play `noise`, so existing songs and the director's seed fixtures sound and compile as before.

#### Scenario: Old song
- **WHEN** a saved song with a riser and no riser sound plays
- **THEN** its riser compiles to the same code as before the change

#### Scenario: FM riser
- **WHEN** a riser track has sound `fm-up` and 4 bars
- **THEN** its FM amount is 0 at the riser's first bar and reaches its top on the last, its level rises with it, and its peak on the master stays below clipping

### Requirement: Riser menu in the radio console
The "Suono" menu of the console's riser row SHALL list every riser sound and the user's saved riser patterns. A riser command SHALL record the chosen sound and replay it.

#### Scenario: Pick an FM riser
- **WHEN** the user picks "Salita FM" in the menu and presses "+ Riser al prossimo cambio"
- **THEN** the riser before the next change plays the FM rise, and the queue line names it

### Requirement: Riser category in the Sounds tab
The Sounds tab SHALL show a "Riser" category with one card per riser sound, each playable on its own with the headphones button through the preview player, with a drawing of its sweep.

#### Scenario: Hear a riser
- **WHEN** the user presses the headphones of "Salita FM"
- **THEN** a 4-bar FM rise plays in a loop without changing what the player bar plays

### Requirement: Risers as patterns
The Patterns tab SHALL have a riser kind. A saved riser SHALL keep its sound, bars and direction, be in the backup, and be offered in the console's "Suono" menu.

#### Scenario: Save and pick
- **WHEN** the user saves "Salita FM" with 8 bars as a riser pattern named "Lunga"
- **THEN** "Lunga" shows among the Patterns tab's risers and in the console's "Suono" menu
