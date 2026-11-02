## Context

My phrases (`openspec/changes/my-phrases/`) keeps one store. A phrase has a kind (`voice`, `explain`, `poetic`) and a tag whose meaning depends on the kind. The pick is `candidates()` in `src/voices/mine.js`. The phrase key is `keyOf(kind, lang, text)` in `src/voices/phrases.js`. The owner wants a line that all three can say, without typing it three times.

## Goals / Non-Goals

**Goals**

- One option "Any" in Who says it, for My phrases only.
- No change to draws when no phrase is Any.

**Non-Goals**

- No Any in built-in vocabularies.
- No migration and no new store field.
- No per-speaker choice for an Any phrase.

## Decisions

### D1. `any` is a fourth value of `kind`, not a flag

`KINDS` in `src/voices/phrases.js` gets `'any'`. `normalize` accepts it. `TAGS.any` is an empty list, so `validTag('any', tag)` is true only for no tag, and `normalize` already drops a tag that is not valid. Alternative: a list of kinds per phrase. Rejected: it changes the stored shape and the key.

### D2. Picking

`candidates()` in `src/voices/mine.js` changes `p.kind === kind` to `(p.kind === kind || p.kind === 'any')`. The tag test `!p.tag || p.tag === tag` already lets a phrase with no tag through, so an Any phrase matches every tag. The draw order and the stream name `mine/<kind>/<key>` stay. The least-used rule applies to the mixed pool. The snapshot (`mineSnapshot`) keeps `kind`, so Replay draws the same way.

### D3. Duplicates

`keyOf(kind, lang, text)` keeps the kind, so a voice phrase and an Any phrase with the same text have different keys. The rule is applied in `addPhrase` and `editPhrase`:

- `editPhrase` to kind `any`: find phrases with the same lang and text under any other kind. Merge them into one: keep the older id, sum `uses`, take the newer `last`, union `styles`, keep `on` true if any is on. Return `{ store, phrase, before, merged: [ids] }` so the tab can offer Undo.
- `addPhrase`: if an Any phrase with the same lang and text exists, reuse it (one more use), whatever kind was asked.
- `mergePhrases` (backup) matches by key as today. An Any phrase and a voice phrase with the same text from a backup stay two phrases until the user edits one. This is a known edge.

### D4. Form and row

`src/voices/voices-tab.js`: the kind select gets Any (`phKind:any`, with a drawn icon, no emoji). When kind is Any, the tag select is not rendered and the tag value is cleared on change. The row label shows "Any" in the tag position. The kind chips get an Any chip with its count. `groupsOf` in `src/voices/phrases.js` lists Any as its own group, after the three kinds.

`src/i18n.js`: `phKind:any` ("Any" / "Chiunque") and a short hint ("Any voice can say it" / "Può dirla qualsiasi voce"), EN and IT.

### D5. Samples

The sample file is `say_<lang>[_<speaker>]/<slug>.wav`, so a second speaker means a second file. `lineSamples` in `src/main.js` and the preparation of samples resolve the speaker per role: `speakerOf` for the voice track, the narrator's speaker from `voiceOf(T)` settings. For an Any phrase the needs list gets one entry per distinct bank among the three roles. `phraseFiles` and the usage answer in `src/voices/samples.js` count the Any phrase's slug in every bank where one of the roles speaks, and the protect list marks those files as used. Delete follows `phraseFiles`.

### D6. Checks

`tools/check-phrases.mjs`: `candidates` with Any, tag match, `validTag`, merge, reuse, snapshot. `tools/check-voices-tab.cjs`: the form (Any hides the tag, clears it), the row label, merge toast, delete count with two speakers.

## Risks / Trade-offs

- An Any phrase widens the pool of every draw, so a user with many Any phrases hears fewer built-in lines at the same share. That is the intent.
- Two speakers make two files for one phrase. Delete removes both.

## Estimate

About 1 agent hour: store and pick 0.25, form and labels 0.25, samples per speaker 0.25, checks 0.25.

## Open Questions

- Merging a voice phrase with a mood into Any loses the mood. Recommended: accept it and show the Undo toast, because Any has no tag by the owner's rule.
