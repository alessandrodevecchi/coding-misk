## Why

On air the listener can add, remove, darken or brighten parts, but cannot ask for new notes: a melody that tires stays until the song ends (#24). "Add" and "More complex" pick another preset, so they bring back material heard in other songs. The curves move tracks and filters, not how parts are written. With `material-generator` the radio can compose: vary a part on request, compose new parts when the listener asks for more, and let the curves shape what is composed (`docs/VARIETY.md`).

## What Changes

- **New command "Vary".** It rewrites one part of the song on air from the next phrase: the lead melody by default; bass, arp or pad can be picked, like the types of Add and Remove. It is disabled, with the reason, when that part is not playing. The new part comes from `material-generator` with a seed derived from the command, in the song's key, progression and style.
- **Add and More complex compose.** A new track brought in by Add or by More complex gets material composed by `material-generator` instead of another preset.
- **Curves steer the generator.** When the radio composes during a part, the density curve sets how many notes a bar holds, energy sets the register, and complexity (the slider and More or Less complex) sets the range and rhythmic variety.
- **Growth shapes in the radio.** When the radio builds songs with a growth (`radio-profiles`), the song's growth shape applies, and a Vary shows as small edits of the notes.
- **Same session, same sound.** A session replays the same with the same commands. `DIRECTOR_VERSION` goes up because Add and More complex now compose. A radio session in a playlist warns when its director version differs from the app's.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `endless/steering` (change `radio-steering`): adds the Vary command; Add and More complex compose new material; curves and complexity steer composed material; growth shapes on air; replay and version rules for composed material.

## Impact

- **Code:** `src/endless/steering.js` (`COMMANDS`, a list of vary types, `whyNot` reason `not-playing`, `steerSong` for vary, add and more complex), `src/endless/director.js` (candidate tracks from the generator, `DIRECTOR_VERSION`), the generator inputs from curves (`src/endless/energy.js` targets), `src/radio/radio.js` (button, part picker, shortcut, queue label), `src/main.js` (playlist warning on a different version), `src/i18n.js`.
- **Depends on:** `material-generator`, `idea-model`; `growth-shapes` and `radio-profiles` for the live build view on air.
- **Checks:** `npm run check:endless` (fixtures, vary determinism), `node tools/check-steering.cjs`, `node --no-warnings tools/check-radio.cjs`, `node tools/check-playlists.cjs`, `npm run check:guide`.
- **Docs:** `docs/ENDLESS.md` (Steering table), Guide card, `DEVLOG.md`.
