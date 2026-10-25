## Why

When the listener steers a grown radio song, a chooser picks the order of the typed moves that lead to the new waypoint. The chooser written for the radio (radio-profiles D10) reaches a curve point later than the normal growth chooser: 605 bars against 540 over 75 curve points in 20 songs (shape-search D11). The radio now plays the normal chooser, and the old one stays in the code as `radio-1`. The owner wants to compare choosers by ear and to try new ones later without losing the old ones.

## What Changes

- **Chooser versions.** Each chooser on air has a fixed id and a name: `normal-1` "Normal v1 (current)", `radio-1` "Radio chooser v1 (previous on air)". A changed rule is a new version (`radio-2`, `normal-2`), never an edit of a played one.
- **Setting.** Settings, Advanced card: "Chooser on air" ("Scelta delle mosse in onda"), a select with every version and a hint in English and Italian. Default: Normal v1.
- **Replays.** A new radio session records the chooser in its recipe; a replay uses it.
- **Fallback.** A saved setting or a recipe that names a version no longer in the code uses the default.
- **Check 5.5.** Compares every version against the default and prints the bars of each.

## Capabilities

### New Capabilities

- `endless/radio-chooser-versions`: chooser versions on air, the setting, the recipe field, the fallback and the comparison check.

### Modified Capabilities

None in `openspec/specs/`.

## Impact

- **Sound:** none by default (Normal v1 plays today). A session played with another version sounds different when steered.
- **Code:** `src/endless/waypoints.js` (`AIR_CHOOSERS`, names), `src/endless/items.js` (chooser of a recipe), `src/radio/radio.js` (records the setting in a new recipe), `src/settings/settings.js`, `src/i18n.js`, `src/guide.js` (Advanced card line).
- **Checks:** `check:radio-profiles` (5.5 and the replay check), `tools/check-settings.cjs`, `check:guide`, `check:knowledge`. The radio fixtures do not move (their recipes have no commands).
- **Depends on:** shape-search D11 (growth marker 3, check 5.5 over versions).
