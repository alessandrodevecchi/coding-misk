# Spec Delta

## ADDED Requirements

### Requirement: A style grid per voice in the Voices tab
The Voices tab, section "Voices and sounds", SHALL show on each voice card a grid with one toggle per voice style. A toggle SHALL show whether the style is allowed for that voice in automatic draws. The style `clear` SHALL be shown allowed and SHALL NOT be changeable. A toggle that differs from the committed default SHALL carry a mark, and the card SHALL show a "Reset to defaults" button only while it has overrides. The default voice card SHALL edit the `default` entry of each language. Changing a toggle SHALL NOT restrict what the user may pick by hand.

#### Scenario: Turn a style off
- **WHEN** the user turns `robot` off on the Albert card
- **THEN** the toggle shows off and marked, the override is stored, and the Albert card shows "Reset to defaults"

#### Scenario: Reset
- **WHEN** the user presses "Reset to defaults" on the Albert card
- **THEN** Albert's override is removed, the toggles show the committed defaults, and other voices keep their overrides

#### Scenario: Clear is locked
- **WHEN** the user looks at the `clear` toggle
- **THEN** it is on and cannot be turned off

#### Scenario: English-only speaker in Italian
- **WHEN** the user edits Albert
- **THEN** the card edits `en.albert` and states that in Italian Alice speaks for Albert, so the Alice list also bounds Albert's draws (the intersection of `voice-combos`)

### Requirement: User overrides layer over the committed defaults
The app SHALL keep user overrides in the browser under `coding-misk-voice-combos` (format 1). The key SHALL hold only the speakers the user changed, each as a full allowed list per language, in the shape of `combos.json`. The effective table SHALL be the committed table with each overridden speaker entry replaced by the user's entry. A malformed override, an unknown speaker or an unknown style id SHALL be ignored when the table is built, never thrown. An override equal to the default SHALL be dropped.

#### Scenario: Effective table
- **WHEN** `combos.json` lists `clear` and `deep` for `en.albert` and the user allows `radio` too
- **THEN** the effective list for Albert is `clear`, `radio`, `deep`, in the order of the style ids

#### Scenario: Bad stored value
- **WHEN** the stored value has a style id that does not exist
- **THEN** that id is ignored and the rest is used, with no error shown

### Requirement: Draws and hints use the effective table
Automatic draws, the style picker hints and the bench status SHALL read the effective table. The check `check:voice-combos` SHALL keep validating the committed file alone.

#### Scenario: Radio draw with an override
- **WHEN** the user allows only `clear` and `deep` for Fred and the radio draws 300 seeds
- **THEN** no song has Fred with another character

### Requirement: Backup carries the overrides
The app backup SHALL include `coding-misk-voice-combos`. Importing SHALL merge per speaker per language, the backup's entry winning and other speakers staying, and SHALL ignore invalid parts of the backup value. The import summary SHALL count it under settings.

#### Scenario: Export and import
- **WHEN** the user exports a backup with an override for Kathy and imports it in an empty browser
- **THEN** Kathy shows the same toggles

#### Scenario: Merge
- **WHEN** the browser has overrides for Kathy and Fred and the backup has one for Kathy
- **THEN** Kathy takes the backup's list and Fred keeps its own

### Requirement: A radio session keeps the table it was drawn with
A radio session started while overrides exist SHALL record the effective table in its recipe (`combos`). Songs drawn for that session, on air, in Replay, in a shared link and in an export, SHALL use the recorded table, not the current overrides. A session started with no overrides SHALL record nothing and SHALL use the committed table. A recipe saved before this change SHALL use the committed table.

#### Scenario: Replay after a change
- **WHEN** a session was drawn with Fred limited to `clear`, and the user then allows every style for Fred and plays Replay
- **THEN** Replay gives the same songs as before

#### Scenario: New session
- **WHEN** the user starts a new radio session after the change
- **THEN** it draws with the new table and records it

### Requirement: The Guide explains the grid
The Guide SHALL have a card in English and Italian that says what the grid does, that it only bounds automatic draws, that choices by hand stay free, how to reset, and that the choice is kept in this browser and in the backup.

#### Scenario: Guide check
- **WHEN** `npm run check:guide` runs
- **THEN** the card exists in both languages and its `show` selector matches an element of the Voices tab

## OPTIONAL (deferred): Fallback when a drawn style is excluded
Not part of the shipping tasks. See design D8. If built, each voice SHALL have a fallback mode: same voice with another style (today), system voice with that style, nearest voice with that style, or any.
