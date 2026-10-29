## Why

In the radio, an arrangement command given with "The whole session" can miss the next song while that song still grows away from the page (#86). The choice reaches the song: the song is planned again with it and grows again. When that growth is ready, the window the player holds is not replaced. The player keeps the next song as it was before the choice, until that song is already on air. Later songs are planned after the choice and get it.

## What Changes

- **The song being prepared takes the choice.** When a whole-session choice makes the next song grow again, the radio swaps the window on air once that growth is ready, as it already does for a song steered again.
- **Check.** `tools/check-steering.cjs` gives a "+" for the session while the next Live coder song still grows. It checks that the window on air then holds that song with the choice, and that the song plays the added track.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `endless/steering`: a whole-session choice reaches the song being prepared.

## Impact

- **Code:** `src/radio/radio.js`: `grow` takes a callback for when the growth is ready; the songs planned again for the session swap the window then.
- **Checks:** `check-steering.cjs` with the new case; `check-radio.cjs`, `check:endless`, `check:radio-profiles`, `check:code`, `check:guide`, `check:knowledge`.
- **Director:** no change. `DIRECTOR_VERSION` and the fixtures stay.
