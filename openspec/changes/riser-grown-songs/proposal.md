## Why

The owner noted on 7 November that the console riser came in almost at the end of a long radio song that grows (Live coder or Crescendo). The riser looked for the next part change in the written form, but on air the growth takes the written form's place: a riser pressed on bar 30 of a song with a growth of 280 bars landed on bar 256. A riser is a gesture for the next moments, so it has to follow what plays.

The placement on the grown song shipped on 7 November (`15511b9`) without a spec and with a check on Live coder songs only. This change writes the rule into the steering spec and covers Crescendo songs too.

## What Changes

- **Inside a growth, the riser follows the grown song.** A riser pressed while a grown radio song is still in its growth goes on the grown song itself: it ends (up) or starts (down) on the first phrase start or growth step within two phrases of the press where its length fits, its first bar at least a bar and a half after the press. The wanted length comes first, else a shorter one (8, 4, 2).
- **Same replay.** The command records where it was placed, so a replay gives the same song; the director's view of the written form does not get it.
- **Outside the growth, as before.** After the growth, and on Classic songs, the riser still ends on the next part change of the form.
- **Tooltip.** The riser's tooltip says that during a growth it comes within two phrases.
- **Check.** `check:radio-profiles` also presses risers inside long Crescendo growths (bar 30 and half way).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `endless/steering`: the Riser row's placement on a grown song during its growth.

## Impact

- `src/endless/steering.js` (`riserAirTarget`, `riserAir`) and `src/endless/waypoints.js` (`airRiser`): already in `develop`.
- `src/i18n.js`: the riser tooltip in English and Italian.
- `tools/check-radio-profiles.mjs`: a Crescendo case next to the Live coder one.
- No fixture moves, no director or shapes version change.
