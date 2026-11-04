# Research notes

## Baseline (probe, 2026-11-04)

The probe grew 12 songs per style and profile (20 styles, Crescendo and Live coder), plus artist and compilation runs, 440 songs in all. The first sounding line of each build was classified.

| Profile    | Kick first | Most common exact line                    | Distinct first lines |
| ---------- | ---------- | ----------------------------------------- | -------------------- |
| Crescendo  | 94%        | `$: s("bd").bank("RolandTR909")`, 36%     | 97 of 140            |
| Live coder | 73%        | `$: s("bd").bank("RolandTR909")`, 18%     | 117 of 140           |

In Crescendo, the kick pattern was `bd` in 94% of songs. In Live coder it was `bd` in 48% and `bd*4` in 11%. Most of the 80% of Live coder openings drawn from the seed came from the 14 styles without `growthShapes.openings`.

## Kick hits of the grooves

The starts a groove's kick contains (16 steps, `x` = kick):

| Groove                                          | Kick               | Starts it contains        |
| ----------------------------------------------- | ------------------ | ------------------------- |
| trance, rolling, techno, hard, synthwave, metal | `x...x...x...x...` | one, pair, two, four, push, off |
| rock                                            | `x.......x.x.....` | one, pair, two, off       |
| train                                           | `x.......x.......` | one, pair, two, off       |
| rockChorus                                      | `x.x.....x.x.....` | one, pair, two, off       |
| breakbeat                                       | `x.....x...x.....` | one, pair                 |
| boombap                                         | `x......x.x......` | one, pair                 |
| phonk                                           | `x......x..x.....` | one, pair                 |
| dnb, halftime                                   | `x.........x.....` | one, pair                 |
| gallopDrums, blast                              | busy               | one, pair, two            |
| pulse                                           | `x...............` | one                       |
| swing                                           | no kick            | none (the ride leads)     |

## Openings per style

Kick-led share means the weight of slow, full-kick, filtered and broken over the weight of all the openings listed. Live-coder-only openings (typed, voice, muted-base, mid-set) count in Live coder only. The probe target per style is this share, within 15 points.

| Style             | `openings`                                                                 | `kicks`                         | Kick-led (LC) | Reason |
| ----------------- | -------------------------------------------------------------------------- | ------------------------------- | ------------- | ------ |
| house             | full-kick 2, filtered 2, slow 1, broken 1, chord 2, bass 1, top 1, muted-base 1 | four 3, one 1, two 1       | 55%           | Kick or filtered kick first, the organ or keys stab is the other classic start |
| trance            | full-kick 3, filtered 2, slow 1, pad 1, melodic 1, top 0.5, typed 0.5      | four 4, one 1                   | 67%           | Kick-led intros for the mix, sometimes a pad or an arp first |
| pure-trance       | full-kick 3, filtered 1, slow 1, pad 1, melodic 1, typed 1                 | four 4, one 1                   | 63%           | As trance; keeps its current weights for full-kick and typed |
| gated-trance      | full-kick 3, filtered 1, slow 1, pad 1, mid-set 1, top 0.5                 | four 4, one 1                   | 67%           | The gated pad can lead; keeps its current mid-set |
| progressive-house | filtered 2, full-kick 2, slow 1, melodic 2, chord 1, pad 1, bass 1, top 1  | four 3, one 1, push 1           | 45%           | Long filtered builds, a pluck or piano can start alone |
| berlin-techno     | full-kick 2, filtered 2, slow 1, broken 1, top 1, bass 1, typed 1          | four 3, one 1, off 1            | 67%           | Kick first, or hats and a rumble bass before it |
| acid              | filtered 3, full-kick 1, slow 1, bass 3, typed 1                           | four 2, one 1                   | 56%           | The acid line alone is the genre's signature start |
| industrial        | broken 2, full-kick 1, slow 1, filtered 1, top 1, bass 1, typed 1          | one 1, two 1, four 1, push 1, off 1 | 63%       | Hard, irregular kick figures; metal percussion first |
| ambient           | pad 3, melodic 1, chord 1, typed 1, voice 0.5                              | one 1, off 1                    | 0%            | Opens on a drone or a pad; the kick (if any) comes late |
| lo-fi             | chord 3, bass 2, melodic 1, pad 1, top 1, slow 1, typed 1                  | one 1, pair 2, two 1            | 10%           | Keys or a soft bass loop first, the dusty beat drops in |
| jazz              | top 3, bass 3, chord 2, melodic 1, typed 0.5                               | one 1, two 1                    | 0%            | Ride, walking bass or piano comping; no kick-led start |
| phonk             | melodic 3, bass 2, broken 1, slow 1, top 1, voice 1                        | one 1, pair 3                   | 22%           | The cowbell melody or the sub bass first; chopped voice where it exists |
| drum-and-bass     | broken 3, top 2, pad 2, bass 1, filtered 1, melodic 1                      | pair 3, one 1                   | 40%           | The break or its hats, or an atmospheric pad intro |
| synthwave         | melodic 2, pad 2, bass 2, chord 1, full-kick 1, slow 1, filtered 1         | four 2, two 2, one 1            | 30%           | Arp or octave bass first, the gated kick enters later |
| darksynth         | bass 2, full-kick 2, melodic 2, filtered 1, slow 1, pad 1                  | four 2, two 1, one 1            | 44%           | A heavy bass or the kick, harder than synthwave |
| dark-cyberpunk    | pad 2, bass 2, melodic 1, broken 1, filtered 1, full-kick 1, typed 1       | two 2, one 1, push 1            | 33%           | Dark drone or bass first, then a tense beat |
| dreamy-cyberpunk  | pad 3, melodic 2, chord 1, top 1, slow 1                                   | two 2, one 1                    | 13%           | Haze and bells first, a soft halftime beat later |
| classic-rock      | chord 3, top 1, full-kick 1, slow 1, bass 1, melodic 1                     | two 2, one 1, four 1            | 25%           | The guitar riff or chords first; a hi-hat count-in |
| melodic-metal     | chord 2, full-kick 2, melodic 2, pad 1, top 1                              | four 2, two 1                   | 25%           | Riff, lead or choir intro, or the double kick at once |
| country           | chord 3, bass 1, top 1, melodic 1, slow 1                                  | two 3, one 1                    | 14%           | Strummed guitar or banjo first, the train beat after |

Notes:

- `four`, `push` and `off` are weighted only where the groove can play them, or where the style wants that figure on purpose (industrial). The `pair` start gives variety to broken and boom-bap kicks.
- The weights of acid, ambient, lo-fi, gated-trance, pure-trance and house replace the current ones; their old ids keep similar weights.

## Sounds the app can play

- **Drum machines.** A recipe kit must be in `MACHINES` (`src/sounds/machines.js`, 71 bank ids). The samples come from the drum machine index that Strudel loads at run time (`tidal-drum-machines.json`). Songs play six rows only: `bd cp sd hh oh rd` (`ROWS`, `src/music.js`). Fills also play `cr`, and the `cowbell` hook wave plays `cb` from `RolandTR808`. A missing row falls back to the nearest one only for the kits in `KIT_MISSING` (`src/music.js`); for every other kit a missing row is silent.
- **Melodic sounds.** Recipe `waves` accept the oscillators and synths of `SYNTHS` (`src/song/validate.js`), the curated `WAVES` (`src/music.js`) and any `gm_*` name of the installed soundfont list (`node_modules/@strudel/soundfonts/gm.mjs`, 128 names). Avoid `gm_slap_bass_2` and `gm_gunshot` (broken fonts, `src/sounds/soundfont-fix.js`).
- **Texture** samples are a fixed list (`TEXTURES`: vinyl, numbers, industrial, metal, glitch, space, wind, crow). This change adds none.
- **Guitar** recipes name `types` (`GUITAR_TYPES`), not waves. This change adds none.

### Rows of the candidate drum machines

Read from the drum machine index on 2026-11-04. A tick means at least one sample. `KIT_MISSING` says whether the app already falls back for the missing rows.

| Bank id                | bd | cp | sd | hh | oh | rd | cr | Missing rows covered     |
| ---------------------- | -- | -- | -- | -- | -- | -- | -- | ------------------------ |
| RolandTR808            | ✓  | ✓  | ✓  | ✓  | ✓  | -  | ✓  | yes (`rd`)               |
| RolandTR707            | ✓  | ✓  | ✓  | ✓  | ✓  | -  | ✓  | yes (`rd`)               |
| RolandTR606            | ✓  | -  | ✓  | ✓  | ✓  | -  | ✓  | yes (`cp`, `rd`)         |
| RolandTR505            | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | complete                 |
| RolandTR626            | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | complete                 |
| RolandMC303            | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | -  | complete for the 6 rows  |
| RolandCompurhythm78    | ✓  | -  | ✓  | ✓  | ✓  | -  | -  | no: add to `KIT_MISSING` |
| AkaiLinn               | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | yes (`rim`)              |
| KorgM1                 | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | complete                 |
| BossDR110              | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | complete                 |
| AlesisSR16             | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | complete                 |
| YamahaRY30             | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | ✓  | complete                 |
| MPC1000                | ✓  | ✓  | ✓  | ✓  | ✓  | -  | -  | no: add to `KIT_MISSING` |

Rejected: `RolandTR727` (percussion only), `BossDR55` and `CasioRZ1` (no `oh`), `SimmonsSDS5` (no `cp`, no `rd`).

## Instruments per style

Each addition is an existing bank id or sound name. "Kits" are added to `drums.kits`; the other columns add to `waves` of that role. The reason is the genre's usual instrument, from the sources below and general genre knowledge; the owner's listening pass (task 6.4) confirms or drops each one.

| Style             | + Kits                             | + Sounds by role                                                         | Reason |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------------ | ------ |
| house             | RolandTR808, RolandTR707, KorgM1   | pad `gm_piano`, `gm_percussive_organ`; bass `gm_synth_bass_1`            | Early and deep house used these boxes; piano and organ stabs are house staples |
| trance            | RolandMC303, RolandTR808           | pad `gm_synth_strings_1`, `gm_pad_halo`                                  | Late-90s groovebox kits; string and halo pads for breakdowns |
| pure-trance       | RolandMC303                        | pad `gm_pad_halo`, `gm_synth_choir`; hook `gm_lead_2_sawtooth`           | Same era; airy choir pad under the supersaw |
| gated-trance      | RolandTR707                        | pad `gm_synth_strings_1`, `gm_pad_poly`                                  | Hi-NRG roots of the gated sound; a chopped poly pad |
| progressive-house | KorgM1, RolandTR707                | pad `gm_pad_warm`; hook `gm_lead_4_chiff`                                | 90s progressive kits; a short-attack lead close to a pluck |
| berlin-techno     | RolandTR808, RolandTR606           | pad `gm_pad_metallic`; bass `gm_synth_bass_2`                            | Second kick colour and the small analog box; cold metallic pad |
| acid              | RolandTR606                        | bass `square`                                                            | The acid bass line's partner box; the line's other waveform |
| industrial        | RolandTR606, BossDR110             | hook `gm_orchestra_hit`; bass `gm_synth_bass_2`                          | Cheap analog boxes of early industrial and EBM; orchestra-hit stabs |
| ambient           | RolandCompurhythm78                | pad `gm_pad_halo`, `gm_pad_bowed`, `gm_fx_atmosphere`; hook `gm_fx_crystal` | A soft vintage rhythm box for the pulse; long evolving pads |
| lo-fi             | RolandTR808, MPC1000               | pad `gm_electric_guitar_jazz`; bass `gm_fretless_bass`; hook `gm_muted_trumpet` | Sampler and 808 kicks of the genre; jazzy guitar chords, a round soft bass, muted horn |
| jazz              | YamahaRY30, AlesisSR16             | pad `gm_electric_guitar_jazz`; hook `gm_tenor_sax`, `gm_muted_trumpet`   | Acoustic kits with several ride samples; guitar comping, sax and muted trumpet |
| phonk             | EmuSP12, AkaiMPC60                 | pad `gm_pad_choir`; hook `gm_piano`                                      | Memphis-era sampler drums; dark choir and piano loops |
| drum-and-bass     | RolandTR808, KorgM1                | pad `gm_pad_sweep`, `gm_pad_warm`; hook `gm_epiano1`                     | Jungle sub kicks and 90s rave kits; liquid keys and sweeping pads |
| synthwave         | AkaiLinn, RolandTR505              | pad `gm_epiano2`, `gm_pad_poly`; bass `gm_synth_bass_1`                  | 80s sampled-drum sound; FM electric piano and poly pads |
| darksynth         | RolandTR707                        | pad `gm_synth_choir`; bass `gm_synth_bass_2`; hook `gm_lead_8_bass_lead` | 80s box with a harder edge; dark choir and a heavy lead |
| dark-cyberpunk    | RolandTR808, RolandTR626           | pad `gm_pad_metallic`; hook `gm_lead_7_fifths`                           | Late-80s digital kit; metallic pad and an open-fifths lead |
| dreamy-cyberpunk  | RolandTR808, RolandTR626           | pad `gm_pad_halo`, `gm_epiano2`; hook `gm_fx_crystal`                    | Soft halftime kicks; hazy pads and glassy bells |
| classic-rock      | YamahaRY30, AlesisSR16             | pad `gm_piano`; hook `gm_electric_guitar_clean`                          | Acoustic-kit drum machines; rock piano and a clean lead guitar |
| melodic-metal     | AlesisSR16, YamahaRY30             | pad `gm_synth_strings_1`, `gm_church_organ`; hook `gm_violin`            | The home-recording metal drum box; symphonic strings, organ, violin lead |
| country           | AlesisSR16                         | pad `gm_piano`; hook `gm_electric_guitar_clean`                          | Acoustic-kit box; honky-tonk piano and a twangy clean guitar |

Notes:

- `RolandCompurhythm78` and `MPC1000` need a `KIT_MISSING` entry (`cp`, `rd`, `cr`, `rim`, `mt`, `ht` and `rd`, `cr`, `rim`, `mt`, `ht`) in the same change, so their missing rows fall back.
- The director picks kits and sounds uniformly. One added kit in a style with one kit gives the old kit half of the songs, which is the variety wanted.
- Taste rules (`docs/CONTEXT.md`) stay: no bright or cheerful additions for the dark styles.

## Earshot

Not needed for this change. The task is to map genres to banks and sounds the catalog already names by machine and family, which is genre knowledge. Earshot describes the timbre of rendered audio offline in Python; it would help to pick among many samples of one bank or to search sounds by description, which this change does not do. It stays parked.

## Sources

- [Attack Magazine: top ten classic drum machines](https://www.attackmagazine.com/reviews/the-best/top-ten-classic-drum-machines/10/)
- [Woodbrass: drum machines that shaped hip hop](https://woodbrass.com/en/blogs/legend/top-5-drum-machines-that-shaped-hip-hop)
- [LANDR: a 12-bit sampler in hip hop](https://blog.landr.com/sp-1200)
- [MusicTech: gated drum reverb for synthwave](https://musictech.com/tutorials/tips/how-to-create-authentic-vintage-drum-gated-reverb-for-synthwave-chillwave-music-styles)
- [Output: synthwave production](https://output.com/blog/best-plugins-for-synthwave)
- [Future Proof Music School: what is phonk](https://futureproofmusicschool.com/blog/what-is-phonk)
- [Violet Recording: how to make phonk beats](https://violetrecording.com/how-to-make-phonk-beats/)
- [Vintage Digital: the small analog box beside the acid bass line](https://www.vintagedigital.com.au/?p=189128)
- [Gearnews: the trance sound](https://www.gearnews.com/trance-sound-perfect-match/)
- [Produce Like A Pro: supersaw explained](https://producelikeapro.com/blog/supersaw-synth-explained/)
