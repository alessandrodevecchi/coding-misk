## 1. Placement (done in `15511b9`, 7 November)

- [x] 1.1 `riserAirTarget` and `riserAir` in `src/endless/steering.js`: the bars on the grown song within two phrases of the press, the riser track brought in and taken back.
- [x] 1.2 `airRiser` in `src/endless/waypoints.js`: a pending riser pressed inside the growth goes on the grown song, records `air`, stays out of the director's view.
- [x] 1.3 Live coder case in `check:radio-profiles` (up and down, replay, no riser in the written form).

## 2. This change (about 1 h)

- [x] 2.1 Crescendo case in `check:radio-profiles`: risers pressed on bar 30 and half way through growths of 8 phrases or more land within two phrases on the grown song and are heard. Verified to fail with the grown-song placement turned off (the riser goes to bar 40 of the written form's path) and to pass with it.
- [x] 2.2 The riser tooltip in English and Italian says that during a growth it comes within two phrases.
- [x] 2.3 DEVLOG entry; `check:radio-profiles`, `check:guide`, `check:live-code`, `check:stage-widgets`, `check:stage-video`, `npm run build`.

## 3. Leftovers (`fix/82-riser-grown-leftovers`, 12 November)

- [x] 3.1 The console's reason for the riser button inside a growth comes from the placement on the grown song (`airWhy` in `src/endless/waypoints.js`, used by the console and by the press): near the end of a growth the written form said "late" while the riser fit within two phrases. Check in `check:radio-profiles`, verified to fail with the written form's reason and to pass with the placement's.
- [x] 3.2 A riser with no room within two phrases is refused with its reason, and one the steering drops shows a notice (`airDropped`), in English and Italian. Check in `check:radio-profiles`, verified to fail without them.
- [x] 3.3 DEVLOG entry, CHANGELOG Fixed bullet; the checks before the commit.
