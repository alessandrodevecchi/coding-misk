## ADDED Requirements

### Requirement: Sample classes

Every file in `public/samples/say_*` SHALL be classed as built-in (a text of the vocabularies, pools, poetic images, style lines or built-in and example songs), mine (a phrase of the collection), song (a line of a saved song, code song, playlist session or trashed song), temporary (listed in `say_temp.json` and in no class above) or orphan (none). The class SHALL be computed by slug and language, not stored on the file.

#### Scenario: Shared file

- **WHEN** a phrase of mine has the same slug as a built-in vocabulary entry
- **THEN** the file is built-in, and deleting the phrase does not delete it

### Requirement: Temporary samples

A sample the helper makes for a line that is not saved SHALL be listed as temporary with an expiry from a setting: A fine brano (at least one hour), Dopo 24 ore (default), Dopo 7 giorni. The helper SHALL delete expired temporary samples at start and every hour, never while their song plays. Saving the phrase later SHALL remove its files from the list. A line whose sample was deleted SHALL get it again through the preparation of samples, or play through the fallback chain.

#### Scenario: Expired

- **WHEN** a line typed with Non salvare mai was made 25 hours ago and its song is not playing
- **THEN** its sample is deleted at the next sweep, the manifest is read again, and the song on air (if any) is recompiled

#### Scenario: Saved later

- **WHEN** the user saves a temporary line from the Campioni section
- **THEN** its samples leave the temporary list and are never swept

### Requirement: Deleting samples is safe

The helper SHALL delete only files under `public/samples/say_*` that the request names and SHALL skip any slug the page sends as protected (built-in, mine, song). After any deletion the page SHALL read the manifest again and recompile the song that plays.

#### Scenario: Delete during playback

- **WHEN** samples are deleted while a song plays
- **THEN** from the next bar the song's code uses the sample numbers of the new manifest

### Requirement: Space and orphan cleanup

The Campioni section SHALL show the space and file count per class and per bank, and the missing samples. Orphan cleanup SHALL be manual: it lists the orphans with their size first and deletes only after one confirmation. Without the voice helper, the section SHALL show presence from the manifest and how to make samples, and SHALL NOT delete.

#### Scenario: Cleanup

- **WHEN** the user presses Pulisci gli orfani
- **THEN** the list of orphan files and their total size shows, and nothing is deleted until the user confirms

#### Scenario: Built app

- **WHEN** the app runs without the dev server
- **THEN** the section shows which samples are present or missing and the `npm run voices` hint, with no delete button
