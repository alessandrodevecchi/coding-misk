## Context

- Stage panels come from `rosterOf` (`src/visuals/stage-feed.js`): one panel per stage instrument (the `analyze` name: kick, snare, hats, bass, pad…), in the code widgets' slot order, with the widget `widgetFor` draws for it. `stageMapping` (`src/visuals/stage-settings.js`) removes the app widgets (cv13): an instrument whose main widget is `hitgrid` or `tonecloud` falls back to its first Strudel secondary, the voice is off, and `widgets.hitgrid` / `widgets.tonecloud` are forced false.
- Panels are drawn by `drawPanel` / `drawWidget` (`src/visuals/widget-looks.js`) for Monitor and by `drawLayer` (`widget-layer.js`) for the strip (`stripLayout`) and the Stage visual's big screen (`screenLayout`, at most 4). `layerOn` returns null on `FULL_LOOKS` (Monitor, Roll, the chat look, the soul). Glyph forms (ASCII, Terminal) are in `glyph-looks.js`.
- The app widgets are pure: `widgetFrame(kind, call, S, notes, cyc, ctx)`, `widgetSize`, `paintWidget(g, x, y, F, P, fs)`, colours from `widgetPalette(R, O)` (code theme roles). Notes come as `{ inst, b, e, p, lv, n }` from haps live or from the render page's store in the fast video (`notesOfStore`), the same shape the stage feed uses.
- The code side already has the placement rules: one hit grid on the first drum line with every drum row of the song (cd1, `src/widgets/song-rows.js`), at most one tone cloud (cd5, `src/live/widgets.js`, lines around `hasCloud`).
- The stage's button row is `.hud-row` in `index.html`: look arrows, look menu, Render menu, Transcript, Code over, full screen.
- "Over the scene" is `SW_LAYERS = ['off', 'strip', 'palco']`, labels `swLayer:*`, one hint for all modes.

## Goals / Non-Goals

**Goals:** hit grid and tone cloud in every stage panel place with the code's rules; one-press on/off; mode names a person understands.

**Non-Goals:** new stage layouts; per-look widget choices; changing the code widgets' rules.

## Decisions

### D1. App widgets inside a panel: fit the widget to the box

A panel with an app widget builds its frame with `widgetFrame`, measures `widgetSize` at a reference font size and paints it with `paintWidget` scaled to fit the panel's widget area (`min(w / sw, h / sh)`), centred. The panel's header, level bar, glow, flash and dimming stay those of `drawPanel`. Colours: `widgetPalette` gets roles built from the stage palette (`F.pal`: ink, accents, muted, panel ground), so a panel follows "Colours" (Automatic, Theme, Scene) like the others. In ASCII and Terminal the widgets' "Style: Automatic" already draws characters; the glyph looks call the same painter on their grid.

| Option                                                   | Notes                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------- |
| **A (chosen)** the code's painter, scaled into the panel | One picture everywhere; the fast video and the page match by construction |
| B a stage-specific drawing of the two widgets            | More freedom for big panels, but two drawings to keep alike               |

### D2. One hit grid for the drums

`rosterOf` groups the drum instruments (`DRUM_INSTS` of `hitgrid.js`) when the hit grid is on: the first drum instrument in slot order gets the hit grid panel, fed with the notes of every drum instrument; the other drum instruments get no panel. Rows follow the code widgets' "Rows" setting (all of the song by default, from `song-rows.js`, so the panel's size is fixed from the first bar).

| Option                                          | Notes                                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------------- |
| **A (chosen)** one panel for all drums          | The hit grid's point is to show the drums together; frees 2 to 4 slots on Monitor |
| B a hit grid per drum instrument                | One row per panel: a small, empty-looking picture                                 |
| C the hit grid plus a scope per drum instrument | Crowds Monitor (6 panels at most) and repeats the same hits                       |

### D3. The tone cloud on the stage

The cd5 rule of the code runs on the stage roster: after the roster is drawn, at most one panel keeps `tonecloud`: the pad's; else the first of bass, lead (hook), arp in slot order; else the voice. Every other panel whose widget was `tonecloud` takes its next widget. The voice's main stage widget is the scope when it does not hold the cloud; the voice is on the stage again (today off because of cv13). The rule is counted per picture: one in the code panel and one on the stage may show at the same time (see Open Questions).

### D4. Settings defaults and old stored settings

`SW_DEFAULTS.widgets.hitgrid` and `.tonecloud` become true and `stageMapping` stops removing them. Stored stage settings hold `false` for both (forced before this change, not chosen by the user): settings without a version field get them set to true once, and `v: 2` is written (the same approach as `settings-polish` D2).

### D5. The "Widgets" button

A chip in `.hud-row`, after "Code over", drawn icon plus the word "Widgets" (it: "Widget"), `aria-pressed` with the state. Press: `layer = layer === 'off' ? lastOn : 'off'`; `lastOn` is stored with the stage settings (default `strip`). Hidden when `layerOn` would return null for the look whatever the setting (Monitor, Roll, the chat look, the soul). Tooltip: "Widget panels over the visual: on or off. Mode in Settings → Stage widgets" / «Pannelli dei widget sopra il visual: accesi o spenti. Modo in Impostazioni → Widget sul palco».

| Option                                                | Notes                                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **A (chosen)** a chip above the visual                | Next to the other stage toggles (Code over, Render); works full screen, where the code panel is hidden |
| B a button above the code                             | Not visible with the stage full screen or the code panel collapsed; mixes stage and code controls      |
| C a three-way selector (Off, Side panels, Big screen) | Faster to change mode, but wider in a crowded row and on a phone                                       |

### D6. Names

| Key (stored, unchanged) | EN today       | EN new                  | IT today       | IT new                 | One-line explanation EN / IT                                                                                                                                                  |
| ----------------------- | -------------- | ----------------------- | -------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| label `swLayer`         | Over the scene | Widgets over the visual | Sopra la scena | Widget sopra il visual |                                                                                                                                                                               |
| `off`                   | Off            | Off                     | Spenti         | Spenti                 | No panels over the visual. Monitor and Roll still show theirs. / Nessun pannello sopra il visual. Monitor e Rullo mostrano comunque i loro.                                   |
| `strip`                 | Strip          | Side panels             | Striscia       | Pannelli ai lati       | Small panels at the sides of any visual (in a row at the bottom on a tall picture). / Pannelli piccoli ai lati di ogni visual (in fila in basso su un'immagine alta).         |
| `palco`                 | Palco          | Big screen              | Palco          | Maxischermo            | On the Stage visual, the panels go inside its big screen; on the others, side panels. / Sul visual Palco i pannelli vanno nel suo maxischermo; sugli altri, pannelli ai lati. |

"Panels in the strip" becomes "Side panels at most" (it: «Pannelli ai lati, al massimo»). Stored values stay `off`, `strip`, `palco`: old settings keep their meaning.

## Risks / Trade-offs

- **Small panels:** the tone cloud has 12 rows and many columns; in a side panel at a small stage it can become a smudge. The painter's size floor (the font size it is fitted with) decides: below it the panel uses the instrument's next widget. The pictures in the check show the smallest case.
- **Drum slots freed:** grouping drums changes which instruments appear on Monitor for many songs; this is intended, and the check's pictures show it.
- **Cost:** the tone cloud reads a window of notes per frame; on Monitor it is one panel at most, so the cost is one widget per frame.

## Open Questions

1. One tone cloud per picture (one in the code panel and one on the stage at the same time) or one across the whole screen? Recommended: per picture; the stage is often full screen alone and in videos the code layouts already follow the code's own rule.
2. Should the "Widgets" button also have a keyboard key? Recommended: not now; add one with the other stage keys if the owner asks.
3. Should Monitor's panel count (2 to 6) grow now that the drums share one panel? Recommended: no, keep 6; the freed slots already show more instruments.
