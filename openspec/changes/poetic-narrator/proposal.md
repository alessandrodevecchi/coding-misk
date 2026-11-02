## Why

The poetic narrator follows three different rules today, and the owner finds them confusing (2026-11-02):

- the explaining narrator speaks on every step that has a step line (`say`);
- the poetic narrator without Narrated growth speaks only where a track comes in, with an image in the bar before the entry;
- the poetic narrator with Narrated growth says the entry images and, on the steps with `say`, the step line on an entry's bar or a movement image on a bar with no entry (voice-full-controls D11, poetic-steps).

So Narrated growth changes both how many steps speak and what the poetic narrator says, and the poetic narrator still says a few plain step lines. Measured on luci-rosse in Crescendo: without Narrated growth the explaining narrator says 15 lines and the poetic one 7; with it, 35 and 38, of which 6 are plain step lines.

## What Changes

- **The poetic narrator speaks on the same occasions as the explaining one**: on the steps with `say`, with or without Narrated growth. Narrated growth only decides how many steps carry `say` (every step, or the key steps and about 30% of the others), for both styles. It no longer changes what the poetic narrator says.
- **What the poetic narrator says**:
  - at a track entry, only its image, with today's timing: the bar before the entry, or the entry's own bar on the song's first bar or the first bar of the radio window. Nothing else on the entry's bar;
  - on a step with `say` and no entry on its bar: a movement image;
  - never a step line, except as a fallback when no image exists for that moment (see below).
- **Every entry keeps its image**, also when no step on the entry's bar has `say`. Nothing the poetic narrator says today is lost. The narrator still says at most one line per bar (an image wins a shared bar) and still yields to the voice track.
- **Fallback to the step line.** When the poetic narrator has no image for a moment (a song or style replaces an image list with an empty one, or an image has no text in the current language), it says the step line instead of staying quiet. With the built-in vocabulary an image always exists, so this is a safety net. A missing sample keeps today's rule: the default voice speaks the line, else it stays silent.
- **The movement images take turns over the spoken steps**: consecutive movement images follow the list in order, counted over the steps that say one, so a line comes back only after the whole list, also when few steps speak.
- **Stage captions show what is heard.** The caption is the image. The step line stays as the small tag when it differs, as spoken-text-on-stage says; this is unchanged.
- **Texts follow.** The Guide cards for the two voices, the live build and Crescendo (English and Italian), the hints for Narrator style and Narrated growth, and the knowledge notes are updated. Lines that contradict the new rule are removed.
- **Saved radio sessions with a poetic narrator sound different** when they are played again: the music, the steps and the length stay the same, the narrator says more lines.

Not in scope: new image vocabularies, changes to the explaining narrator, the growth, the step lines a growth writes, or the voice track.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `live-build/voice-phrases`: when and what the poetic narrator says. This replaces the requirement "Poetic narrator with Narrated growth" (voice-full-controls) and "Poetic movement lines for steps without an entry" (poetic-steps). The capability is not yet in `openspec/specs/`: its earlier deltas are still in unarchived changes, so this delta adds the new requirement and the archive step removes the two older ones (task 6.3).

## Impact

- Code: `src/song/build.js` (`narration`, `stepSaid`, `voiceSamples`), `src/song/spoken.js` (`movementLine` index, no change to `poeticLine`).
- Texts: `src/guide.js` card `voices` ("Two voices": its `what` and the paragraph on the poetic style and Narrated growth), en and it; the cards `crescendo`, `growth-timeline`, `next` and `captions` are reread and stay true. `src/i18n.js`: `narratorStyleHint` and `liveNarratedHint`, en and it.
- Docs: `docs/knowledge/narrator.md`, `docs/knowledge/voice.md`, `docs/knowledge/decisions.md`, `DEVLOG.md`.
- Checks: `check:spoken` (poetic cases rewritten), `check-captions.cjs` (poetic counts), `check:phrases` (movement image keys), `check:samples`, `check:voice-heard`, `check:code`, `check:crescendo`, `check:endless`, `check:guide`, `check:knowledge`.
- No change to the growth, the music, the song lengths, the Crescendo, Live coder or director fixtures, so `CRESCENDO_VERSION`, `SHAPES_VERSION` and `DIRECTOR_VERSION` stay (design D7).
- Samples: no new texts. The movement images already have samples for every narrator speaker (poetic-steps D5); more songs now use them.
