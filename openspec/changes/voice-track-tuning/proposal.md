# Proposal

## Why

The owner hears the voice track say the same few things too often, inside one song and from one song to the next. The analysis of 30 October measured why:

- **Chop with one phrase** (the "As the style" and "Discreet" presets): the chopped word covers a whole section and plays on every bar. Measured: from 16 to 160 bars, from 45 s to almost 5 minutes of the same word.
- **Refrain with one phrase**: the clip covers the whole song and the line returns every 2 or 4 bars in every quiet part, 8 to 24 times a song.
- **Mixed**: line A returns in every other part. With "many (up to 12)" A takes 5 or 6 parts out of 9 to 12, about 40 bars. The voice covers 75 % of a song on average.
- **No memory between songs**: the style's own lines are always drawn first. Over 120 measured songs the three lines of one style were each in one song out of three. A vocabulary has 12 entries per group.
- **My phrases**: the radio takes the use counts once when the session starts and never updates them, so the same least-used phrases win in every song of the session.
- **A small bug**: the entries of line A, drawn when the song compiles, can repeat the entries of another line of the same song.
- **Only the first entry of a line plays**: a line of several vocabulary entries is written `s("say_en_x").n("0 6 1 ~")`, and Strudel takes the rhythm from `s()`, so only the first entry sounds, once a bar. The captions were fixed in d2a7911 to show that one entry; the other entries are never heard.
- **All voice lines at the start of a grown song**: in a Live coder or Crescendo song every voice-track line is a `$:` line with its mask written out, and the code of the moment keeps every line that has no lane constant. Reproduced with radio seed `f7zvee` (song "Static", 152 bars, 12 voice clips): from bar 0 the code of the moment shows all 12 voice lines (771 characters out of 1178). Two specs already ask for the opposite: the voice instrument's line "appearing in the code when it first speaks" (`voice-instrument`, Voice instrument in the live build) and the code of the moment showing "only what plays in the current section" (`code-now`, Code of the moment).

## What Changes

The voice track says different things more often and repeats less, with no new option in the voice controls. The radio comes first; Compose shares the same code paths (the director's draw, `rewriteSpoken` for "New phrases" and "Fill with", the compiler), so the rules apply there too, except the memory between songs, which needs a session.

- **Chop**: a generated chop clip lasts at most 4 bars, plays every other bar and uses sparser rhythms. A one-phrase song no longer chops a whole section. A chop pattern may carry `every` (bars between two chops, default 1, so songs written before sound the same).
- **Refrain**: a generated refrain returns every 4 or 8 bars instead of 2 or 4. With one phrase it sounds at most 3 times in the song: a refrain pattern may carry `times` (the most starts in one clip, spread over the clip).
- **Mixed**: line A is heard at most 3 times in a song (the first time and at most 2 returns), spread over the song, never in two parts in a row.
- **Memory between songs (radio)**: a song does not use a line used in the 5 songs before it in the session: the style's lines, the vocabulary entries and the owner's own phrases. The style's lines are no longer always drawn first: a fresh style line is drawn with a chance of one half. When the pool runs out, the least recently used line comes back. The vocabularies stay as they are (12 entries per group); more phrases come over time from the owner's own phrases and from new ones generated later.
- **My phrases in a session**: the use counts a song draws with include the phrases of mine written into the songs before it in the same session.
- **Vocabulary lines written out**: a generated vocabulary line is written into the song as its list of entries, drawn so that no entry repeats another line of the same song. The compile-time draw (for lines a user wrote as `vocab:<group>`) also leaves out the entries another line of the track writes out.
- **Every entry plays**: a line of several entries is written `n("0 6 1 ~").s("say_en_x")`, so its entries play in turn, one per quarter of the bar. Captions and Coming next show the entry heard at each moment. The code snapshots `prova-voce-notte`, `prova-voce-taglio` and `example-voices` change sound and are updated.
- **Voice-track lines just in time**: in the code of the moment of a grown song (Live coder, Crescendo), a voice-track line shows shortly before it speaks, from the last code step in the 4 bars before its first start (a display step at the bar before when none falls there), and leaves at the first code step after its last start. Until then and after, the line plays from the hidden tail, as the narrator's lines do with "Narrator voice code" off, so the sound is identical. A voice line never takes typing time from the rest of the code: it appears at once, pasted, and is typed like a live coder only in a free gap of the typing plan. Classic and blocks code are unchanged.
- **Hide-the-code toggles in Options**: "V:N code" (today's "Narrator voice code", moved from the Comments group with the same behaviour and stored value) and a new "V:T code" sit together in the Options group, in Compose and in the radio's Custom section. "V:T code" off: every voice-track line plays from the hidden tail and none shows. Default on. Both are independent of Technical functions → "Voice effects": with it on and the code hidden, the folded line goes to the hidden tail.
- **Regression check, no behaviour change**: once in an owner's song the voice effects stayed unfolded with "Voice effects" on. Only a `say_` line without `.mask` does that and no current path writes one. A check now asserts that every generated voice line folds with "Voice effects" on.

## Capabilities

### New Capabilities

- `song/voice-instrument`: voice-track lines that vary: chop length, spacing and rhythms; refrain spacing and the most returns; line A in mixed; vocabulary lines written out without repeats; every entry of a line heard; the folded voice effects of every generated line. (The capability is introduced by the pending `voice-instrument` change; this change adds requirements to it.)
- `live-build/code-now`: voice-track lines in the code of the moment just in time. (Introduced by the pending `code-now` change; this change adds a requirement.)
- `live-build/code-writing`: the "V:N code" and "V:T code" toggles in Options, and how they meet the folded voice effects. (Introduced by the pending `code-writing` change; this change adds requirements.)

### Modified Capabilities

- `endless/radio-voice`: new requirements for the radio session's memory of voice-track lines and the session's use counts of my phrases.

## Impact

- `src/endless/director.js`: `CHOP_RHYTHMS`, the first line's draw in `spokenFor`, `morePhrases`, the chop clip in `spokenPlace` and `spokenParts`, `createSession` and `makeSong` (memory), `DIRECTOR_VERSION` 13 → 14.
- `src/endless/voice-track.js`: `extrasOf`, the first line's draw, the one-phrase refrain clip, chop clip length in `rewriteSpoken` and `placeGrownSpoken`.
- `src/song/spoken.js`: `lineOf` (array texts, de-duplication), `placeSpoken` (chop `every`, refrain `times`), `spokenCode` (`n(...).s(...)`), `lineEntries`, the validator (`every` on chops, `times`, array texts).
- `src/song/build.js`, `src/radio/next-changes.js`: captions and Coming next per entry.
- `src/song/writer.js`: `voiceCall` and a split of voice-track lines; `src/live/live-code.js`: the just-in-time split and display steps.
- `src/voices/mine.js`: session use counts, array texts in `vocabGroupOf`.
- Options toggles: `src/radio/song-controls.js`, `src/live/profiles.js`, `src/main.js`, `index.html`, `src/i18n.js`, `src/guide.js`.
- Docs: `docs/SONG-FORMAT.md`, `docs/ENDLESS.md`, `docs/knowledge/voice.md`, `docs/knowledge/decisions.md`.
- Snapshots and fixtures: code snapshots of the three voice songs, endless seed fixtures, levels of the voice songs, code-of-the-moment expectations of the checks.
- Radio sessions saved before this change replay with different voice lines (see design D10).
