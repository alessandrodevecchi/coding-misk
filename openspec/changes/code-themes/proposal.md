## Why

The code panel always looks the same: Strudel's default editor theme on a grey ground, in the browser's generic monospace font at 18 px, whatever the app theme or the look. The owner wants code themes: the colours and the font of the code, chosen apart from the stage render styles (`widget-render-styles` never touches the code). Strudel already ships editor themes (39 registered in the installed `@strudel/codemirror` 1.3.0), but the app never offers them, and none matches the neon or the hardware theme.

## What Changes

- **A code theme setting** in the Settings "Appearance" card ("Code theme", it: "Tema del codice"): Automatic (default), our own themes, and a short list of Strudel's built-in themes.
- **Automatic follows the app theme:** neon gives our Neon code theme, which takes its colours from the look (accent, second accent, ink, muted), so the code changes with the look; hardware gives our Amber code theme, matched to the LCD fields.
- **Our themes:** Neon, Amber, Terminal (a modern terminal palette, the same family as the Terminal render), High contrast dark, and Light high contrast (white ground, black text). Every text colour at least 4.5:1 against the ground, the two high contrast themes at least 7:1.
- **Strudel's themes, curated:** a short list of Strudel's themes whose names are not product names, shown under their Strudel names and whose text reaches 4.5:1 (recommended: `strudelTheme`, `teletext`, `blackscreen`, `whitescreen`, `bluescreen`, `greenText`). The full list stays out.
- **A code font and size:** JetBrains Mono by default (already loaded, already used by the code in videos), with a short font list and three sizes. The app's own code sizes start to apply (today Strudel's inline 18 px overrides them).
- **Everything drawn in the code panel follows the code theme:** the code widgets (`#79`), the dimmed widget of a muted `_$:` line, the outline of the playing notes, the evaluation flash, the caret and the selection.
- **Videos follow the code theme:** the code panel drawn in session videos, the fast video, fragments and the live output uses the code theme's colours and font ("same as the panel" by default, or the app theme's colours as today). The fast video reads the theme once when it starts.
- **Saved and in the backup,** reset with the other settings.
- **Out of scope:** a song naming its own code theme, a theme editor, editor settings of Strudel's own REPL (keybindings, line wrapping), the light app theme (separate change `light-theme`).

## Capabilities

### New Capabilities

- `code-themes`: the colours and the font of the code in the code panel and in the code drawn in videos, chosen in Settings, following the app theme by default.

### Modified Capabilities

None in `openspec/specs/`. Touches the open changes `code-widgets` (widget colours) and `widget-render-styles` (the code panel stays out of renders), and reads `session-video`, `fast-video`, `live-output`, `vertical-clips`.

## Impact

- **Code:** a code themes module (theme data, the installer on the editor, the colours for widgets and videos); `src/main.js` (apply at start and on a theme or look change, `widgetGroups`, `codeCols`); `src/video/video.js` (`drawCode` palette and font); `src/settings/settings.js`, backup, `src/i18n.js`, `src/guide.js`; `src/style.css` (`.edhost` ground, muted line).
- **Sound, growth, fixtures:** unchanged. The code text is unchanged too, except the line breaks of a live build, which already depend on the panel width in characters.
- **Checks:** a new no-browser check of the theme data (roles complete, contrast), a browser check with screenshots of every theme; `check-settings.cjs`, `check-backup.mjs`, `check-video.cjs`, `check-live.cjs`, `check:guide`, `check:knowledge`.
- **Docs:** `docs/DESIGN-SYSTEM.md`, `docs/knowledge/` (settings, decisions).
