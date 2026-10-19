## 1. Measure

- [ ] 1.1 In the browser, measure the master output peak of `neon-rush-reel` and of the loudest built-in songs while their line peaks are above 1.0; record whether the output clips (DEVLOG)

## 2. Checks

- [ ] 2.1 Output peak measured in the level tools and browser checks; above 1.0 fails
- [ ] 2.2 Exported files: sample peak checked in the export checks
- [ ] 2.3 Track peaks above the style headroom reported as warnings, not failures

## 3. Styles

- [ ] 3.1 Optional `headroom` (1.0 to 1.5) in the recipe validator and `docs/STYLES.md`; `npm run check:styles`

## 4. Docs

- [ ] 4.1 `docs/knowledge/sound-and-levels.md` and the level recipe updated (headroom, saturation from the sound); `npm run knowledge`, `npm run check:knowledge`; DEVLOG entry in Italian
