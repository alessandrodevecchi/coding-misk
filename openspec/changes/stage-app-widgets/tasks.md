## 1. App widgets in panels (about 2.5 h)

- [x] 1.1 `drawWidget` paints `hitgrid` and `tonecloud` with the code's painter fitted to the panel (D1), palette from the stage palette; verify in Node with a recording context (`tools/check-stage-widgets.mjs`) that both draw in a Monitor panel, a side panel and the big screen.
- [x] 1.2 Glyph forms in ASCII and Terminal (`glyph-looks.js`) use the same painter on the grid; verify in `tools/check-render-styles.cjs` pictures.
- [x] 1.3 `stageMapping` keeps the app widgets; `SW_DEFAULTS` and the one-time move of stored settings (D4); verify old settings read with both widgets on, and a later choice kept.

## 2. Placement rules (about 2 h)

- [x] 2.1 `rosterOf`: one hit grid for the drum instruments, the others without panels (D2); verify in Node on a song with kick, snare, hats, bass, pad.
- [x] 2.2 The tone cloud rule on the roster (D3), the voice back on the stage with the scope; verify in Node: pad and voice, no pad, voice alone.
- [x] 2.3 `tools/check-widget-placement.cjs` extended to the stage: never two tone clouds on Monitor, on the side panels and in a fast video's frames; the hit grid with the song's rows from the first frame.

## 3. Button and names (about 1.5 h)

- [x] 3.1 The "Widgets" chip in `.hud-row` (D5): toggle, last mode kept, hidden on Monitor, Roll, the chat look and the soul; verify in the browser, also full screen and at 400 px.
- [x] 3.2 New names and the per-mode explanation line (D6) in `src/i18n.js` and `src/settings/settings.js`; verify that an old stored `palco` shows Big screen.
- [x] 3.3 Guide card for the stage widgets in English and Italian; `npm run check:guide`.

## 4. Close (about 1 h)

- [x] 4.1 Pictures of Monitor, side panels and big screen with both widgets (neon, hardware, light, 16:9 and 9:16, Normal and ASCII) in the owner's test folder.
- [x] 4.2 Run `npx vite build`, `tools/check-stage-widgets.mjs`, `check-widget-placement.cjs`, `check-render-styles.cjs`, `check-settings.cjs`, `check:guide`, `npm run knowledge`, `check:knowledge`; DEVLOG entry in Italian.

Total: about 7 agent hours.
