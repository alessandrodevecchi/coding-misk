---
id: sounds
related: [sound-and-levels, styles, songs, material, strudel, from-a-reference]
code: [src/music.js, src/sounds/machines.js, src/sounds/catalog.js, src/song/validate.js, src/material/sound.js, src/sounds/soundfont-fix.js, public/samples/README.md]
checks: [npm run check:styles, npm run check:songs, node tools/check-style-sounds.cjs, node tools/check-sounds.cjs]
---

# Sounds and instruments

## What it is

Every sound the app can play, where it comes from, and which sounds the styles and songs ask for. The lists below are generated from the code and the shipped packages.

A sound is a name for `s()` or a track's `wave`. There are five kinds:

- **Synths.** Oscillators built into Strudel (`sawtooth`, `supersaw`, noise). Always there, no download.
- **Soundfonts.** General MIDI instruments, names start with `gm_`. Each name has several fonts; `n` picks one.
- **Drum machines.** Banks of the tidal-drum-machines set, picked with `.bank()`. A row (`bd`, `sd`, `hh`) is a sound of the bank.
- **Samples.** Folders of dirt-samples and other banks, loaded from GitHub when the app starts. Custom samples go in `public/samples/`.
- **FM and amp sounds.** Not new samples: an FM patch on a synth (rack device `fm`), and guitars made of a soundfont plus a sawtooth through drive.

## How it connects

- **Styles** name sounds in `waves`, `kits`, guitar `types` and texture `samples` ([styles.md](styles.md)).
- **Songs** name them in track settings: `wave`, `kit`, `sample`, `type` ([songs.md](songs.md)).
- **Material** composes sound kinds (`bell`, `reese`) as a wave plus an FM patch ([material.md](material.md)).
- **Levels.** A new sound must be measured before it ships ([sound-and-levels.md](sound-and-levels.md)).
- **The sound guard** replaces a broken soundfont part or a missing drum row with a stand-in, so a song never goes silent.

Samples and soundfonts load over the network. Offline, only synths play. The Sounds tab lists what really loaded in the browser.

## Options

<!-- generated:synths -->
Synths built into Strudel, accepted as `wave` (`SYNTHS` in `src/song/validate.js`): `sawtooth`, `saw`, `square`, `sqr`, `triangle`, `tri`, `sine`, `sin`, `supersaw`, `pulse`, `sbd`, `bytebeat`, `white`, `pink`, `brown`, `crackle`, `zzfx`, `z_sine`, `z_sawtooth`, `z_triangle`, `z_square`, `z_tan`, `z_noise`.

The sound menus of Compose (`WAVES` in `src/music.js`): `sawtooth` Sawtooth, `supersaw` Supersaw, `square` Square, `triangle` Triangle, `sine` Sine, `gm_epiano1` Electric piano (it: Piano elettrico), `gm_piano` Piano, `gm_vibraphone` Vibraphone (it: Vibrafono), `gm_rock_organ` Rock organ (it: Organo rock), `gm_drawbar_organ` Drawbar organ (it: Organo drawbar), `gm_distortion_guitar` Distortion guitar (it: Chitarra distorta), `gm_overdriven_guitar` Overdriven guitar (it: Chitarra overdrive), `gm_electric_guitar_clean` Clean guitar (it: Chitarra pulita), `gm_electric_guitar_muted` Muted guitar (it: Chitarra stoppata), `gm_electric_bass_finger` Electric bass (it: Basso elettrico), `gm_electric_bass_pick` Picked bass (it: Basso a plettro), `gm_acoustic_bass` Upright bass (it: Contrabbasso), `gm_string_ensemble_1` Strings (it: Archi), `gm_synth_strings_1` Synth strings (it: Archi synth), `gm_choir_aahs` Choir (it: Coro), `gm_flute` Flute (it: Flauto), `cowbell` Cowbell 808, `gm_celesta` Celesta, `gm_tubular_bells` Tubular bells (it: Campane tubolari), `gm_marimba` Marimba, `gm_lead_2_sawtooth` Lead saw, `gm_synth_brass_1` Synth brass (it: Ottoni synth), `gm_pad_warm` Warm pad (it: Pad caldo).
<!-- /generated -->

<!-- generated:soundfonts -->
General MIDI soundfonts in the shipped `@strudel/soundfonts`: 125. A name in **bold** is used by a style, a song or a Compose menu.

gm_accordion, **gm_acoustic_bass**, gm_acoustic_guitar_nylon, **gm_acoustic_guitar_steel**, gm_agogo, gm_alto_sax, gm_applause, gm_bagpipe, gm_bandoneon, **gm_banjo**, gm_baritone_sax, gm_bassoon, gm_bird_tweet, gm_blown_bottle, gm_brass_section, gm_breath_noise, **gm_celesta**, gm_cello, **gm_choir_aahs**, gm_church_organ, gm_clarinet, gm_clavinet, gm_contrabass, **gm_distortion_guitar**, **gm_drawbar_organ**, gm_dulcimer, **gm_electric_bass_finger**, **gm_electric_bass_pick**, **gm_electric_guitar_clean**, gm_electric_guitar_jazz, **gm_electric_guitar_muted**, gm_english_horn, **gm_epiano1**, gm_epiano2, **gm_fiddle**, **gm_flute**, gm_french_horn, gm_fretless_bass, gm_fx_atmosphere, gm_fx_brightness, gm_fx_crystal, gm_fx_echoes, gm_fx_goblins, gm_fx_rain, gm_fx_sci_fi, gm_fx_soundtrack, gm_glockenspiel, gm_guitar_fret_noise, gm_guitar_harmonics, gm_gunshot, **gm_harmonica**, gm_harpsichord, gm_helicopter, gm_kalimba, gm_koto, gm_lead_1_square, **gm_lead_2_sawtooth**, gm_lead_3_calliope, gm_lead_4_chiff, gm_lead_5_charang, gm_lead_6_voice, gm_lead_7_fifths, gm_lead_8_bass_lead, **gm_marimba**, gm_melodic_tom, gm_music_box, gm_muted_trumpet, gm_oboe, gm_ocarina, gm_orchestra_hit, gm_orchestral_harp, **gm_overdriven_guitar**, gm_pad_bowed, gm_pad_choir, gm_pad_halo, gm_pad_metallic, gm_pad_new_age, gm_pad_poly, gm_pad_sweep, **gm_pad_warm**, gm_pan_flute, gm_percussive_organ, **gm_piano**, gm_piccolo, gm_pizzicato_strings, gm_recorder, gm_reed_organ, gm_reverse_cymbal, **gm_rock_organ**, gm_seashore, gm_shakuhachi, gm_shamisen, gm_shanai, gm_sitar, gm_slap_bass_1, gm_slap_bass_2, gm_soprano_sax, gm_steel_drums, **gm_string_ensemble_1**, gm_string_ensemble_2, gm_synth_bass_1, gm_synth_bass_2, **gm_synth_brass_1**, gm_synth_brass_2, gm_synth_choir, gm_synth_drum, **gm_synth_strings_1**, gm_synth_strings_2, gm_taiko_drum, gm_telephone, gm_tenor_sax, gm_timpani, gm_tinkle_bell, gm_tremolo_strings, gm_trombone, gm_trumpet, gm_tuba, **gm_tubular_bells**, **gm_vibraphone**, gm_viola, gm_violin, gm_voice_oohs, gm_whistle, gm_woodblock, gm_xylophone
<!-- /generated -->

<!-- generated:drum-machines -->
Drum machines (`MACHINES` in `src/sounds/machines.js`, the tidal-drum-machines bank): 71. The Compose kit menu (`KITS`): `RolandTR909`, `RolandTR808`, `RolandTR707`, `RolandTR606`, `LinnDrum`, `AkaiLinn`, `LinnLM1`, `OberheimDMX`, `EmuSP12`, `AkaiMPC60`, `AkaiXR10`, `AlesisHR16`, `YamahaRX5`.

AJKPercusyn, AkaiLinn, AkaiMPC60, AkaiXR10, AlesisHR16, AlesisSR16, BossDR110, BossDR220, BossDR55, BossDR550, CasioRZ1, CasioSK1, CasioVL1, DoepferMS404, EmuDrumulator, EmuModular, EmuSP12, KorgDDM110, KorgKPR77, KorgKR55, KorgKRZ, KorgM1, KorgMinipops, KorgPoly800, KorgT3, Linn9000, LinnDrum, LinnLM1, LinnLM2, MFB512, MPC1000, MoogConcertMateMG1, OberheimDMX, RhodesPolaris, RhythmAce, RolandCompurhythm1000, RolandCompurhythm78, RolandCompurhythm8000, RolandD110, RolandD70, RolandDDR30, RolandJD990, RolandMC202, RolandMC303, RolandMT32, RolandR8, RolandS50, RolandSH09, RolandSystem100, RolandTR505, RolandTR606, RolandTR626, RolandTR707, RolandTR727, RolandTR808, RolandTR909, SakataDPM48, SequentialCircuitsDrumtracks, SequentialCircuitsTom, SergeModular, SimmonsSDS400, SimmonsSDS5, SoundmastersR88, UnivoxMicroRhythmer12, ViscoSpaceDrum, XdrumLM8953, YamahaRM50, YamahaRX21, YamahaRX5, YamahaRY30, YamahaTG33

Drum rows of the step sequencer (`ROWS`): `bd` Kick, `cp` Clap, `sd` Snare, `hh` Hat, `oh` Open, `rd` Ride. Ideas and grooves can also play `rim`, `lt`, `mt`, `ht`, `cr`.

Rows a kit does not have (`KIT_MISSING` in `src/music.js`); the row plays the nearest sound the kit has:

| Kit | Missing rows | Plays instead |
| --- | --- | --- |
| `RolandTR808` | `rd` | rd → cr |
| `RolandTR707` | `rd` | rd → cr |
| `RolandTR606` | `cp`, `rd`, `rim`, `mt` | cp → sd, rd → cr, rim → sd, mt → lt |
| `AkaiLinn` | `rim` | rim → sd |
| `LinnLM1` | `rd`, `cr`, `mt` | rd → oh, cr → oh, mt → lt |
| `AlesisHR16` | `rd`, `cr`, `mt` | rd → oh, cr → oh, mt → lt |
| `YamahaRX5` | `cp`, `rd`, `cr`, `mt`, `ht` | cp → sd, rd → oh, cr → oh, mt → lt, ht → lt |
<!-- /generated -->

<!-- generated:samples -->
Sample banks loaded at start by Strudel: `github felixroos/dough-samples/main/tidal-drum-machines.json`, `github felixroos/dough-samples/main/piano.json`, `github felixroos/dough-samples/main/Dirt-Samples.json`, `github felixroos/dough-samples/main/vcsl.json`, `github felixroos/dough-samples/main/mridangam.json`, `github tidalcycles/uzu-drumkit/main/strudel.json`. Loaded by the app: `github:tidalcycles/dirt-samples`, `/samples/strudel.json`.

Texture samples (`TEXTURES`, from dirt-samples; `vinyl` is synthetic crackle): `vinyl`, `numbers`, `industrial`, `metal`, `glitch`, `space`, `wind`, `crow`.
<!-- /generated -->

Custom samples: put a folder per instrument in `public/samples/` (`voce/01.wav` plays as `s("voce").n(0)`). WAV at 44.1 kHz is best, names without spaces. The voice folders `say_*` are made by `npm run voices` and are git-ignored. The full rules are in `public/samples/README.md` (Italian).

<!-- generated:fm-and-guitars -->
Sound kinds of the material generator (`SOUND_KINDS`): `bell`, `reese`, `growl`, `dirty`, `saw`, `square`. FM ranges (`FM_RANGES`): index 0-4; harmonicity 0.5/1/1.01/2/2.01/3/3.5/4; wave sine/triangle/square/sawtooth/pink/brown; index2 0.5-3; harmonicity2 1-10; decay 0.05-1; sustain 0-1.

| Guitar type | Name | Layered sounds | Base drive | High-pass |
| --- | --- | --- | --- | --- |
| `clean` | Clean (it: Pulita) | `gm_electric_guitar_clean` | 0 | 60 |
| `crunch` | Crunch | `gm_overdriven_guitar` + `sawtooth` | 1.5 | 70 |
| `distorted` | Distorted (it: Distorta) | `gm_distortion_guitar` + `sawtooth` | 3 | 80 |
| `metal` | Metal hi-gain | `gm_distortion_guitar` + `sawtooth` | 6 | 110 |
| `muted` | Palm muted (it: Palm mute) | `gm_electric_guitar_muted` + `sawtooth` | 4 | 90 |
<!-- /generated -->

### Sounds asked for

Every sound a style or a song names, with its kind. "not shipped" means none of the lists above has it.

<!-- generated:asked -->
- **drum machine**: `AkaiMPC60` (styles: dreamy-cyberpunk, drum-and-bass, jazz, lo-fi; 1 song), `AkaiXR10` (styles: classic-rock, country, jazz, lo-fi; 4 songs), `AlesisHR16` (styles: melodic-metal), `EmuSP12` (styles: dreamy-cyberpunk, drum-and-bass, lo-fi; 1 song), `LinnDrum` (styles: classic-rock, country, dark-cyberpunk, darksynth, dreamy-cyberpunk, melodic-metal, synthwave; 2 songs), `OberheimDMX` (styles: berlin-techno, dark-cyberpunk, darksynth, industrial, synthwave), `RolandR8` (styles: classic-rock, country, jazz, melodic-metal), `RolandTR606` (1 song), `RolandTR707` (styles: synthwave), `RolandTR808` (styles: acid, ambient, phonk; 5 songs), `RolandTR909` (styles: acid, berlin-techno, dark-cyberpunk, darksynth, drum-and-bass, gated-trance, house, industrial, progressive-house, pure-trance, trance; 31 songs), `YamahaRX5` (1 song).
- **sample**: `cowbell` (styles: phonk; 1 song), `glitch` (styles: dark-cyberpunk, drum-and-bass, industrial, phonk), `industrial` (styles: acid, berlin-techno, dark-cyberpunk, darksynth, industrial; 2 songs), `metal` (styles: berlin-techno, darksynth, industrial; 3 songs), `numbers` (styles: acid, berlin-techno, dark-cyberpunk; 6 songs), `space` (styles: ambient, dreamy-cyberpunk, drum-and-bass), `vinyl` (styles: ambient, dreamy-cyberpunk, lo-fi, phonk; 3 songs), `wind` (styles: ambient, dreamy-cyberpunk, lo-fi).
- **soundfont**: `gm_acoustic_bass` (styles: country, jazz, lo-fi; 1 song), `gm_acoustic_guitar_steel` (styles: country), `gm_banjo` (styles: country), `gm_celesta` (styles: ambient, dreamy-cyberpunk; 1 song), `gm_choir_aahs` (styles: ambient, dreamy-cyberpunk, drum-and-bass, melodic-metal, phonk; 3 songs), `gm_distortion_guitar` (styles: classic-rock, darksynth, industrial, melodic-metal; 8 songs), `gm_drawbar_organ` (styles: classic-rock, country, house), `gm_electric_bass_finger` (styles: classic-rock, lo-fi; 1 song), `gm_electric_bass_pick` (styles: classic-rock, country, melodic-metal; 3 songs), `gm_electric_guitar_clean` (styles: country; 3 songs), `gm_electric_guitar_muted` (styles: industrial, melodic-metal), `gm_epiano1` (styles: house, jazz, lo-fi; 6 songs), `gm_fiddle` (styles: country), `gm_flute` (styles: jazz, lo-fi; 2 songs), `gm_harmonica` (styles: country), `gm_lead_2_sawtooth` (styles: classic-rock, dark-cyberpunk, darksynth, melodic-metal, progressive-house, synthwave, trance; 1 song), `gm_overdriven_guitar` (styles: classic-rock, country), `gm_pad_warm` (styles: ambient, dreamy-cyberpunk, trance; 1 song), `gm_piano` (styles: jazz, lo-fi, progressive-house), `gm_rock_organ` (styles: classic-rock; 1 song), `gm_string_ensemble_1` (styles: ambient, melodic-metal, progressive-house; 2 songs), `gm_synth_brass_1` (styles: dark-cyberpunk, darksynth, synthwave), `gm_synth_strings_1` (styles: berlin-techno, drum-and-bass, synthwave; 2 songs), `gm_tubular_bells` (styles: ambient), `gm_vibraphone` (styles: ambient, dreamy-cyberpunk, drum-and-bass, jazz, lo-fi; 2 songs).
- **synth**: `sawtooth` (styles: acid, berlin-techno, classic-rock, country, dark-cyberpunk, darksynth, dreamy-cyberpunk, drum-and-bass, gated-trance, house, industrial, melodic-metal, phonk, progressive-house, pure-trance, synthwave, trance; 29 songs), `sine` (styles: ambient, dreamy-cyberpunk, drum-and-bass, lo-fi, phonk; 6 songs), `square` (styles: acid, berlin-techno, dark-cyberpunk, darksynth, dreamy-cyberpunk, drum-and-bass, gated-trance, house, industrial, phonk, pure-trance, synthwave, trance; 21 songs), `supersaw` (styles: ambient, berlin-techno, dark-cyberpunk, darksynth, dreamy-cyberpunk, drum-and-bass, gated-trance, house, phonk, progressive-house, pure-trance, synthwave, trance; 30 songs), `triangle` (styles: ambient, dreamy-cyberpunk, drum-and-bass, progressive-house; 5 songs).
<!-- /generated -->

### Missing sounds

<!-- generated:missing -->
Sounds asked for and not shipped:

- none: every sound a style or a song names is shipped.

Drum rows asked for that a kit does not have:

- `RolandTR606` has no `cp`: plays `sd`.
- `RolandTR606` has no `rd`: plays `cr`.
- `RolandTR808` has no `rd`: plays `cr`.

Soundfont parts that are broken upstream (`SOUNDFONT_FIX`, played from a stand-in by the sound guard):

- `gm_vibraphone` font 0 notes 84-127 is broken in the library: plays font 2.
- `gm_electric_bass_finger` font 1 is broken in the library: plays font 0.
- `gm_slap_bass_2` font 2 is broken in the library: plays font 0.
- `gm_gunshot` font 11 is broken in the library: plays font 3.
<!-- /generated -->

What Strudel does not have at all, and how the app gets close:

- **Sung vocals.** No singing voice. The voice instrument speaks lines with system voices ([voice.md](voice.md)).
- **A real 303.** Acid lines are a sawtooth with a resonant filter (the `acid` arp preset with a high `reso`).
- **Real amp guitars.** Guitars are a soundfont layered with a sawtooth and driven ([music-engine.md](music-engine.md)).
- **Orchestral sections.** Only single GM instruments (`gm_string_ensemble_1`, `gm_brass_section`) and the VCSL bank.
- **Many soundfonts are never used.** Names not in bold above are free to try: sitar, koto, kalimba, steel drums, saxophones, harpsichord.

## Example

A style asks for a banjo and a harmonica:

```json
{"hook": {"presets": ["richiamo"], "waves": ["gm_harmonica", "gm_fiddle"]}, "pad": {"presets": ["staccato"], "waves": ["gm_banjo"]}}
```

`npm run check:styles` accepts any `gm_` name, so a typo passes it. The "asked" table above marks a wrong name as "not shipped", and `node tools/check-style-sounds.cjs` (dev server) confirms every name in the browser.

## Where to read more

- [sound-and-levels.md](sound-and-levels.md): levels, rack devices, the sound guard.
- [docs/ARCHITECTURE.md](../ARCHITECTURE.md): the sound browser and the sound guard.
- [Strudel samples](https://strudel.cc/learn/samples/) and [synths](https://strudel.cc/learn/synths/).
