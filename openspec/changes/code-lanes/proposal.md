## Why

Live coder code shows one line per part: section masks go to the hidden mixer and a line is edited in place when the section changes. This only works for Live coder with the code of the moment, only for `.mask(lane).velocity(lane)`, and not for clips. Crescendo and Classic songs, and gated guitars written as `.mask(sectionN).postgain(sectionN.mul(x))`, still show one line per section or clip and the section constants. The owner wants compact code for any song, including Classic songs.

## What Changes

- **New technical function option "Sections".** Section and clip lanes go to the hidden mixer and each part is one line, edited in place when its section or clip changes. It works with every profile and code view, including a Classic song with the Live build off.
- **More shapes.** Lanes written as `.mask(x).postgain(x.mul(n))` and clip lanes are lifted too.
- **Presets.** "Compact" includes Sections; "full" does not, so Classic songs stay identical until the owner picks another preset.
- **Same sound.** `check:mixer` covers the new option for every song, profile and step.

## Capabilities

### New Capabilities

- `live-build/code-lanes`: the Sections option for every profile, clips and gated lines.

### Modified Capabilities

None in `openspec/specs/`.

## Impact

- **Code:** `src/song/compile-compact.js` (liftLanes), `src/song/writer.js` (option, mixer), `src/live/live-code.js` and `src/live/air-code.js` (code views), `src/live/profiles.js` (fnLanes), i18n, Guide.
- **Checks:** `check:mixer` extended, `check-compact-code.cjs`, Classic and Crescendo fixtures unchanged with "full"; Live coder fixtures may move, with SHAPES_VERSION.
