# Design

## Context

See proposal.md. Pointers checked at `490c186` (`develop`):

| What | Where |
| --- | --- |
| The overlays, cached in two canvases (under and over the beam) | `src/visuals/oscilloscope.js` `overlayOf` (smudges: the `smudged` branch, `seeded(4242)`) |
| Settings model, parameters, links, defaults | `src/visuals/oscilloscope-rules.js` `PARAMS`, `OSC_DEFAULTS`, `SHOWN`, `oscSettings` |
| The look's frame, the module loaded on first use | `src/visuals.js` `drawOscilloscope`, `oscLoad`, `loadLook` |
| The song's seed for the stage | `src/main.js` stage object, `seed: () => (fv ? fv.seed : (song && song.id) || '')` |
| Settings card, its handlers | `src/settings/settings.js` `oscilloscopeCard`, `setOsc` and the `data-osc-*` handlers |
| Stage toolbar | `index.html` `.hud-row` (`#sv-allow`, `#code-over-btn`, `#sw-btn`, `#fs`), `src/style.css` `.chip`, `.sw-chip`, `.sv-chip` |
| Credits of shipped media | `public/sounds/photos/CREDITS.md` |

The owner's preview (local notes, `notes/oscilloscope-sbavature/`) holds the 15 candidates, their sources and licences, the masks made from them and three assembled examples. It also has the light model below, drawn with a canvas, and sliders for Smudge, Ambient light and Beam scatter.

## Goals / Non-Goals

**Goals:** smudges that read as grease, prints and dust on glass; a different glass for every song, repeatable; only files we may ship, with their credits; settings changed while watching the stage.

**Non-Goals:** a texture editor, per-element settings, glass on other looks, WebGL.

## Decisions

### D1. Masks, not pictures

A texture becomes a mask: grey levels to alpha, white colour, 512 × 512, WebP (PNG as a fallback is not needed: every supported browser decodes WebP). The colour comes from the drawing (Ambient light, the hue, Screen saturation), so one mask works for every hue and theme. `tools/make-glass-masks.sh` records how each mask is made from its source (crop, levels, inversion); the sources themselves are not committed (they are 1K PBR sets with files we do not need).

### D2. The element set (recommended, until the owner picks)

From the preview, all CC0 (ambientCG, licence page https://docs.ambientcg.com/license/; Wikimedia Commons for the vector print):

| Role | Elements |
| --- | --- |
| Haze base (one, cover) | SurfaceImperfections008, SurfaceImperfections003, Smear008 |
| Prints (cropped patches, near the edges) | Fingerprints002 crops, Fingerprint-297594.svg (blurred, broken), the app's ridged print |
| Smears (whole) | Smear001, Smear005 |
| Drops (sometimes, cropped) | SurfaceImperfections001 |
| Debris (sometimes, cropped, small) | SurfaceImperfections013 |
| Drawn by the app | dust, hairs and fine scratches; a cloth wipe arc; the ridged print |

Left out: Smear003 and Smear007 (too uniform or too heavy as a whole screen, kept as candidates), Fingerprints005 and Fingerprints008 (barely visible). The Commons file `Fingerprint picture.svg` (CC BY-SA 3.0) and commercial "dust and scratches" overlays are references only: the ridged print and the dust are the app's own drawings.

### D3. The glass plan

`glassPlan(seed, overlay)` in `oscilloscope-rules.js`, pure: a seeded random (string hash, then a small PRNG) gives a list of elements `{ mask | draw, x, y, size, angle, alpha, crop }` in screen units (0..1 of the screen area). Rules:

- one haze base at alpha 0.35 to 0.65;
- 2 to 4 prints, each centred within 6 % to 20 % of the screen from an edge (people touch the edges);
- 1 or 2 smears anywhere in the middle 60 %;
- drops with probability 0.5, a wipe arc with 0.6, dust always;
- Real oscilloscope: half the prints and smears, no wipe arc, alphas × 0.6.

The plan does not depend on the size of the stage, so a 9:16 fragment and the 16:9 stage place the elements in the same places of the screen.

### D4. Drawing and light

- **The mask canvas.** The plan is drawn once into a mask canvas the size of the screen area, cached with the overlay by size, overlay and seed (the overlay key gets the seed).
- **Room light.** The mask, filled with the glass tint (the hue at Screen saturation, light 80 %), drawn with `screen` at `0.22 × Ambient light × Smudge` into the cached glass over the beam.
- **Beam scatter.** Each frame: the phosphor buffer blurred wide (about 22 px at 1080p), kept only where the mask is (`destination-in`), added with `lighter` at `0.9 × Beam scatter × Smudge`. It reuses the work canvas of Glow at a quarter size, so the cost is one more small blur and two copies. Measure at 1080p and 4K like the Cost section of `oscilloscope-visual`; if the scatter pass costs more than 2 ms on the software path at 1080p, draw it every other frame.
- The old smudge code (`seeded(4242)`, the patches and arcs) goes.

### D5. Seed and song change

`drawOscilloscope` passes `seed: stage.seed()`; the glass is rebuilt when it changes. A radio song or a generated song without an id uses its session seed and position, as `stage.seed()` already returns.

### D6. Loading the masks

`oscilloscope.js` loads the masks it needs (from the manifest) the first time an overlay with smudges is drawn; until they arrive the glass has no smudges (a few frames). `loadLook('oscilloscope')` also awaits the masks when the look's stored overlay has smudges, so fast videos and fragments never start without them.

### D7. Licences

`public/visuals/glass/manifest.json`: `[{ file, role, source, sourceUrl, licence, made }]`, licence one of `CC0-1.0` or `own`. `CREDITS.md` lists each file with its source and licence (attribution is not required by CC0, we give it anyway). `check:oscilloscope` reads both: every file listed, every entry has a file, the licence allowed, the total size within 600 KB.

### D8. The stage button and the panel

- **Button.** `#osc-btn`, a `.chip` with a small drawn icon (a sine in a rounded screen) and the label, `aria-expanded`, between Code over and Widgets. Shown only while the look on the stage is Oscilloscope (the look menu's value, the radio look and a section's look all count). Below 640 px the label hides, as `.sw-chip` does.
- **Panel.** A popover inside `#stagewrap` (so it works in full screen), anchored under the toolbar on the right, about 320 px wide, `max-height` the stage height minus the toolbar and a margin, scrolling inside. Below 640 px it is a sheet across the bottom of the stage. Panel surface and text use the app tokens (neon, hardware, light). It is not part of the stage canvas, so recordings and exports never show it.
- **Live.** Each control writes `coding-misk-oscilloscope` through the same `setOsc`; the frame reads the store each frame (as today), so the change shows on the next frame. Sliders update while dragging (`input`). The Settings card listens to the same store change and refreshes its values when it is open.
- **Shared controls.** `src/visuals/osc-controls.js` renders the rows (Screen, Mode, Oversample, each parameter with slider, value and link, Defaults) and binds their events; the card and the panel both call it. With the panel, the card shows every parameter (`oscilloscope-visual` task 2.2), and `SHOWN` goes.

### D9. Strings

| Key | English | Italian |
| --- | --- | --- |
| `oscBtn` | Oscilloscope | Oscilloscopio |
| `oscBtnTip` | Oscilloscope settings, applied at once (also in Settings → Oscilloscope) | Impostazioni dell'oscilloscopio, applicate subito (anche in Impostazioni → Oscilloscopio) |
| `osc:smudge` | Smudge | Sporco |
| `osc:smudgeHint` | How dirty the glass is: prints, smears and dust, different for each song. | Quanto è sporco il vetro: ditate, strisciate e polvere, diverse per ogni brano. |
| `osc:scatter` | Beam scatter | Diffusione dal raggio |
| `osc:scatterHint` | How much the grease catches the beam's light. | Quanto lo sporco raccoglie la luce del raggio. |
| `oscPanelClose` | Close | Chiudi |

The overlay names stay (Smudged, Smudged graticule; Sbavato, Reticolo sbavato).

### D10. Guide and knowledge

The Oscilloscope card in `src/guide.js`: *how* names the stage button and its panel; *know* says the glass changes with each song and stays the same in its videos, and that the textures are CC0 with credits in `public/visuals/glass/CREDITS.md`. `docs/knowledge/visuals.md`: the glass, the plan, the two parameters, the panel.

## Cost estimate

In agent hours (the owner's review rounds not counted):

| Part | Hours |
| --- | --- |
| Masks, `make-glass-masks.sh`, manifest, `CREDITS.md` | 1 |
| Glass plan (rules) and its Node checks | 1.5 |
| Drawing: mask canvas, room light, beam scatter, old code removed, loading and fast video | 2 |
| Shared controls, the stage button and panel (themes, full screen, phone), the card on the shared controls | 2.5 |
| Strings, Guide card, knowledge note, AGENTS.md lines | 0.5 |
| Browser checks, cost measurement, screenshots, DEVLOG | 2 |
| **Total** | **9.5** |

## Risks / Trade-offs

- **Textures can look repetitive** when the same crop appears in two songs: the crops' offsets and angles are seeded, and the plan mixes three sources per role.
- **Beam scatter costs a blur per frame.** Mitigated by the quarter-size canvas and the every-other-frame fallback (D4).
- **Masks are a new kind of shipped file.** The manifest check keeps licences honest; the size budget keeps the look light.
- **The panel covers part of the stage.** It is small, closes with Escape or a click outside, and the beam is centred so the right edge matters least.

## Open Questions

1. **Which elements.** *Recommended:* the set in D2. The owner picks from the preview; any candidate can be swapped without changing the plan's rules.
2. **Per song or one glass.** *Recommended:* per song, as asked. A setting "Same glass for every song" can come later if wanted.
3. **Button label.** "Oscilloscope" or a shorter "Scope". *Recommended:* "Oscilloscope" / "Oscilloscopio", hidden on phones (icon only).
4. **Default Smudge.** *Recommended:* 1 on Smudged and Smudged graticule; Real oscilloscope uses its lighter plan at the same value.
