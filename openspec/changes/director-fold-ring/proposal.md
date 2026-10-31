## Why

The owner listened to Fold and Ring (`fm-like-effects`, `#90`) on 31 October and likes them a lot (pr8). Today the radio director uses only Fold, mildly, on voices (`DIRECTOR_VERSION` 13); Ring is never drawn because it was on trial. The owner wants the director to use both freely, in a few good patterns with sensible ranges and combinations: with a phrase, with a held note and with an FM rise (the three listening modes of the FM lab), possibly per style or genre, and at a sensible rate.

## What Changes

- **Effect gestures in radio songs.** The director may place a small set of gestures built from Fold, Ring and the FM device on the tracks of a generated song, at phrase boundaries, like its other moves:
  - **Folded phrase:** Fold on a drum, bass or lead track for one or two phrases, then off.
  - **Fold rise into the drop:** Fold's amount steps up bar by bar over the last phrase before a drop and goes off at the drop.
  - **Ringing held note:** Ring on a pad, texture or held lead note for a section, at a frequency tied to the song's key.
  - **Metal hits:** Ring on the snare or a percussion track in a break.
  - **FM rise with fold:** a synth track's FM index climbs over the charge before a drop while the drums fold; both stop at the drop.
- **Ranges per track type** for Fold amount and curve, Ring frequency and amount, and the FM rise's top, inside the devices' limits and the level rules of `fm-like-effects`.
- **How often, per style:** each style recipe can say how many songs get gestures and which gestures it prefers; styles without the field get a default by genre family. At most two gestures per song, at most two Ring tracks at once.
- **Safety rules:** never Fold and Distortion on one track, never Ring on the busiest drum lines, no gesture on locked tracks or on tracks the listener added.
- **Ring loses "(trial)"** in the device row once the director uses it (open question 1).
- **Fixtures:** the seed fixtures move for the songs that draw a gesture; `DIRECTOR_VERSION` goes to 15 in the same commit, and a check proves the music is unchanged when gestures are turned off.

Not in scope: a per-track Ring worklet (a later engine change), new devices, Fold and Ring in Compose's New song panel, listener commands for gestures in the radio console.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `endless/director`: new requirements for effect gestures, their ranges, their rate per style and their limits.

## Impact

- `src/endless/director.js` (gestures, version 15 and its comment), `src/song/rack.js` (stepped Fold amount and the FM rise written by a device), `src/endless/recipe.js` and `styles/*.json` (an optional `gestures` field), `docs/STYLES.md`, `docs/ENDLESS.md`, `docs/knowledge/` (sound-and-levels, decisions), `src/guide.js` if the radio card names the effects.
- Checks: `npm run check:endless -- --write-fixtures` (fixtures rewritten), `check:styles`, `check:fm-effects`, `check:mixer`, `check:strudel`, `tools/check-fm-effects.cjs` and `tools/check-arrangement-levels.cjs` (levels and real-time cost), `check-radio.cjs`.
- Radio sessions saved before version 15 warn that they may sound different (existing `#38` behaviour).
