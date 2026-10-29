## Context

Read on `develop` a3c4142 (2026-10-29) with `@strudel/repl` and `@strudel/codemirror` 1.3.0 installed. "Verified" means read in the code or measured in the running app; the rest is inferred.

### What Strudel has

- **39 registered editor themes** in `@strudel/codemirror/themes.mjs` (verified): `strudelTheme` (the default) plus Strudel's own (`teletext`, `algoboy`, `blackscreen`, `whitescreen`, `bluescreen`, `bluescreenlight`, `greenText`, `redText` and a few by community authors) and many ports of popular editor themes. Twelve have a light ground (two of them flagged dark). Two more files exist but are not registered (`terminal`, a one-colour green phosphor, and a light duotone). The full inventory, with grounds, text colours and notes, is in the owner's local notes (`notes/prove-2026-10-29/temi-codice/LEGGIMI.md`); many names are names of products, so this spec names only the ones it would offer.
- **A theme is two parts** (verified, `themes/theme-helper.mjs`): an editor theme (ground, text, caret, selection, gutter, active line) and a highlight style (a colour per syntax tag: comment, string, number, label `$:`, variable, method, punctuation). A `settings` object per theme also feeds `activateTheme`, which writes CSS variables on `:root` (`--background`, `--foreground`, `--caret`, `--lineBackground` and others, with `!important`) and the draw package's theme (default colours of the pianoroll, spiral and pitchwheel).
- **Selection:** the editor's `setTheme(name)` reconfigures one compartment and calls `activateTheme(name)`. The name comes from `codemirrorSettings`, a persistent store in `localStorage` under `codemirror-settings`, read when the editor starts (verified: today it holds `strudelTheme`, `monospace`, `18`).
- **Fonts:** no font files in the Strudel packages (verified). The editor takes `fontFamily` and `fontSize` from the same settings and writes them inline on its container (`monospace`, 18 px by default). Strudel's website REPL has a font menu with fonts of its own; that is not in the installed packages (not verified here).
- **Licence:** `@strudel/codemirror` is AGPL-3.0-or-later, like the app; the themes ship inside it. Some themes are ports of third-party themes credited in their source comments.
- **Quirks seen:** two light themes say `light: false`; one light theme has a white caret on white; `algoboy` text is dark brown on near black (2.4:1, comments 1.5:1); `strudelTheme` brackets are 2.0:1 and comments 4.4:1.

### How our code panel is built

- **`<strudel-editor>`** (the web component of `@strudel/repl`) is created in `src/main.js` and placed in `#edhost`. The app never calls `setTheme`; the panel shows `strudelTheme` with Strudel's `monospace` 18 px (verified in the browser). The `.edhost` rules `font-size: 13px` and, in the full view, `15px` have no effect, because Strudel's inline 18 px on its container wins (verified).
- **`@strudel/repl` ships its own bundled copy of CodeMirror and of the themes** (`dist/index-*.js`, 2.3 MB). Importing `@strudel/codemirror` in the app gives a second copy: a theme registered there never reaches our editor (verified: registered themes in the second copy did not change the panel). Strudel's built-in themes are reachable through the editor's public `setTheme`; our own themes are not.
- **CodeMirror's default highlight style is also active** next to the theme's (verified: every token carries two classes). A new highlight style must mount its CSS module the way Strudel's themes do, or the default style's colours win.
- **Code widgets** (`src/live/widgets.js`, `#79`) get their colours from the app tokens `--ink`, `--a1`, `--a2`, `--muted` (`widgetGroups` in `src/main.js`), passed as hidden parameters at each evaluation. A muted line's widget gets `.cw-muted` (grayscale, 40 % opacity, dashed outline in `--muted`). The text of a `_$:` line is not dimmed.
- **Playing notes** are outlined with `var(--foreground)` (Strudel's highlight), the evaluation flash is a white 40 % mark (Strudel's flash), both independent of our tokens.
- **Videos do not copy the editor:** `drawCode` in `src/video/video.js` draws the code on the canvas with its own tokenizer and the app tokens (`--panel`, `--ink`, `--muted`, `--a1`, `--a2`), JetBrains Mono at a fiftieth of the frame height. Session video, fast video, fragments and the live output use it (verified). So the video code already differs from the panel.
- **Line breaks of a live build** follow the panel width in characters (`codeCols` in `src/main.js`, from the editor's character width): a font or size change changes where long lines break, not what plays.
- **Fonts loaded:** one Google Fonts stylesheet in `index.html` loads Chakra Petch, JetBrains Mono, VT323, Share Tech Mono, Space Grotesk, Russo One and Mr Dafoe, all under the SIL Open Font License 1.1.
- **HW theme:** `:root[data-ui="hw"] .edhost` adds a thick bezel; nothing else of the code changes. The LCD tokens are `--lcd-bg #1b1306` and `--lcd-fg #ffb347`.

## Goals / Non-Goals

**Goals:** code colours that belong to the app theme and the look by default; a few strong alternatives, including high contrast dark and light; a real code font and size; widgets, muted lines, playing notes and videos consistent with the chosen theme.

**Non-Goals:** a theme editor, per-song code themes, Strudel's other editor settings, the light app theme (`light-theme`), any change to the sound or to the code text.

## Decisions

### D1. Install themes on the editor's own instance

Strudel's built-in themes go through the editor's `setTheme(name)` (public). Our themes are installed by a small adapter that builds them with the editor's own CodeMirror classes, reached from the live editor view: the editor theme class (`view.constructor.theme`), the highlight style class (from the highlight style the editor already has), the theme compartment and the facets of Strudel's current theme, rebuilt with the new style and its CSS module in the same structure. The adapter then writes the same `:root` variables `activateTheme` writes. Prototyped on 2026-10-29 for the screenshots: it works and leaves no error (verified).

Alternatives: (a) build the editor from `@strudel/codemirror` ourselves instead of `<strudel-editor>`: public API, but it moves the whole player setup off the component the app is built on (large, risky); (b) CSS only: CodeMirror's token class names are generated, so there is nothing stable to target. The adapter reads CodeMirror internals of a pinned Strudel version, so a browser check fails loudly when it cannot install a theme, and the panel then keeps Strudel's default with a console warning.

### D2. Themes as roles

A code theme is a set of roles: ground, text, comment, string, number, label and keyword (`$:`, `const`), variable (`note`, `s`), method (`.gain`), punctuation, caret, selection, line numbers, playing-note outline, flash, muted line, and widget colours (ink, accent, second accent, muted). Our themes fill every role; for Strudel's themes the missing roles come from their settings (foreground for ink and outline, caret for accent). The same roles feed the editor, the widgets and `drawCode`.

### D3. Our themes

| Theme | Ground | Text | Accents | Contrast (lowest text role) |
| --- | --- | --- | --- | --- |
| Neon | the look's ground, darker | `--ink` | label and variable `--a1`, string `--a2`, number `--s3`, comment `--muted` | 5.7:1 (label, Palco) |
| Amber | `#140e04` | `#ffb347` | keyword `#ff8a3d`, string `#ffd9a0`, number `#fff1d6`, soft glow | 4.5:1 (comment; `#a88048` gives 5.3:1) |
| Terminal | `#0b0d10` | `#d0d6e0` | magenta keyword, green string, yellow number, blue method, cyan variable | 5.0:1 (comment) |
| High contrast dark | `#000000` | `#ffffff` | yellow label, cyan string, pink number | 11.2:1 |
| Light high contrast | `#ffffff` | `#000000` | purple label, dark blue string, dark red number, grey italic comment | 8.1:1 |

Neon reads the look's tokens, so one theme serves every look (screenshots 05 and 06); its widget colours and the canvas need resolved colours, read from the computed tokens on a look change. Terminal uses the modern palette of the Terminal render, not a green phosphor (Strudel's `greenText` covers that).

### D4. Automatic by default

The default "Automatic" maps neon to Neon and hardware to Amber, and a future light app theme to Light high contrast. A chosen theme stays until the user goes back to Automatic.

### D5. Font and size

JetBrains Mono by default: already loaded, already the font of the code in videos, and it separates `0`/`O` and `1`/`l`. Choices: JetBrains Mono, Share Tech Mono, VT323 (large, for the LCD look), the system monospace. Sizes Small, Medium, Large (13, 14, 16 px in the panel; the full view one step larger). The app applies them through the editor's `setFontFamily` and `setFontSize`, so the existing `.edhost` sizes are replaced by the setting. A font change recomputes `codeCols`.

### D6. Where the setting lives

The Settings "Appearance" card (next to Theme, Language, Radio visual): "Code theme" (a menu with Automatic, our themes, then Strudel's themes in a group), "Code font", "Code size". A line under the menu says which theme Automatic is using. No control in the code panel header. Our own key (`coding-misk-code-theme`), in the backup and the reset; Strudel's `codemirror-settings` is written with a Strudel theme name when one is chosen, so the editor starts in it without a flash of the default.

### D7. What follows the theme

- **Widgets:** `widgetGroups` reads the theme's widget roles instead of the app tokens. Strudel's pitchwheel default colour comes from the draw package's theme, so the app passes it explicitly.
- **Muted lines:** the dimmed widget's outline uses the theme's muted role. Dimming the text of `_$:` lines too is an open question (Q7).
- **Playing notes and flash:** the outline already uses `--foreground` (set by the theme). The white flash is invisible on a light ground; a CSS rule gives it the theme's flash role.
- **Panel:** `.edhost` takes the theme's ground instead of the fixed `#0a0a0f`; the HW bezel stays.

### D8. Videos

`drawCode` gets the code theme's roles and font: comments, strings, numbers, labels and methods coloured like the panel (its tokenizer already separates them), the ground and border from the theme. A video setting "Code colours: same as the panel (default) / app theme". The fast video and fragments read the theme once when the job starts and keep it to the end, so a job stays repeatable. The live output gets the theme with the rest of its feed and redraws on a change.

## Risks / Trade-offs

- **Internals of a pinned Strudel** (D1): an upgrade can move them. The browser check installs every theme and compares token colours; a failure blocks the upgrade, not the app.
- **A theme that fails contrast** with the look's accents (Neon on a pale accent): the theme data check measures every role against the ground for every look and fails under 4.5:1.
- **Strudel's themes are uneven** (low contrast, wrong light flag): only a curated list is offered.
- **Font from a web font service:** offline the code falls back to the system monospace; videos already have this dependency.

## Later ideas

- A song or a style naming its code theme, like its look.
- Self-hosted fonts (allowed by the OFL) for offline use and repeatable video exports.
- More of our own themes matched to single looks.

## Estimate

About 17 agent hours (tasks): adapter and theme data 5.5, fonts 1.5, widgets and panel details 2, Settings and backup 2, videos 2.5, checks and docs 3.5.

## Open Questions

Each with a recommended answer.

1. **Default: Automatic (follow the app theme) or keep today's Strudel theme?** Recommended: Automatic, neon to Neon and hardware to Amber. Today's `strudelTheme` stays in the list.
2. **Which Strudel themes to offer?** Recommended: a curated list without product names and with text at 4.5:1 or more: `strudelTheme`, `teletext`, `blackscreen`, `whitescreen`, `bluescreen`, `greenText`. Not all 39; `algoboy` (2.4:1), `redText` and `bluescreenlight` (3.6:1) left out for contrast although they fit the style.
3. **Our themes: Neon, Amber, Terminal, High contrast dark, Light high contrast?** Recommended: yes, these five. Terminal follows the modern palette of the Terminal render.
4. **Neon follows the look's colours, or fixed colours?** Recommended: follows the look (screenshots 05 and 06).
5. **Code font?** Recommended: JetBrains Mono by default, Medium (14 px); offer Share Tech Mono, VT323 and the system monospace.
6. **Videos follow the code theme?** Recommended: yes by default, with "app theme" as the other choice; the fast video fixes the theme at its start.
7. **Dim the text of muted `_$:` lines too (today only their widget dims)?** Recommended: yes, through the theme's muted role at about 55 % opacity, in the panel and in videos.
8. **Where is the setting?** Recommended: the Settings "Appearance" card only, no control in the code panel header.
9. **A song carries a code theme?** Recommended: not now (later idea).

## Prototypes

Made on 2026-10-29 on the dev server (port 5214): themes installed at runtime on the editor (D1), nothing in the app changed. Same song and bar for all: `luci-rosse`, Crescendo, code widgets on, paused at bar 38; the hook line muted by hand (`_$:`) to show a muted line. Italian interface. In the owner's local notes, `notes/prove-2026-10-29/temi-codice/`:

1. `01-attuale-strudelTheme.png`: today (`strudelTheme`, generic monospace 18 px).
2. `02-strudel-teletext.png`, `03-strudel-algoboy.png`, `04-strudel-whitescreen.png`: Strudel themes, JetBrains Mono 14 px.
3. `05-nostro-neon-palco.png`, `06-nostro-neon-sonar.png`: Neon on two looks.
4. `07-nostro-ambra-hw.png`: Amber in the hardware theme.
5. `08-nostro-terminale.png`: Terminal.
6. `09-nostro-alto-contrasto-scuro.png`: High contrast dark.
7. `10-nostro-chiaro-alto-contrasto.png`: Light high contrast (the muted pianoroll fades on white: D7).
8. `LEGGIMI.md`: the inventory of Strudel's themes and notes on each picture.
