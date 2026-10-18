## MODIFIED Requirements

### Requirement: Hybrid material with controlled mutation
Tracks SHALL start from presets, grooves and chord progressions named by the recipes, from parts composed by the material generator, or from varied presets, as each recipe instrument's material choice asks. The director SHALL derive variations from them by mutation (adding or removing drum hits, changing the order of chord tones for bass and arp, changing scale degrees of a hook) or by composing a variation at a higher or lower energy, and the amount of variation SHALL grow with complexity. Generated parts SHALL use the target energy of the phrases they first play in. Mutated and generated material SHALL stay within the song's key and chords.

#### Scenario: Low complexity stays close
- **WHEN** a song is generated with complexity 0
- **THEN** its patterns are the recipe presets without mutation and without generated parts

#### Scenario: Mutations stay in key
- **WHEN** a song is generated with complexity 1
- **THEN** every bass and arp note is a chord tone and every hook note is a degree of the song's scale

#### Scenario: Generated parts in a session
- **WHEN** a session of ten songs is generated from a recipe whose lead asks for generated material, with complexity 0.5
- **THEN** most songs have a lead pattern that is not a preset, and no two songs have the same lead pattern
