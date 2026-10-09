# Proposal

## Why

Five features were built without an OpenSpec change: saving code written by hand as versions (#33), the settings page (#31), recording the radio (#30), the Genres tab (#43) and adding an instrument the song does not have (#41). Their behaviour is in the DEVLOG, the docs and the checks, but not in the specs. This change writes the specs after the fact, from the code as it is, so `openspec/specs` stays the full description of the app.

## What Changes

- No code changes: specs only, matching what is on `develop` and what the browser checks verify.
- #41 is written into the open `radio-steering` change, where the console's commands are specified.

## Capabilities

### New Capabilities

- `app/hand-versions`: saving the code written by hand as a new code song, linked to the original (#33).
- `app/settings`: the settings page, export format and the backup of everything (#31).
- `endless/radio-recording`: recording a radio session with its track list and recipe (#30).
- `app/genres`: the Genres tab of the Groove Lab (#43).

### Modified Capabilities

None in `openspec/specs`; #41 is an added requirement in `openspec/changes/radio-steering`.

## Impact

Specs only. Checks that already cover them: `tools/check-hand.cjs`, `tools/check-settings.cjs`, `tools/check-backup.mjs`, `tools/check-recording.cjs`, `tools/check-modes.cjs`, `npm run check:endless`.
