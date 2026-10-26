# Tasks

## 1. Preview engine

- [ ] 1.1 Add `src/player/preview.js` with the pure `previewExpression(code, { orbit })` (D2): it drops `setcpm`, `$:`, `.analyze`, and the section mask and velocity, and sets the preview orbit. Add Node tests over one loop of each pattern kind; each expression must evaluate with Strudel in Node.
- [ ] 1.2 Move `listenPattern`'s settings (`src/main.js:2540-2543`) into a shared helper used by the listen button and the preview. Add an optional `rack` to `loopSong` (`src/library/patterns.js:200`). `npm run check:patterns` must stay green.
- [ ] 1.3 Build the preview controller: a bare `Cyclist` with `getTrigger` and `webaudioOutput` for free play, and the `setPattern` wrapper that stacks the preview on the song's scheduler while the song plays (D1). Hand over between them from the frame loop and the background clock. Check that `stack` gets one `Pattern` class.
- [ ] 1.4 Line the preview up with the song's next bar (`filterWhen`) and shift its progression by the selected section's start (D2). In the browser, check that the first preview onset is within 5 ms of the next bar's start, and that later onsets stay on the song's bars across a tempo change.
- [ ] 1.5 Pick the preview orbit (D3): check that superdough sets no orbit cap and that no built-in song uses orbit 15. Check that the song's delay and reverb settings do not change while a preview with a long delay plays.

## 2. Compose

- [ ] 2.1 Add the `pt-preview` button next to `pt-listen` for grooves and presets (`src/main.js:2567`, `:2572`), with icons, `aria-pressed` and both themes. Keep its state across re-renders.
- [ ] 2.2 Lifetime (D4): one preview at a time. It stops when the user leaves Compose, when another song opens, when its track or pattern is removed, and on an export or recording, where its button is also disabled. It follows the selected pattern and edits from the next bar.
- [ ] 2.3 Split `tp-pats` (`src/main.js:2608-2611`) into "Pattern del brano" / "Song patterns" (chips, Delete, the editing note) and "Crea pattern" / "Make patterns" (New, Save as pattern, `composeRow`), per the owner's answer to open question 1. Add the strings to `src/i18n.js` in both languages.

## 3. Bar counter

- [ ] 3.1 Add `#pb-bar` to `index.html:246` and the `pbBar` string, the same in both languages. Fill it in `renderPlayerBar` (`src/main.js:3535`) for songs, stopped in Compose (`cueBar`), the radio, the mix, the Patterns loop, and while the timeline is dragged (D7).
- [ ] 3.2 Grown songs: verify in the browser, on a Live coder and a Crescendo song, that the total equals the grown `meta.bars` and that the bar matches `floor(sched().now()) + 1`. While the growth is pending, the written total shows, then the grown one.
- [ ] 3.3 Narrow screens: below 480 px the total time hides before the counter. Verify at 400 px in both themes.

## 4. Checks and docs

- [ ] 4.1 Add `tools/check-preview.cjs` for the scenarios of both specs. The main scheduler's code, the editor, the title and `isPlaying()` must not change when the preview starts. Also check the riding and free handover, the alignment, one preview at a time, stop on leaving Compose and on export, and the Italian and English labels. Update `tools/check-player.cjs` and `tools/check-radio.cjs` for the counter, and `tools/check-patterns.cjs` for the split rows.
- [ ] 4.2 Run `npm run check:patterns`, `npm run check:guide`, `npm run check:knowledge`, `npm run build`, and the browser checks for player, radio, patterns, hand and preview.
- [ ] 4.3 Update the Compose card in `src/guide.js` (both languages), `docs/knowledge/patterns.md`, `docs/knowledge/glossary.md` (the row names, the preview, "bar"), `docs/ARCHITECTURE.md` (the second player), `docs/knowledge/decisions.md` (D1 and its rejected options), the AGENTS.md tool list and `DEVLOG.md`.
- [ ] 4.4 Open a follow-up issue for the timeline jump in Live coder and Crescendo (D9), at low priority.
