# Design

## Context

What the code does today (line numbers at `develop` 83f16bb):

- **FM kinds.** `SOUND_KINDS` and `FM_RANGES` in `src/material/sound.js`. `sound(r, …)` draws a random patch of a kind inside the ranges; `fmInRange` checks a device. The kinds with FM are bell, reese, growl, dirty, tine, clang, sub and organ; `square` is a plain wave. The FM index is capped one step per octave above 4 (`top`).
- **FM device.** The rack device `fm` (`src/song/rack.js:33-35`) writes `.fm(i).fmh(h)[.fmwave(w)].fmdecay(d).fmsustain(s)[.fm2(i2).fmh2(h2)]`.
- **FM in superdough 1.3.0** (`node_modules/superdough/helpers.mjs:390-480`, `applyFM`). The modulator is an oscillator (or a noise buffer for `pink` and `brown`) at carrier frequency × `fmh`. Its output goes through a gain of `fmi` and then a gain of the modulator frequency into the carrier's `frequency` parameter. So the carrier's frequency swings by `fmi × modulator frequency` Hz: `fmi` is the classic FM index. The optional envelope (`fmattack`, `fmdecay`, `fmsustain`, `fmrelease`) scales the modulator output, so the index falls from `fmi` to `fmi × fmsustain` over `fmdecay`. `fm2` drives the first modulator's frequency in the same way. `applyFM` is called by the synth oscillators, supersaw, pulse and the wavetable source (`synth.mjs:190`, `:338`, `:537`, `wavetable.mjs:320`), not by the sampler.
- **Sounds tab.** `src/sounds/browser.js` (`createSoundBrowser`): categories (`CATEGORIES` in `src/sounds/catalog.js`), cards, list and pads views, an inspector with Play, Stop, Use, Try in a pattern, Copy, Favourite. Play goes through the main player (`loadFree`, `src/main.js:3844`), the play triangle. "Use" calls `useSound` (`src/main.js:3826`).
- **Preview player.** `createPreview(app)` in `src/player/preview.js`: rides the song's scheduler while it plays, a bare Cyclist alone. Two instances today: Compose (`src/main.js:2875`) and the radio (`src/main.js:4018`). The expression drops `.analyze` so the visuals stay dark (pattern-preview D3).
- **Loop builder.** `loopSong(item, { rack, … })` in `src/library/patterns.js:202` builds a 4-bar song of one part and accepts a rack.
- **Analysers.** `.analyze(id)` creates a superdough analyser; `getAnalyzerData('time', id)` reads it (`superdough.mjs:369-397`). The stage visual sums every analyser while the main player plays (`src/visuals.js:82-95`); the hardware LEDs read named ids only (`src/hardware.js:99`).
- **Riser.** `music.js:539-546` writes the riser as `s("white*N")` with a rising high-pass and gain. `RISER_SOUNDS = ['noise']` (`src/endless/steering.js:60`); the console's "Suono" menu lists it (radio-arrangement D11).

## Goals / Non-Goals

**Goals:**

- Hear each FM kind alone, quickly, without touching the song or the player bar.
- See what the FM amount does: a drawing that matches what superdough plays, and a live scope of the card's own sound.
- Reuse what exists: the kinds and ranges, the FM device, the loop builder, the preview player, the Sounds tab layout.
- Decide, with the owner, when riser sounds come.

**Non-Goals:**

- New FM kinds, or changing the random patches the generator draws.
- FM on samples, drums or voices (see `notes/prove-2026-10-26/analisi-fm-effetti.md`, local).
- A full FM editor (every operator, envelope stages, FM matrix). The card shows its patch and one control, the FM amount.
- Phase 2 riser work, unless the owner chooses "together" (D9).

## Decisions

### D1. Where: an "FM" category of the Sounds tab

| Option | Place | Notes |
| --- | --- | --- |
| **A (recommended)** | A category "FM" in the Sounds tab | FM kinds are sounds; the tab already has cards, pictures, an inspector, search and favourites. One more chip in the category row. |
| B | A new Groove Lab tab "FM" | Clear, but a ninth tab for eight cards; the Groove Lab already has eight tabs. |
| C | A kind in the Patterns tab | Patterns are parts (notes and rhythm), not sounds; the FM kind would need its own fields in the pattern store. |

Search finds the FM cards by their Italian and English names and by "fm". Favourites work on them like on other sounds (key `fm:<kind>`).

### D2. The cards: one fixed patch per kind

A pure table `FM_CARDS` in `src/sounds/fm-lab.js`. Each entry: `kind`, names (it, en), carrier wave, an `fm` device, a part (`basslines`, `arpeggios`, `chords` or `melodies` and a preset of that kind), a tempo, and the octave the part plays in. The patch lies inside the kind's rule in `sound()`, near the middle of each range, so it is a typical sound of the kind, repeatable, and the same every time the card plays. The table below is the proposal; the owner can change any value after listening.

| Kind | Italian | Carrier | FM (index × ratio) | 2nd operator | Part |
| --- | --- | --- | --- | --- | --- |
| bell | Campana | sine | 2 × 3.5, decay 0.2, sustain 0 | none | arpeggio |
| reese | Reese | sawtooth | 0.8 × 1.01, sustain 0.7 | none | bassline |
| growl | Ringhio | sawtooth | 2 × 1, square modulator | 1 × 5 | bassline |
| dirty | Sporco | sawtooth | 0.3 × 1, pink modulator | none | bassline |
| tine | Piano elettrico | sine | 1.8 × 1, sustain 0.1 | 0.8 × 7 | chords |
| clang | Metallo | sine | 2.8 × 2.76, sustain 0.15 | 0.8 × 4.5 | melody |
| sub | Sub | triangle | 1.8 × 0.5, sustain 0.8 | none | bassline |
| organ | Organo | sine | 1 × 2, sustain 1 | none | chords |

The Node check asserts that each patch passes `fmInRange`, lies inside the rule of its kind in `sound()`, and that the table has one card per FM kind of `SOUND_KINDS` (a new kind with FM fails the check until it gets a card).

### D3. Playing: a third preview player

- `labPreview = createPreview({ … })` in `src/main.js`, like the radio's. Its source returns `loopSong(part, { sound: carrier, rack: [fm], key: 'A', chords, bpm, beat: false })` for the selected card, mode and FM amount. Its orbit is 30, above every song's and below the radio preview's 40.
- **Riding or alone**: as in Compose. While a song plays, the card plays on the song's next bar at the song's tempo, so the owner can hear it against the song; stopped, it plays alone at the card's tempo.
- **One at a time.** Starting the lab preview stops the Compose preview, and the other way round. It stops when the user leaves the Sounds tab, on an export or recording (`busy`), and with its own button. Its button is the headphones (STOP while playing), per pattern-preview D10. The tab's existing Play buttons (main player, triangle) stay for the other categories.
- **Level.** The track type's default gain (the bass kinds at the bass gain, the others at their part's gain), through the master and the limiter like the song. No volume control of its own (as pattern-preview owner decision 3).
- **Changes from the next bar.** The FM amount, the play mode and another card swap the pattern at the next bar (`swap`), without a gap.

### D4. Play modes

| Mode | What plays | Why |
| --- | --- | --- |
| Frase (Phrase), default | the card's part, 4 bars | how the sound works in music |
| Nota tenuta (Held note) | one note per bar, the part's root, held for the bar | the scope shows a stable wave; the FM envelope is easy to hear |
| Salita FM (FM rise) | the held note on sixteenths, `.fm(saw.slow(4).range(0, top))` | the sound of an FM riser; lets the owner judge phase 2 by ear |

The rise expression is made by the pure `fmRise(expr, top)`, which replaces the index of the `.fm(…)` call in the compiled line. The Node check evaluates it with Strudel in Node and asserts that the index of the first and last sixteenth of 4 bars are 0 and `top` (within one step).

### D5. The wave drawing

- **Formula.** `fmWave(card, index, { cycles, points, at })` in `src/sounds/fm-lab.js` integrates the carrier phase sample by sample, as superdough does: `dφ = f·(1 + index · h · m(φm))·dt`, `dφm = f·h·(1 + …)·dt` with the second operator on the modulator, the carrier shape (sine, triangle, square, sawtooth) applied to the phase. `at` is the time in the note, so the envelope can be drawn (`index × env(at)`). Noise modulators (`pink`, `brown`) use a seeded noise, so the drawing is the same each time.
- **What is drawn.** Four small drawings at FM 0, 1, 2 and 3 (capped at the card's maximum), two carrier cycles each; the one nearest the slider is lit with the accent colour. The card thumbnail is the wave at the card's own index.
- **Slider.** "Quantità FM" / "FM amount", 0 to the card's maximum (`FM_RANGES.index` capped by the octave rule), step 0.05. In the hardware theme the range is drawn as a knob by the existing `src/hardware.js`, as every other range input. It redraws at once and plays from the next bar.
- **Canvas.** Drawn with the theme's `--a1`, `--muted` and `--line`, redrawn when the theme changes. The drawings are pure functions of the card and the index, so the Node check compares a few points with a direct numeric integration and asserts that FM 0 is the plain carrier.

### D6. The live scope

- **Source.** The lab preview keeps one analyser on its expression: `previewExpression(code, { orbit, analyze: 'fmlab' })` appends `.analyze("fmlab")`. The option defaults to none, so Compose and the radio previews keep their dark visuals (pattern-preview D3 unchanged).
- **Drawing.** While the lab preview plays, a `requestAnimationFrame` loop reads `getAnalyzerData('time', 'fmlab')` and draws one window, triggered on a rising zero crossing so the wave stands still for a held note. It stops drawing (and shows a flat line and "ferma" / "stopped") when the preview stops or the tab is hidden.
- **Visuals.** The stage visual skips analyser ids that start with `fmlab` (`src/visuals.js:88`), so the card does not move the stage while it rides a song. The hardware LEDs read named ids and need no change.
- **Fast export and video.** Not involved: the lab preview stops on an export or recording, and the fast export renders on its own page.

### D7. Actions

| Option | Action | Notes |
| --- | --- | --- |
| **A (recommended)** | "Usa nella traccia" / "Use in track": the wave and the FM device on the track selected in Compose | Reuses `useSound` and the rack; the track keeps its notes. Disabled with a tooltip when no melodic track is selected. |
| B | Flask "Prova in un pattern": the card's part opens in the Patterns tab | Needs the Patterns store to keep a rack on a pattern; better done with phase 2, which also needs sounds on patterns. |
| C | Both | More scope now for little gain. |

Copy copies the compiled line of the card in the current mode and FM amount, as the other sounds' Copy does.

### D8. Texts

Italian first, with English: category "FM"; intro "Suoni FM: un'onda che ne modula un'altra. Ogni scheda si ascolta da sola con le cuffie, anche mentre il brano suona, senza cambiarlo."; "Come cambia l'onda con la quantità FM"; "Quantità FM"; "Oscilloscopio"; "in ascolto" / "ferma"; modes "Frase", "Nota tenuta", "Salita FM"; "Usa nella traccia"; headphones tooltip "Ascolta da solo (non cambia il brano)". The Sounds card of the Guide gets a part on FM, in both languages. `npm run check:guide` must pass.

### D9. Risers: together or later

**What phase 2 would add.**

- A riser `sound` setting in the song format: `noise` (today, the default), `fm-up`, `fm-down`. The compiler writes the FM riser as a held note with a rising FM index and gain over the riser's bars (the code in the mockup), the noise riser as today.
- `RISER_SOUNDS` grows, so the console's "Suono" menu lists them; the director keeps `noise` unless a style names another sound (so the seed fixtures do not move).
- A "Riser" category in the Sounds tab with one card per riser sound, playable with the headphones, drawn like the FM rise.
- A `risers` kind in the Patterns tab: a saved riser (sound, bars, direction) that the "Suono" menu can pick.
- Later, a snare roll that speeds up (not FM, a drum riser).

**Cost and risk.** It touches the shared music engine: the compiler (`music.js`), the validator, the steering and the director, and the Patterns store and backup. Each needs its checks: code snapshots (`npm run snapshot:code`), level snapshots for songs with risers, `check:steering`, `check:patterns`, `check:mixer`, the fast export and the video. An FM riser with a rising index can get harsh and loud at the top; its levels must be measured, not guessed. Estimate 14 to 20 agent hours, more than phase 1.

**Recommendation: later, as its own change.** Phase 1 is UI only and safe to ship on its own. The "Salita FM" mode of phase 1 already lets the owner hear an FM rise on each card; his choice of which rises are good risers (ratio, length, top index) then becomes phase 2's input, instead of a guess. The "Suono" menu is already built for more options, so nothing in phase 1 blocks phase 2. If the owner prefers "together", the tasks of phase 2 are listed in `tasks.md` and the requirements in `specs/app/riser-sounds/spec.md`; they run after phase 1 is verified.

## Risks / Trade-offs

- **Three preview instances.** Two hooks on the main scheduler's `pattern` property would fight. `createPreview` hooks once per scheduler (`hooked === s`) per instance; the lab preview must stop the Compose preview before it starts (D3), and the browser check asserts that only one preview is on at a time.
- **Drawing versus sound.** The drawing is a model of superdough's FM; a Strudel upgrade could change `applyFM`. The Node check pins the formula; the browser check compares the scope's zero-crossing count for a held note with the drawing's (within 10%), so a drift shows up.
- **Noise modulators.** Sporco's wave is noisy and different every note; the drawing uses a fixed seed and says "rumore" in its caption.
- **Levels.** The patches are inside `FM_RANGES`, which already keep the composed sounds under clipping; the browser check measures each card's peak on the master in every mode (FM rise at the top index included) and fails above 0.97.
- **Phone width.** Four drawings become two by two below 600 px (mockup), the scope keeps the full width.
- **Strudel upgrade.** The lab depends on `applyFM`, `.analyze` and `getAnalyzerData`, already used by the app. A catalog rebuild (`npm run catalog:strudel`) shows changes in these functions.

## Mockups

Local, not committed: `notes/prove-2026-10-26/fm-spec/` (`fm-suoni-neon.png`, `fm-suoni-hw.png`, `fm-suoni-telefono.png`, `fm-suoni-telefono-hw.png`, and `riser-fase2-neon.png` for phase 2), made by injecting the section into the real Sounds tab with the app's own classes.

## Open Questions

1. **Place** (D1): FM category in the Sounds tab (recommended), a new tab, or a Patterns kind?
2. **Default mode** (D4): Phrase (recommended), Held note or FM rise?
3. **Actions** (D7): "Use in track" now and the flask with phase 2 (recommended), the flask now, or both?
4. **Playing over a song** (D3): ride the playing song like the Compose preview (recommended), or always alone with the song paused?
5. **Risers** (D9): later as their own change (recommended), or phase 2 in this change?
6. **Card names** (D2): the Italian names above (recommended), or keep the English kind names (bell, reese, …) everywhere?
