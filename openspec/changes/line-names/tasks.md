## 1. Study

- [x] 1.1 Map every place that writes, reads, parses or rewrites `$:` and `_$:` lines (design, The map)
- [x] 1.2 Strudel 1.2.6 in Node: named lines, duplicates, capital S, `_name:` and `name_:`, solo (design table, `check:line-names` part 1)

## 2. Prototype (branch `feat/82-line-names`)

- [x] 2.1 `src/song/line-names.js`: LINE, marks, safe names, unique names, `toDollar`, Random per song
- [x] 2.2 Names on the code shown (`liveCode`) and the song as written (`playable`); the hidden tail and songs off air keep `$:`
- [x] 2.3 Readers in `src/` accept both forms; mute writes `muteLine`
- [x] 2.4 Growth shape search, radio steering and the written part's plan measured on `$:`
- [x] 2.5 Control `names` in the profiles, the Compose option, strings in both languages, Guide card, knowledge note
- [x] 2.6 `check:line-names` (Node) and `tools/check-line-names.cjs` (browser); `check:live-code` pins `$:`

## 3. After the owner's review

- [x] 3.1 Answers to the open questions (owner, 12 November; design, Owner's answers)
- [x] 3.2 The choices in the radio's Custom section and in the Decode tab's Options; the Decode Lead named `lead`, its form kept by Open in Compose
- [x] 3.3 Names from the track (`drums`, `drums2`) next to names from the instrument; camelCase names, never a capital first letter; `check:line-names` on all three forms
- [ ] 3.4 Browser checks with names: `check-code-widgets.cjs`, `check-code-themes.cjs` (dimmed named lines), `check-code-over.cjs`; `check:mixer -- --full`
- [ ] 3.5 `npm run durations` and the Crescendo fixtures unchanged (the growth measures `$:`); `npm run catalog:strudel`
- [ ] 3.6 Merge into `develop` after the owner says go
