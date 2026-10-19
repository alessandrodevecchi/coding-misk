## 1. Measure

- [x] 1.1 In the browser, measure the master output peak of `neon-rush-reel` and of the loudest built-in songs while their line peaks are above 1.0; record whether the output clips (DEVLOG)

## 2. Checks

- [x] 2.1 Output peak measured in the level tools and browser checks; above 1.0 fails
- [x] 2.2 Exported files: sample peak checked in the export checks
- [x] 2.3 Track peaks above the style headroom reported as warnings, not failures

## 3. Styles

- [x] 3.1 Optional `headroom` (1.0 to 1.5) in the recipe validator and `docs/STYLES.md`; `npm run check:styles`

## 4. Docs

- [x] 4.1 `docs/knowledge/sound-and-levels.md` and the level recipe updated (headroom, saturation from the sound); `npm run knowledge`, `npm run check:knowledge`; DEVLOG entry in Italian

## 5. Master limiter

- [x] 5.1 Limiter on the master in the app and in the render page (fast export, radio export, video), transparent below its threshold
- [x] 5.2 Style `headroom` sets the push into the limiter; songs without a style push none
- [x] 5.3 Before/after audio of 2-3 songs that clipped (e.g. drift, neon-rush-reel, ferro) for the owner; output peak of every built-in song below 1.0 live and in exports; level snapshots of clean songs unchanged
