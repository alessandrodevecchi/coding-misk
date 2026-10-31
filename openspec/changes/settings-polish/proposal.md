## Why

The owner's tests of 31 October (evening) found four small things in Settings and the code panel:

- **co5:** the playing notes can be framed (Outline) or filled (Filled). A third form, underlined in the theme's accent colour, reads better on some themes and is a common way to show playing tokens in live code.
- **cw8:** "Widget notes" defaults to "Follow the volume", so quiet notes are almost invisible in the pianoroll. The owner wants "Always full" as the default.
- **cw16:** some Settings controls have no help text, and some help texts are unclear. The hit grid's "Variants apart" is the example: nobody can tell what it does. The owner asked for a review of every Settings control, not only the widgets.
- **Label fixes:** the English interface shows the Italian word "Palco" in the stage widgets card ("Over the scene" → "Palco", and two hints), although the visual is called "Stage" in English. The audio/video switch of the radio export still says "Video runs in real time", but videos now render faster than real time.

## What Changes

- **Lit notes: Underlined.** A third value of "Lit notes" (Settings → Appearance), next to Outline and Filled: a line under each playing token in the code theme's accent colour. It applies in the editor, in every video code layout and in "Code over", like the other two.
- **Widget notes: Always full by default.** New installs and a reset to defaults get "Always full". Stored settings that still hold the old default move to the new one once (see design).
- **Help texts for every Settings control.** Every control gets a short help text in English and Italian, shown as today's hint line under the control and as a tooltip on its label. Unclear texts are rewritten. The full list, with the proposed texts, is the table in `design.md`.
- **Label fixes.** "Palco" becomes "Stage" in the English stage widgets card. The radio export's audio/video tooltip says when a video renders faster than real time and when it plays in real time.

Not in scope: clearer names for the "Over the scene" modes (change `stage-app-widgets` renames them; this change only fixes the English word), new settings, and help texts outside the Settings page (the Guide stays as it is, apart from the lines this change touches).

## Capabilities

### New Capabilities

- `app/code-lit-notes`: how the playing tokens of the code are marked (Outline, Filled, Underlined).
- `app/settings-help`: every Settings control has a clear help text in both languages; labels use the interface language's names.
- `app/code-widget-notes`: the default of "Widget notes".

### Modified Capabilities

None in `openspec/specs/`. The lit notes requirement of `code-over-visual` (Outline or Filled) gets a third value; the code widgets' "Widget notes" option of `code-widgets` gets a new default. Both changes are still open, so the requirements are written here as new ones.

## Impact

- `src/code-themes/themes.js` (`lit` values), `src/code-themes/install.js` (the editor's CSS for the underline), `src/video/code-over.js` and the video code painter (`src/video/video.js`), `src/settings/settings.js` (the Lit notes segment, hints and tooltips), `src/live/widgets.js` (`CW_DEFAULTS.notes`), `src/i18n.js`, `src/guide.js` (lines that name these options).
- Checks: `check:code-themes` (Node and browser), `check-code-over.cjs`, `check-settings.cjs`, `check:guide`, `check:knowledge`, `check:light-theme` (the underline's contrast).
- No change to songs, sound, fixtures or exports.
