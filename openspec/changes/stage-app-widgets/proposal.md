## Why

The owner's tests of 31 October (evening):

- **rn2:** the Monitor visual does not show the hit grid and the tone cloud, the app's own widgets. The owner likes them and wants them there. They were left out on purpose by `code-over-visual` (cv13: "a follow-up change"): on the stage an instrument whose main widget is an app widget falls back to a Strudel widget, and the voice has no panel.
- **rn4:** turning the stage widgets on and off takes a trip to Settings. The owner wants it within reach, among the buttons above the visual or above the code. The two modes of "Over the scene", "Strip" and "Palco", are not clear: the owner could not tell them apart from the names.

## What Changes

- **App widgets as stage panels.** The hit grid and the tone cloud become panel widgets like scope or pianoroll: in Monitor, in the side panels over a visual and in the Stage visual's big screen, on the page and in every video. They are drawn by the same painters as in the code, from the same notes.
- **One hit grid for the drums.** On the stage the hit grid is one panel with a row for each drum sound of the song (as in the code since cd1), in the first drum slot.
- **At most one tone cloud on the stage**, by the rule of the code (cd5): on the pad; without a pad on the first melodic instrument (bass, lead, arp); on the voice only if nothing else can take it. On the voice the main stage widget becomes the scope.
- **A quick switch.** A "Widgets" button in the row of buttons above the visual, next to "Code over": on and off in one press, keeping the chosen mode. Hidden on the visuals that are all widgets (Monitor, Roll), on the chat look and on the soul.
- **Clearer names.** "Over the scene" becomes "Widgets over the visual" with the modes Off, Side panels and Big screen, each with a one-line explanation that changes with the choice.

Not in scope: new widget kinds, the widgets' look (`denser-renders` and `widget-render-styles` cover renders), the code widgets' own placement.

## Capabilities

### New Capabilities

- `app/stage-app-widgets`: the app widgets as stage panels, the one-tone-cloud rule on the stage, the quick switch and the mode names.

### Modified Capabilities

None in `openspec/specs/`. It extends the open changes `widgets-on-stage` (stage panels, "Over the scene") and `code-over-visual` (custom code widgets, cv13), whose requirements are not archived yet.

## Impact

- `src/visuals/stage-settings.js` (`stageMapping`, `SW_DEFAULTS.widgets`), `src/visuals/stage-feed.js` (`rosterOf`: the hit grid and tone cloud rules), `src/visuals/widget-looks.js` and `widget-layer.js` (drawing an app widget in a panel), `src/visuals/glyph-looks.js` (glyph forms), `src/visuals.js`, `index.html` and `src/main.js` (the button), `src/settings/settings.js`, `src/i18n.js`, `src/guide.js`.
- Checks: `tools/check-stage-widgets.mjs`, `tools/check-widget-placement.cjs`, `tools/check-render-styles.cjs`, `check-settings.cjs`, `check:guide`.
- Videos with stage widgets change (new panels); the sound, songs and fixtures do not.
- Overlaps `settings-polish` on the "Over the scene" labels: that change fixes the English word now; this one replaces the names.
