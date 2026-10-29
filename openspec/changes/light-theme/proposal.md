## Why

The whole app is dark: the neon theme and the hardware theme both sit on near black. The owner wants a light option with high contrast: a white or very light ground with black or dark text, for the code (the `code-themes` change offers Light high contrast) and for the app around it.

## What Changes

- **A light app theme, "LIGHT" (it: "CHIARO"),** a third choice next to NEON and HW in the top bar and in the Settings "Appearance" card. It is a light variant of neon: same layout, same fonts, light ground, dark text, darker accents per look.
- **Light tokens:** ground, panels, lines, ink and muted in a light set, and for each look an accent pair darkened for contrast on white. Text at least 7:1, accents and muted text at least 4.5:1.
- **The stage stays dark:** the looks, the soul and the visuals are drawn for a dark ground and stay as they are, framed in the light page. The text over the stage (tempo line, look menu, full screen button) keeps dark-stage colours.
- **Shared parts that today assume a dark ground** get tokens instead of fixed colours: chips, overlays, shadows, dimmed controls, scrollbars, the native controls' colour scheme.
- **Canvases outside the stage** (radio curves, timeline, FM lab scope, pattern previews, the Soul display shell) read the light tokens or keep a dark inner screen where they imitate a device.
- **The code panel** uses Light high contrast when the code theme is Automatic (`code-themes`).
- **Hardware stays dark:** HW has no light variant.
- **Videos are not affected:** their look and code colours do not depend on the app theme (the code follows the code theme).
- **Saved, in the backup, reset with the other settings.** An option "Follow the system" (off by default) picks LIGHT or NEON from the system preference.
- **Out of scope:** light versions of the looks, a light hardware theme, a high contrast dark app theme.

## Capabilities

### New Capabilities

- `light-theme`: a light app theme next to neon and hardware, with dark stage and readable contrast.

### Modified Capabilities

None in `openspec/specs/`. Depends on `code-themes` for the code panel (Automatic picks Light high contrast).

## Impact

- **Code:** `src/style.css` (light token set, per-look light accents, fixed colours replaced by tokens, about 240 colour literals outside the hardware rules to review); `src/main.js` (theme switch, `color-scheme`); canvases that draw with fixed colours outside the stage (`src/soul/display.js`, `src/soul/cable.js`, radio curves, timeline); top bar buttons, Settings, `src/i18n.js`, `src/guide.js`.
- **Checks:** a browser check with screenshots of every tab in LIGHT (both languages, 400 px), a contrast check of the light tokens on every look; `check-settings.cjs`, `check-backup.mjs`, `check-modes.cjs`, `check:guide`.
- **Docs:** `docs/DESIGN-SYSTEM.md`, `docs/knowledge/` (settings, decisions).
