## ADDED Requirements

### Requirement: New built-in grooves
The built-in grooves SHALL include `technoPickup`, `technoRolling`, `technoBroken`, `trancePush`, `trancePickup`, `housePickup`, `houseRolling`, `drift`, `heartbeat`, `phonkRoll` and `phonkHalf`, each with a name in Italian and English, after the existing grooves.

#### Scenario: Shown in the Groove lab
- **WHEN** the listener opens Groove lab, Patterns, built-in grooves
- **THEN** the eleven new grooves show with their names, a step grid and the styles that use them, and each plays in a loop

### Requirement: Kick variety in style grooves
Every built-in style whose grooves play a kick SHALL list grooves with at least two different `bd` rows; acid, ambient, berlin-techno, industrial, phonk, progressive-house and trance SHALL list at least three. A groove added to a style SHALL play only drum rows the style's other grooves already play. Jazz SHALL keep grooves without a kick.

#### Scenario: Berlin techno grooves
- **WHEN** the berlin-techno recipe is read
- **THEN** its `drums.grooves` lists `techno`, `hard`, `rolling`, `technoPickup`, `technoRolling` and `technoBroken`, with four different kick rows

#### Scenario: Recipes stay valid
- **WHEN** `npm run check:styles` and `npm run check:kit-rows` run
- **THEN** every recipe is valid and every kit a style lists has a sample, or its nearest fallback, for every row of the style's grooves
