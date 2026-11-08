# Tasks

Refs: coding-misk/#82. Estimate: about 4 agent hours. Dev server for browser checks on port 5301 (`PORT=5301`).

## 1. Shared rules and painter (about 1 h)

- [ ] 1.1 `rollShape`, `rollLook`, `rollLooks` in `src/live/widgets.js` (D1, D2, D3) and the `rollEqual` / `rollVaried` defaults and parsing in `CW_DEFAULTS` and `widgetSettings` (D7); verify with a new Node check `tools/check-one-row-roll.mjs` (`npm run check:one-row-roll`): L1 `[~ hh]*4` at gain 0.1 equal, L2 gains `0.5 0.15 0.3 0.15` varying with levels 1, 0.3, 0.6, 0.3, L3 `hh*8, [~ oh]*2` two rows, gains `0.4 0 0.4 0` equal with the zeros skipped, 0.96 against 1 equal and 0.94 against 1 varying, a louder hit after the span capped at 1, old settings read as Thin and Random.
- [ ] 1.2 `rollLooks` over 200 seeds and 12 sections: same seed same looks, never three in a row the same, each look between 25% and 42%; in the same check.
- [ ] 1.3 `paint.roll` with `o.look` and `o.top` (D4, D6); verify in the same check with a recording context that without `o.look` the calls are identical to today's (hash of the call list for L1 to L3), and that Height, Transparency, Both and Thin give the sizes and opacities of the spec scenarios.

## 2. Editor (about 1 h)

- [ ] 2.1 The `_pianoroll` wrapper (D5): one-row detection over the span from `miskWidgets.rollContext`, half height for Thin, the one-row painter through `paint.roll`, "Always full" skipped for one-row rolls only; the prototype's code is not copied over. Verify in the browser that L1, L2 and L3 typed in Compose show Thin, the section's varying look and today's two-row roll, with no `evalError`.
- [ ] 2.2 `main.js` sets `rollContext(cycle)` (section, its start and end, seed) from `sg.meta` and `sg.id`, the same inputs as `plainMemory.place`; verify with `tools/check-code-widgets.cjs` extended: a song with a one-row varying hats line keeps one look and one height for a whole section and the section's look from `rollLooks`.

## 3. Stage and fast video (about 1 h)

- [ ] 3.1 `drawWidget` in `src/visuals/widget-looks.js` passes the look and `top` per instrument and section (D2), Thin as a centred half band; verify with `tools/check-stage-widgets.mjs` (Node, recording context) on Monitor, a side panel and the big screen.
- [ ] 3.2 The render page computes `rollShape` per note-widget line and segment and sends it with the notes; `fastWidgets` draws from it with the section and seed of `fv`; verify in `tools/check-code-widgets.cjs` that a fast video's frames at three sections show the same look and height as the editor at those bars (compare the canvas height and a pixel column per bar).

## 4. Settings, texts and pictures (about 1 h)

- [ ] 4.1 Two segmented rows in the Code widgets card with their hints (D7), English and Italian strings in `src/i18n.js`; verify with `PORT=5301 node tools/check-settings.cjs` (rows present in both languages, a change applies while playing, saved and in the backup) and `npm run check:guide`.
- [ ] 4.2 Guide card text of the code widgets (`src/guide.js`, en and it), `npm run knowledge` and `npm run check:knowledge`, a line in `docs/knowledge/decisions.md` (visible window rejected, D2), CHANGELOG entry under Unreleased; verify that both checks pass.
- [ ] 4.3 Screenshots in light and dark (neon) of L1 Thin, L1 Full, L2 Height, L2 Transparency, L2 Both and L3, in the editor and on a Monitor panel, plus one fast video frame of L2, in the owner's test folder `notes/prove-<date>/pianoroll-una-riga/`; verify that the quietest bar is visible in both themes.
- [ ] 4.4 Run `npx vite build`, `npm run check:one-row-roll`, `npm run check:stage-widgets`, `npm run check:code-over`, `PORT=5301 node tools/check-code-widgets.cjs`, `PORT=5301 node tools/check-widget-placement.cjs`; DEVLOG entry in Italian.

## Workflow follow-up

- Show the pictures to the owner before the merge into `develop`.
- Delete the prototype worktree `coding-misk-pianoroll` and the branch `proto/pianoroll-one-row` once the owner agrees.
- Archive the change after the merge.
