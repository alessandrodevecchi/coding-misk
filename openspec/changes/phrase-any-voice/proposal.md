## Why

In My phrases, "Who says it" is voice track, narrator explaining or narrator poetic. A line that fits several of them has to be typed once per kind (`#82`, owner decision of 2026-11-02, revised the same day).

## What Changes

- **Five options in "Who says it".** Voice track, Narrator explaining, Narrator poetic (as today), plus "Both narrators" (explaining and poetic) and "All" (voice track, explaining and poetic).
- **Data as a list.** A phrase stores the kinds that can say it as a list, for example `kinds: ["explain","poetic"]`. The form offers only the five lists above. A later checkbox form could offer all seven combinations with no data change.
- **Picking.** A voice takes a phrase when its kind is in the phrase's kinds. On/off, language, styles, share and the seeded draw are unchanged.
- **Tag only for one kind.** The tag (mood, moment, entering track) exists only when the phrase has exactly one kind. With Both narrators or All the phrase has no tag, the tag field is hidden, and choosing them clears the tag. Such a phrase matches any tag.
- **Duplicates.** Widening a phrase merges it with phrases of the same text and language that have an included kind (uses summed, older id kept, styles united, Undo toast). Saving a text that already exists in a phrase that includes the asked kind reuses that phrase.
- **Samples.** One file per speaker that can say the phrase. The same speaker shares one file. Delete and the usage and protect lists count all of them.
- **Old phrases.** A phrase stored with a single `kind` is read as a one-item list and written back as `kinds` on load.
- **Unchanged.** Built-in vocabularies. A built-in copied into My phrases becomes a user phrase and can be given any of the five options. Radio and Compose saves stay voice track with no tag.

## Capabilities

### Modified Capabilities

- `app/my-phrases`: the kinds list, its pick, tag, duplicate and sample rules. The delta is written as ADDED requirements because `my-phrases` is not archived into `openspec/specs/` yet.

## Impact

- Changed: `src/voices/mine.js` (`candidates`, `mineSnapshot`), `src/voices/phrases.js` (`normalize`, `validTag`, `keyOf`, `find`, add and edit with merge, `groupsOf`, `mergePhrases`), `src/voices/voices-tab.js` (form, row label, kind chips, filters), `src/i18n.js` (EN and IT), `src/main.js` (`lineSamples` and the speakers used to prepare samples), `src/voices/samples.js` (`phraseFiles`), `src/settings/backup.js` (reads through `readStore`).
- Checks: `tools/check-phrases.mjs`, `tools/check-voices-tab.cjs`.
- Stored shape: `kind` becomes `kinds` (list). Built-in vocabularies are unchanged.
