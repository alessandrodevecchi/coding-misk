# Spec Delta

## Purpose

Defines how the spoken sample banks in `public/samples/say_*` are made, checked and cleaned, so that a speaker bank always holds that speaker's real voice.

## ADDED Requirements

### Requirement: Sample banks per speaker and language
`npm run voices` and the dev server voice helper SHALL make speaker samples only in `say_<lang>_<speaker>/` for a language the speaker speaks, and default voice samples in `say_<lang>/`. They SHALL make no bank for a removed speaker or for a language the speaker does not speak.

#### Scenario: Full generation
- **WHEN** the owner runs `npm run voices` on macOS with every speaker installed
- **THEN** samples are written to `say_en`, `say_it`, `say_en_albert`, `say_en_fred`, `say_en_junior` and `say_en_kathy`, and to no other bank

#### Scenario: Voice helper asked for Italian
- **WHEN** the voice helper gets a request for a line in Italian with speaker `fred`
- **THEN** it answers with the `say_it` sample of the line (made if missing) and writes nothing to `say_it_fred`

### Requirement: A speaker that sounds like the default is not installed
Before it writes a speaker sample, the generator SHALL compare the speaker's audio with the default voice's audio of the same text. When the audio data is identical, the generator SHALL treat the speaker as not installed for that language: it SHALL write no sample, and it SHALL warn with the speaker, the language and how to install the voice.

#### Scenario: Voice listed but not installed
- **WHEN** `say -v '?'` lists Kathy but `say` speaks her lines with the system voice
- **THEN** `npm run voices` writes no file to `say_en_kathy`, prints that Kathy is not installed for English, and finishes the other banks

#### Scenario: Voice helper with a missing voice
- **WHEN** the voice helper is asked for a `kathy` sample and Kathy speaks like the default voice
- **THEN** it answers that the speaker is not installed, writes no file, and the page plays the line from `say_en`

#### Scenario: Real voice
- **WHEN** the speaker's audio differs from the default voice's
- **THEN** the sample is written as before

### Requirement: Parallel generation
`npm run voices` SHALL accept `--jobs N` to make up to N samples at the same time. The files it writes SHALL be the same as with one job.

#### Scenario: Four jobs
- **WHEN** the owner runs `npm run voices -- --jobs 4`
- **THEN** every missing sample is made, `say_lengths.json` lists each of them once, and a second run makes nothing

### Requirement: Prune of old banks on request only
`npm run voices` SHALL offer a prune that lists every `say_*` bank of a removed speaker or of a language its speaker does not speak, with its file count and size. It SHALL delete them only when the owner adds an explicit confirmation flag. No check and no other command SHALL delete sample banks.

#### Scenario: Listing
- **WHEN** the owner runs the prune without the confirmation flag
- **THEN** the 16 old banks (`say_en_eddy` to `say_it_shelley`) are listed with their sizes and nothing is deleted

#### Scenario: Confirmed prune
- **WHEN** the owner runs the prune with the confirmation flag
- **THEN** exactly the listed banks are deleted, `say_lengths.json` no longer names their files, and `say_en`, `say_it` and the new speaker banks are untouched

#### Scenario: Checks never delete
- **WHEN** any `npm run check:*` command runs with the old banks present
- **THEN** the old banks still exist afterwards

### Requirement: Every speaker sounds different from the default
A check SHALL make one test line with each speaker in each language it speaks and with the default voice, and SHALL fail when a speaker's audio is identical to the default's. It SHALL also report every existing speaker sample whose audio is identical to the default voice's sample of the same text, and every bank the prune would list. Where `say` or ffmpeg is missing, it SHALL skip with a note.

#### Scenario: All voices installed
- **WHEN** the check runs on the owner's Mac with Albert, Fred, Junior and Kathy installed
- **THEN** it passes and names the system voice used for each

#### Scenario: Old copies on disk
- **WHEN** the old banks with copies of the default voice are still in `public/samples/`
- **THEN** the check reports them as copies of the default voice and names the prune command, and it deletes nothing
