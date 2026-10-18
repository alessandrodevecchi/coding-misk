## ADDED Requirements

### Requirement: Material choice per instrument
A recipe instrument SHALL be able to say where its material comes from: presets only, generated parts only, or a mix with the share of generated parts from 0 to 1. It SHALL also be able to name the groove families, melody rules and sound kinds the generator can use for it. A recipe without a material choice SHALL use presets only. The validator SHALL reject an unknown source, family, rule or sound kind, and a share outside 0 to 1, with the JSON path.

#### Scenario: Mix
- **WHEN** a recipe's bass says material `mix` with share 0.5
- **THEN** over a long session about half of its songs have a generated bassline and the others a preset

#### Scenario: Unknown family
- **WHEN** a recipe's drums name the groove family `waltzstep`
- **THEN** validation fails at that entry and names the known families
