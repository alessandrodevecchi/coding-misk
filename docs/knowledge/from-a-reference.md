---
id: from-a-reference
related: [styles, artists, songs, patterns, music-engine, sounds, material, recipes-music, recipes-parts]
code: [tools/analyze-audio.py, tools/zoom-audio.py, styles, songs]
checks: [npm run check:styles, npm run check:songs, node --no-warnings tools/artist.mjs validate]
---

# From a reference to the app's material

How to turn a song, a video, an audio file, a MIDI file, a score or a written description into a style, an artist, a song or patterns. The app never plays the reference: it takes measures from it and writes new material with its own presets, rules and sounds.

Use a reference for tempo, harmony, groove, sound and mood. Do not copy a recognisable melody or lyric of a real work note for note: write new material on the measured harmony and rhythm.

## Inputs to ask for

Ask the owner for files, not links. Keep them outside the repository.

| Input | What it gives | Ask for |
| --- | --- | --- |
| Audio (WAV, FLAC, M4A, MP3, Opus) | tempo, key, drum grid, energy per bar, sections, brightness | the whole track, plus the start and end time of the part that matters |
| Video | its audio (extract with ffmpeg) and a mood from the picture | the same as audio; the picture is only a hint |
| Stems (separate drums, bass, music) | clean drum grids and basslines | them first when the owner has them: far better than a mix |
| MIDI file | exact notes, chords, tempo and meter | the track that holds the melody or chords |
| Score (MusicXML, PDF, image) | notes and harmony | MusicXML when possible; a PDF or image must be read by eye |
| Written description | mood, instruments, tempo feel | two or three moments that show it, and what not to do |

When the input is not enough, ask: which part matters, what the owner likes in it (groove, harmony, sound, mood), how close the result should be (inspired by or rebuilt), the length and use (a loop, a full song, a clip that starts at full energy), and which instruments are a must.

## What to measure

- **Tempo** in BPM, and whether half or double fits better.
- **Key and mode**: root, minor or major, a flat second (phrygian), a raised sixth (dorian), a tritone (locrian).
- **Chord loop**: the chords per bar and how long each one holds.
- **Meter and swing**: 4/4, 3/4, 5/4, 7/8; straight or swung eighths.
- **Groove**: kick, snare and hat on a 16-step grid; the bass rhythm.
- **Instruments and sounds**: what plays the bass, the lead, the pads; distorted or clean; textures.
- **Structure**: sections and their lengths in bars.
- **Energy over time**: level and density per bar, where it builds and drops.
- **Mood**: dark or bright, tense or calm, sweet or cold; brightness of the sound.

## Tools

In the repository:

- `tools/analyze-audio.py <audio> <out prefix>`: tempo with half and double candidates, the three most likely keys, chord and bass note per bar, level, low and high band and brightness per bar, section boundaries, a 16-step kick, snare and hat grid, the melody in eighths for 16 bars. Writes `<prefix>.json` and a picture. It assumes four beats per bar.
- `tools/zoom-audio.py <wav> <start> <end> <out.png>`: a spectrogram of a short window and the onsets per band (kick, snare, hat), to read a groove by eye.

They need a Python environment with librosa: `uv venv && uv pip install numpy scipy librosa matplotlib soundfile`, then `.venv/bin/python tools/analyze-audio.py ref.m4a /tmp/ref`. On the owner's machine `ffmpeg`, `ffprobe`, `python3`, `uv` and `say` are installed; librosa is not installed globally. Check with `command -v` before relying on any other tool.

## Worked examples

- **A future pop reference** (an audio file of the owner): measured 92 BPM, E minor, Em Em D D C C D D, strong sidechain, 57 bars. It became `songs/ten-years-rebuild.json`: key E, `pendolo` and `anthem` (Am Am G G F F G G moved to E), a `pumping` bass and a `sidechain` pad, both presets written for it. The owner found structure, tempo and harmony right, but not the timbre.
- **A short jingle**: 103 BPM, F# minor over a G bass (phrygian tension), staccato then syncopated stabs. It became `dci-rebuild`: key F#, `pendolo`, `staccato` then `synco` pads, an `offbeat` bass.
- **A film scene mood**: the club fight of a film became `luci-rosse` (124 BPM, A, `drone` then `tensione`, square hook). The film is named in the song's `inspiration` field and in the `dark-cyberpunk` description.
- **Live coders' habits**: videos of live coders were analysed for how they open and grow a track. The result is the growth shape weights of the `live-coder` styles ([growth-shapes.md](growth-shapes.md)).
- **A glitch album**: analysed, and two styles proposed (glitch hop, cinematic glitch). Not built yet.

## From measures to recipe fields

| Measure | Style field | Song field |
| --- | --- | --- |
| Tempo | `tempo`: the measure plus or minus about 4 | section `bpm` |
| Key | `keys`: the nearest of the eight app keys | section `key` |
| Chord loop | `progressions`: the named one with the same shape in A, or a new one in `PROGS` | section `chords` |
| Mode and mood | hook `modes`; tense moods use `phrygian`, `locrian`, `chromatic` | track `mode` |
| Meter, swing | `meters`, `swing` | section `meter`, `swing` |
| Drum grid | `drums.grooves`, or a new groove; `material.families` | drum `rows` or a `beat` idea |
| Bass rhythm | `bass.presets`, `material.rules` | bass preset or idea |
| Sounds | `waves`, `kits`, guitar `types`, texture `samples` ([sounds.md](sounds.md)) | track `wave`, `kit` |
| Brightness | `settings.cutoff` ranges | `cutoff` |
| Energy over time | `shapes` (`build-drop`, `slow-burn`, `descent`) | sections and their tracks |
| Density | `tracks.usual` | tracks per section |

Existing styles are anchors: compare the measures with the tempo, keys and progressions of each style in [styles.md](styles.md#options). Dark club moods sit near `berlin-techno` and `dark-cyberpunk`; night and rain near `dreamy-cyberpunk` and `lo-fi`; euphoric lifts near `progressive-house` and `trance`.

For an artist, measure several references of one person or scene: the styles they touch become `styles` weights, their tempo and density become `energy`, `complexity` and `pace` ranges.

## Ideas not built yet

These are ideas an agent can propose to the owner. None exists in the app.

- **Key and tempo detection in the app**: today only the research script above does it.
- **MIDI import**: read a `.mid` file into ideas (degrees in the song's key, a rhythm cell, chords per bar).
- **Score reading**: MusicXML into ideas; PDF or images through optical music recognition.
- **Stem separation**: split a mix into drums, bass and music with a separation model, then measure each.
- **Melody transcription**: pitch tracking of a lead line into hook degrees.
- **Richer chord recognition**: sevenths and suspensions; the script knows only major and minor triads.
- **Sound matching**: compare a reference sound with soundfonts and FM patches to pick the closest wave.

## Where references are kept

References that name real works, people or brands are kept privately by the owner. The repository may carry a short mood line in a style `description` or a song `inspiration` field, as above. Ask the owner before writing a new name, and never write where the output is meant to go.
