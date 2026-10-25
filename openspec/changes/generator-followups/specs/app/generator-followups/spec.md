## ADDED Requirements

### Requirement: Composed pads in the radio
A style's pad SHALL take part of its patterns from the generator, with a share set in the recipe, keeping the song's chords.

#### Scenario: A radio session
- **WHEN** a berlin techno session plays with the mixed source
- **THEN** some songs have composed pad chords and the others the style presets

### Requirement: FM sounds per style
Each style SHALL list the sound kinds that fit it; the generator SHALL pick FM sounds only from that list.

#### Scenario: A style without FM
- **WHEN** a style lists no FM kind
- **THEN** its composed parts use plain waves only
