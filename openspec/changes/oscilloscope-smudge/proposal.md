## Why

The owner tested the Oscilloscope look (`oscilloscope-visual`, `#58`) on 15 November. Two problems:

- **The smudges look badly made.** Smudged, Smudged graticule and the smudges of Real oscilloscope are round soft patches and arcs drawn from scratch: they read as blobs, not as grease, fingerprints or dust on glass.
- **Testing is slow.** The look's settings are at the bottom of the Settings page, so the stage is out of sight while a value changes.

## What Changes

- **Glass from real textures.** The smudges are built from a small set of open texture masks (fingerprints, smears, haze, drops, debris) under CC0, plus a few elements the app draws itself (a ridged fingerprint, dust and fine scratches, a cloth wipe arc). Textures whose licence does not allow shipping are only references: the app draws its own version instead.
- **Assembled per song.** The glass is put together from these elements by a seeded plan: a haze base, two to four prints near the edges, one or two smears, sometimes drops or a wipe arc, always dust. The seed is the song, so the glass is the same on every frame and in every export of a song, and different from song to song.
- **Lit like real glass.** Grease shows faintly in the room's light (Ambient light) and brighter near the beam, which it scatters. Two new parameters: Smudge (how much dirt) and Beam scatter (how much the grease catches the beam), both with song links like the others.
- **Credits and licences in the repository.** The masks live in `public/visuals/glass/` with a manifest (source URL, licence, role) and a `CREDITS.md` like `public/sounds/photos/CREDITS.md`; a check refuses a file without a manifest entry or with a licence outside the allowed list.
- **A settings button on the stage.** When the look is Oscilloscope, the stage toolbar shows an "Oscilloscope" button, styled like Code over, Widgets and Fullscreen. It opens a small scrollable panel with every Oscilloscope setting (screen, mode, Oversample, every parameter with its link, Defaults); changes show on the next frame. The Settings card stays and shows the same values.
- **Strings in English and Italian, the Guide card updated,** the knowledge note and the checks extended.

Not in scope: a picker of single smudge elements, a "new glass" button, glass for the other looks, a smaller glow canvas (`oscilloscope-visual` task 2.5b).

A preview of 15 candidates and three assembled examples, with their sources and licences, is in the owner's local notes (`notes/oscilloscope-sbavature/preview.html`). The element set below is a recommendation until the owner picks.

## Capabilities

### New Capabilities

- `stage/oscilloscope-glass`: the smudged glass from texture masks and drawn elements, the per-song assembly, the light model, the Smudge and Beam scatter parameters, the texture licences and credits.
- `stage/oscilloscope-panel`: the stage button and its live settings panel.

### Modified Capabilities

None in `openspec/specs/`. The open change `oscilloscope-visual` specifies the overlays with "no image files" (requirement "Screen overlays") and leaves the stage panel as open question 2; this change replaces the smudges of that requirement with textured glass and answers question 2 with a panel next to the Settings card. When both are archived, "Screen overlays" takes the wording of this change.

## Impact

- New `public/visuals/glass/` (masks as WebP, `manifest.json`, `CREDITS.md`), about 300 to 600 KB loaded only with the look and only when the overlay has smudges.
- `src/visuals/oscilloscope-rules.js` (the glass plan, two parameters, the panel's list of settings), `src/visuals/oscilloscope.js` (the glass and the scatter pass, the old smudge code removed), `src/visuals.js` (the song's seed to the look, masks loaded before a video's first frame).
- New `src/visuals/osc-controls.js` (the controls shared by the card and the panel); `index.html`, `src/main.js`, `src/style.css` (the button and the panel); `src/settings/settings.js` (the card built from the shared controls).
- `src/i18n.js`, `src/guide.js`, `docs/knowledge/visuals.md`, `AGENTS.md` (check lines).
- `tools/check-oscilloscope.mjs` and `tools/check-oscilloscope.cjs` extended; new `tools/make-glass-masks.sh` (how the masks were made from the sources, ImageMagick).
