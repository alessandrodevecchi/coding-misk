## 1. Compose

- [x] 1.1 Remove the toolbar voice instrument menu; one Voices group always shown: narrator row, the open song's voice instrument (or Add), "In the next song" row
- [x] 1.2 Narrator controls disabled with the reason (Live build off, not Crescendo, narrator off)

## 2. Voice instrument track

- [x] 2.1 `rewriteSpoken` (pure): lines like the director, quiet parts, one per part, ceiling, opening bound, build step, `voiceOptions`; options read from a track without them; `check:spoken` cases
- [x] 2.2 Track panel block (`track` mode, New phrases), the same in the Voices group, rewrite with Undo; validator and song format for `voiceOptions`

## 3. Radio

- [x] 3.1 One Voices group: narrator row (Custom profile, disabled with the reason otherwise) and the voice instrument block; hint about the next song and the song on air
- [x] 3.2 `voice` steering command from the next quiet part, recorded and replayed (`P.voiceAir`); `check:spoken` cases
- [x] 3.3 The Voice knob, compilation range, curve, console group and artist trait named Narrator, tooltips (analysis D7)

## 4. Checks and docs

- [x] 4.1 `tools/check-voices.cjs` for the new positions; screenshots in the notes folder
- [x] 4.2 Strings EN/IT, Guide card, knowledge notes, song format, DEVLOG entry in Italian, CHANGELOG

## 5. Refinements after the owner's review

- [x] 5.1 Radio: the Narrator knob moves from the knob row into the Voices group (same `talk` option, die, lock, compilation mark); labels stay in the interface strings
- [ ] 5.2 Radio: a voice instrument change applies from the next song only; the button "Apply to the song on air" sends the `voice` steering command (disabled with the reason when nothing is on air or paused)
- [ ] 5.3 `tools/check-voices.cjs` for the knob position and the button; Guide, knowledge, DEVLOG; screenshots in the notes folder
