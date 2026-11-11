---
id: decode
related: [library, settings, export, live-build]
code: [src/decode/tab.js, src/decode/misk-analyzer.js, src/decode/full.js, src/decode/writer.js, src/decode/store.js, src/decode/library.js, src/decode/library-panel.js, src/decode/library-store.js, src/decode/folders.js, src/decode/mixtapes.js, src/decode/autoplay.js]
checks: [npm run check:decode, npm run check:decode-library, node --no-warnings tools/check-backup.mjs, node --no-warnings tools/decode-measure.mjs, node --no-warnings tools/decode-edits.mjs, node tools/decode-similarity.cjs]
---

# Decode

## What it is

The Decode tab plays a track of the user's and writes its code while it plays (Live, level A) or from a whole-file analysis (Full, level B). The file stays on the device: the app keeps its analysis, settings and, where the browser gives one, a handle to the file.

The library around it (decode-library) is the "Another file" panel: "Choose a file…", the recent tracks and the files of the user's folders in one compact list, Autoplay, Previous and Next on the player bar, and mixtapes. The same list shows under the drop area of the empty tab.

## How it connects

- **The decode store** (`src/decode/store.js`, IndexedDB `coding-misk-decodes`, version 2): one record per file fingerprint, and a light index entry next to it (`index` store: name, title, mark, analysis version, where the file came from, last use). The lists, the marks, the order by recent, the cap and the backup's default read only the index. A record is read when its track opens, when Autoplay prepares it, or for the backup. Record and entry are written and deleted in one transaction; the index is rebuilt in the background when the two stores differ.
- **The library database** (`src/decode/library-store.js`, `coding-misk-decode-library`): folders with their handles, the folders' file index (path, size, date, tags read), single files of mixtapes, mixtapes. No audio, no decode data.
- **Folders** (`src/decode/folders.js`): the File System Access API (Chrome, Edge). The browser's permission is asked only inside a click; after a reload a folder's last rows show at once, waiting. The scan is depth first, sorted by name, skips dot names, keeps the extensions Decode opens, stops at 2000 files per folder and pauses every 100 entries.
- **Kinds and videos without sound:** every row has a kind icon from `src/icons.js` (a music note, a video, a crossed speaker for a video without sound). A video without an audio track (a screen recording) is not a broken file: the idle tag read (or opening it) stores `video: true, audio: false` in the folder index and the row keeps the normal style. It plays in silence for the length read from its header, on a silent clock (`createSilentClock`), with a comment placeholder in the code column (nothing evaluated, no record stored). With the Video look the stage shows the picture of the video file Decode plays, in time with its clock ([visuals.md](visuals.md)).
- **One rule for rows that cannot play** (`openWithSkips` in `tab.js`): Previous, Next and a mixtape's Play skip rows "not found" or waiting without opening them, skip a row that fails when opened, name the skipped rows in one note, and stop with a note when nothing playable is left (no loop with repeat).
- **Marks** ◆ Full and ◇ Live come from the index: a record remembers `where` (folder, path, size, date) so a folder's file is marked without reading it. A stale analysis (older `ANALYSIS_VERSION`) has no mark.
- **Autoplay** (`src/decode/autoplay.js`): the next row of the list or mixtape the track came from is prepared 30 s before the end (read, decoded within a 120 MB budget, fingerprint, stored record, a second level A worker). The hand-over starts the next original where the playing one ends; not ready, the tab waits, and after 3 s the sound starts and the code joins when the tempo is found.
- **Settings backup** ([library.md](library.md), [settings.md](settings.md)): the 100 analyses used last by default, every analysis with "Include all Decode analyses" (written in parts); mixtapes with folder names and paths, never handles.
- **The bench** (decode-refine D1): the test songs of `tools/decode-songs.mjs` (with the acid track and the arp-and-lead track, whose truth holds the lead notes) and the app's songs `luci-rosse` and one radio song frozen in `tests/snapshots/decode-radio-song.json`, exported by `tools/decode-export.cjs` with their timeline JSON. `tools/decode-measure.mjs` reads the hit times and sections of the timelines as truth; `tools/decode-similarity.cjs` fast-exports each file's level B song and compares its sound with the original against `tests/snapshots/decode-similarity.json` (a drop over 0.05 fails). The similarity targets of the spec are not met yet: the snapshot holds today's scores so the later groups can only improve them.
- **Playlists** hold generated songs; mixtapes hold references to the user's files. A decoded track reaches a playlist only through Open in Compose and a save.

## Analysis and writer rules (decode-refine part 2)

Groups 6 to 9 of `decode-refine`. Each rule keeps its numbers in one constant, so it can be tuned after listening; `ANALYSIS_VERSION` (`src/decode/model.js`) is 5, and a stored analysis of an older version has no mark and runs again.

- **Kick under the bass** (`KICK_RULE`, misk-analyzer): a flux peak in the kick band (at least 0.45 of the threshold) with a low-band rise on all four beats of a bar is a kick even where the pitch-fall test reads a bass note. The broadband click of the design does not tell a distorted acid bass from a kick: both attack in the 1-5 kHz band.
- **Hats and claps** (`HAT_RULE`, `CLAP_RULE`): a hat step is on above half the median of the strong hats of the last 4 bars. A clap must be darker than 1.3 times the lower third of the hat ratios of the last 6 seconds, reach half the strong hits of the snare band, and be noisy (spectral flatness at least 0.3; a synth note on the beat measures 0.11 to 0.22).
- **Level B main grid** (`GRID_RULE`, writer): a step is on when it is on in at least 60 % of the section's bars with drums; a variant must come back in at least 10 % of them.
- **Level A relock** (`RELOCK_BARS` 8): after 8 bars with kicks, level A measures tempo and phase again on those bars. A tempo in a ratio to the old one (half, two thirds, three halves, double) replaces it only with the claps' off-beat; the same tempo moves the phase by half a beat (kicks on the off eighths) or a sixteenth (hats only on odd sixteenths); a whole tempo within 0.1 BPM replaces the one found. Never after a tapped, picked or stored tempo. The tab starts the code again on the new grid (`relock` in the trail).
- **Chord quality per section** (`steadyQualities`, `HARMONY_RULE`): the section's majority for each root, unless the other quality has a confidence above 0.8 in at least two bars; a tie goes to the key's quality. A bar whose chroma shows a weak minor third and no major third (marked `third` by misk-analyzer) is minor where the key holds that minor chord (`quietMinors`).
- **Bass range** (`bassRange`): one window of 15 semitones per section, the one that holds the most notes; notes outside move by octaves; no notes in bars where the bass is below 20 % of the section's loudest. A wide supersaw bass is read with a looser YIN threshold (`BASS_RULE` 0.35) only on the step after a kick.
- **Top line and Lead** (`full.js`, `LEAD_RULE`): Essentia.js's `PredominantPitchMelodia` (150-2100 Hz), shifted by `MELODY_LAG` (60 ms), or misk-analyzer's YIN on the 200-2000 Hz band without Essentia.js; one note per sixteenth snapped to the key's scale within 40 cents. Its voicing drives the `vox`/`melody` lines only in bars where part 1's `top.up` hears a top line. The writer adds a `lead` code track, one loop of 1, 2 or 4 bars per section in scale degrees (`leadCode`), with no Lead in a section voiced on less than 30 % of its steps; under `vox` lines it starts muted (`hush`; `_$:` in Compose). Level A writes no Lead. Known limit: under a louder pad or arpeggio MELODIA follows them (13 % right on the arp-and-lead test song, 89 % on a hook over drums).

**Similarity check** (`tools/decode-similarity.cjs`, the measures in `tools/decode-similarity.mjs`): each bench file is decoded in level B, its song fast-exported by the app and compared with the original on the original's bar grid: rhythm per band (low 30-150 Hz, mid 150-2000 Hz, high 5-16 kHz), chroma, bass chroma, brightness ratio, band shares, the loudness arc, and two floor pairs (unrelated files) for scale. A score that drops more than 0.05 under `tests/snapshots/decode-similarity.json` fails; `--write` updates the snapshot. The spec's targets on the app songs and the test songs: low-band and high-band rhythm at least 0.5, chroma at least 0.85, bass chroma at least 0.8, brightness ratio between 0.75 and 1.33, each band's share within 0.10 of the original's. Not met yet: brightness and band shares wait for the sounds by measure (group 10). The arc of flat test songs moves between exports (task 11.3).

**Edit measures** (`tools/decode-edits.mjs`, D7): targets 10-30 % of bars edited, 2-8 edits per minute at 120-130 BPM, an average edit of at least 20 characters, at most 15 % small edits, at least 90 % of level B's section changes edited within one bar. The numbers per file are in the design (D7) and the DEVLOG.

## Options

| Option | Values | Where |
| --- | --- | --- |
| Autoplay | off (default), on; remembered in `coding-misk-decode-autoplay` | the panel, browsers with folders |
| Folder chip | All or one folder; remembered with the order in `coding-misk-decode-list` | the panel |
| Order | Name, Recent | the panel |
| Kind | All, Audio, Video (a video without sound is a video), with counts from the rows in memory; remembered with the chip and the order (`media` in `coding-misk-decode-list`), part of the context of Autoplay, Previous and Next | the panel |
| Search | name, artist or file name, case and accents ignored; not remembered | the panel |
| Mixtape repeat | off (default), on; kept with the mixtape | an open mixtape |
| Include all Decode analyses | off by default and on every visit of the settings page | Settings, backup card |

Numbers: 2000 files listed per folder, 2000 stored analyses (Live-only ones dropped first), about 20 kB of analysis per minute of audio, 100 analyses in a default backup, 30 s of preparation, a 120 MB budget for the prepared track's sound, 3 s of silence before a late next track's sound starts.

## Example

A folder "Demos" ordered by name, Autoplay on: the user opens "B" from the Demos chip. About 30 s before B ends, the next Demos track by name is read and decoded and its Live analysis starts. At B's end its sound starts exactly where B's ends (the hand-over skips the few milliseconds of its start the code's clock has passed) and the code column starts from the new track's first lines. Next on the player bar does the same at once; Previous opens the track before.

## Where to read more

- [proposal and design](../../openspec/changes/decode-library/design.md), the specs `decode/library`, `decode/autoplay`, `decode/mixtapes`.
- [decode-refine design](../../openspec/changes/decode-refine/design.md): the edit rule (D7), the bench and the similarity check (D1), drums, harmony and the top line (D2, D4, D5), with the measures before and after each group.
- [checks.md](checks.md): `npm run check:decode-library` and the browser check `tools/check-decode-library.cjs` (fake folders in the origin private file system).
- [decisions.md](decisions.md): marks by location, the cap per folder, the budget, the tags' timing.
