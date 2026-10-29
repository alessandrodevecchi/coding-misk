## Context

Read on `develop` a3c4142 (2026-10-29). "Verified" means read in the code or seen in the running app; the rest is inferred.

- **Themes are tokens on `:root`** (`src/style.css`): `--bg`, `--panel`, `--panel2`, `--line`, `--ink`, `--muted`, `--a1`, `--a2`, `--s1` to `--s4`, fonts; each look (`data-look`) overrides ground, panels, line, muted and the accent pair; hardware (`data-ui="hw"`) overrides the base set and adds about 200 fixed colours of its own (bezels, LCD, knobs). `color-scheme: dark` is fixed (verified).
- **The switch** is `setUi` in `src/main.js` (`neon` or `hw`, key `coding-misk-ui`), buttons NEON and HW in the top bar and in the Settings Appearance card (verified).
- **About 450 colour literals in `style.css`,** about 210 of them inside hardware rules; the other 240 include dark-only choices such as `.chip { background: rgba(0,0,0,.45) }`, black shadows and white glows (verified by count; not all reviewed one by one).
- **Canvases:** the stage looks and the soul (`src/visuals.js`, `src/soul/`) draw with their own palettes on a dark ground (34 and 23 fixed fill or stroke colours). The video, the FM lab scope and the pattern previews read the tokens with `getComputedStyle` (verified for `video.js`, `fm-draw.js`, `patterns-tab.js`).
- **Code panel:** the editor's ground and colours come from the code theme (`code-themes`), not from the app tokens.

### Prototype

Screenshots with a light token set injected over neon (ground `#f5f3f8`, panels white, ink `#15111d` at 16.9:1, muted `#5a5169` at 6.8:1, accents `#b80f62` 5.8:1 and `#9a5200` 5.3:1) and the code in Light high contrast: Compose, Radio, Settings. Most of the interface already reads well with tokens alone (verified). What breaks (verified in the pictures):

- the text over the stage (tempo line, look menu, full screen) takes `--ink` and becomes dark on the dark stage;
- the profile and artist chips keep a fixed dark grey fill with dark text;
- lines at 1.6:1 are faint but acceptable as dividers;
- the LCD readouts (export format, compilation) stay dark, which looks right as a device.

## Goals / Non-Goals

**Goals:** a light app theme with high contrast, the stage kept as it is, the code readable, every tab usable at 400 px.

**Non-Goals:** light looks, a light hardware theme, a separate high contrast dark app theme, any change to videos.

## Decisions

### D1. A light variant of neon, third button

`data-ui="light"` next to `neon` and `hw`, buttons NEON, HW, LIGHT (it: CHIARO). It inherits everything from neon and overrides tokens; the looks' accent pairs get a light counterpart (`:root[data-ui="light"][data-look="…"]`), hand-picked so each accent reaches 4.5:1 on white. `color-scheme: light` in this theme, so native controls, scrollbars and pickers turn light.

Alternative: a separate light/dark switch that could apply to neon and to hardware. Rejected for now: hardware is a device look built on dark metal and lit LCDs; a light hardware would be a new design.

### D2. The stage stays dark

The stage area keeps its dark ground and the looks draw as today. The overlay controls on the stage get their own tokens (`--stage-ink`, `--stage-muted`), equal to neon's, in every theme. The stage frame gets a thin border and shadow suited to a light page.

### D3. Fixed colours become tokens

Shared rules (outside hardware) with fixed dark-only colours move to tokens: a chip fill token, an overlay token, a shadow token, a glow token. Hardware rules keep their fixed colours. Canvases outside the stage that draw fixed colours either read the tokens (radio curves, timeline) or keep a dark inner screen where they imitate a device (the Soul display shell, the cable).

### D4. Code and videos

With the code theme on Automatic, LIGHT gives Light high contrast (`code-themes` D4). Videos ignore the app theme: their stage is the look, their code follows the code theme.

## Risks / Trade-offs

- **Many small rules:** 240 literals to review; a missed one shows as a dark patch or invisible text. The browser check screenshots every tab and a contrast probe samples text against its computed background.
- **Accents per look:** some neon accents (yellow, cyan) cannot reach 4.5:1 on white without changing hue; the light counterpart is darker and less "neon".
- **Two themes to keep in step:** each new component must work in both; the checks run in both.

## Estimate

About 16 agent hours (tasks): tokens and accents 2, fixed colours 4, stage 1.5, canvases 3, switch and settings 1.5, checks and docs 4.

## Open Questions

Each with a recommended answer. Answered on 2026-10-29: the owner approved every recommendation (third button LIGHT/CHIARO, dark stage, Follow the system off by default, hand-picked accents, no light videos, Light high contrast on Automatic, after `code-themes`).

1. **A third theme next to NEON and HW, or a separate light/dark switch?** Recommended: a third button, LIGHT (it: CHIARO), a light variant of neon; hardware stays dark.
2. **Does the stage stay dark?** Recommended: yes; the looks are designed on dark, and the stage reads as a screen inside the light page.
3. **Follow the system's light or dark preference?** Recommended: an option "Follow the system" in Settings, off by default, mapping light to LIGHT and dark to NEON.
4. **Light accents per look: hand-picked or computed?** Recommended: hand-picked, one pair per look, checked for 4.5:1 by the contrast check.
5. **Videos in light?** Recommended: no; videos do not follow the app theme.
6. **Code in light:** Light high contrast by default (Automatic)? Recommended: yes.
7. **Order of work:** after `code-themes`? Recommended: yes, `code-themes` first (the code panel is the part the owner asked for), then LIGHT.

## Prototypes

Made on 2026-10-29 on the dev server (port 5214) with a light token set injected (nothing in the app changed), Italian interface, `luci-rosse` paused at bar 38. In the owner's local notes, `notes/prove-2026-10-29/temi-codice/`: `11-app-chiara-componi.png`, `12-app-chiara-radio.png`, `13-app-chiara-impostazioni.png`.
