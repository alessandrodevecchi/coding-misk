## Why

In My phrases, "Who says it" is voice track, narrator explaining or narrator poetic. A line that fits all three has to be typed three times, once per kind (`#82`, owner decision of 2026-11-02).

## What Changes

- **A fourth kind, "Any".** "Who says it" in Voices, My phrases gets the option Any. A phrase with kind Any can be picked by the voice track and by both narrator styles.
- **Picking.** The pick filter keeps phrases of the asked kind and phrases of kind Any. On/off, language, styles, share and the seeded draw are unchanged.
- **No tag.** An Any phrase has no tag and matches any tag. The tag select is hidden when Who says it is Any. Switching to Any clears the tag.
- **Duplicates.** Setting a phrase to Any when the same text and language exist under another kind merges them into one Any phrase. Saving a new line whose text exists as Any reuses that phrase.
- **Samples.** A sample depends on text and speaker. Speakers that are the same share the file. When the narrator and the voice track use different speakers, the Any phrase is made once per speaker, automatically. Delete removes the files of every speaker. Usage and protect lists treat an Any phrase as used by all three.
- **Unchanged.** Built-in vocabularies stay as they are. A built-in copied into My phrases becomes a user phrase and can be set to Any. The default for new lines stays voice with no tag. No migration: existing phrases keep their kind.

## Capabilities

### Modified Capabilities

- `app/my-phrases`: the kind Any, its pick, tag, duplicate and sample rules. The delta is written as ADDED requirements because `my-phrases` is not archived into `openspec/specs/` yet.

## Impact

- Changed: `src/voices/mine.js` (`candidates`), `src/voices/phrases.js` (`KINDS`, `validTag`, `keyOf`, merge on edit and add, `groupsOf`), `src/voices/voices-tab.js` (form, row label, kind chips), `src/i18n.js` (EN and IT), `src/main.js` (`lineSamples` and the speakers used for preparing samples), `src/voices/samples.js` (`phraseFiles`).
- Checks: `tools/check-phrases.mjs`, `tools/check-voices-tab.cjs`.
- No change to built-in vocabularies or the backup format. The only stored change is `kind: 'any'`.
