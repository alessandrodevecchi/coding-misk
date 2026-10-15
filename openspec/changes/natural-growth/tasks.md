## 1. Generator

- [x] 1.1 Rule parameters in `crescendoSong`; Crescendo profile passes today's values (fixtures unchanged)
- [x] 1.2 Reveal: per-track set of written functions; compiler leaves out unrevealed ones; reveal steps
- [x] 1.3 Minimal entries and notes growing in short forms
- [ ] 1.4 Clones: copy a playing track's block, then small edits; typed as a paste (not yet: the requirement allows songs without clones)
- [x] 1.5 Spacing 4-8 then 2-6 bars, pauses after big moments (kept when the growth is squeezed), growth at most the written length (1.5 times under 48 bars; under 24 bars the Crescendo rules)
- [x] 1.6 Trials: intermediate values as real steps, typed as corrections

## 2. Profile

- [x] 2.1 Switch profile uses natural growth (with `performance-profiles`)

## 3. Checks and docs

- [x] 3.1 Node checks: entries short, one function per step, pauses after big moments, growth length, determinism
- [x] 3.2 Browser check: events after the growth equal the written song; plays without errors
- [ ] 3.3 A short video for the owner; docs, DEVLOG
