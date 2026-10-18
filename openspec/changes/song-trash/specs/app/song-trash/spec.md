## ADDED Requirements

### Requirement: Delete a user song
The app SHALL let the user delete their own songs and hand-coded versions, from the song card in the Songs tab and from Compose. A delete SHALL ask for confirmation inside the page and SHALL move the song to the trash. Built-in songs SHALL NOT be deletable.

#### Scenario: Delete from the Songs tab
- **WHEN** the user presses Delete on the card of one of their songs and confirms in the card
- **THEN** the song leaves the list and appears in the trash

#### Scenario: Cancel
- **WHEN** the user presses Delete and then Cancel
- **THEN** the song stays in the list and nothing changes

#### Scenario: Built-in song
- **WHEN** the card of a built-in song is shown
- **THEN** it has no Delete action; an edited built-in song still offers to restore the original

#### Scenario: Delete from Compose
- **WHEN** the user deletes the song open in Compose and confirms
- **THEN** the song goes to the trash and Compose opens another song, as today

### Requirement: Trash view
The Songs tab SHALL have a Trash view that lists the deleted songs with their title, the date they were deleted and the days left before they are deleted for good. Songs in the trash SHALL NOT appear in the song list, its search, its filters, playlists or the player queue.

#### Scenario: Open the trash
- **WHEN** the user opens the Trash view
- **THEN** it lists every deleted song, the most recent first, with its days left

#### Scenario: Empty trash
- **WHEN** the trash holds no song
- **THEN** the Trash view says so

### Requirement: Restore and delete for good
From the Trash view the user SHALL be able to restore a song, delete one song for good, or empty the whole trash. Deleting for good and emptying SHALL ask for confirmation inside the page. A restored song SHALL come back with the same id, title, tags and content.

#### Scenario: Restore
- **WHEN** the user restores a song from the trash
- **THEN** it is back in the song list as it was, and it is no longer in the trash

#### Scenario: Empty the trash
- **WHEN** the user empties the trash and confirms
- **THEN** every song in it is gone for good

### Requirement: Purge after 30 days
A song SHALL be deleted for good 30 days after it was moved to the trash. The purge SHALL run when the app starts and when the Trash view opens.

#### Scenario: Old song purged
- **WHEN** the app starts and a song was moved to the trash 31 days ago
- **THEN** that song is gone for good and the others stay

### Requirement: Trash persisted and backed up
The trash SHALL be kept in the browser with the song library, survive a reload, and be part of the settings backup. Importing a backup SHALL never delete a song: a song that is in the song list on either side SHALL stay in the song list and SHALL NOT also be in the trash.

#### Scenario: Reload
- **WHEN** the user deletes a song and reloads the page
- **THEN** the song is still in the trash

#### Scenario: Import a backup with a trash
- **WHEN** a backup with two songs in its trash is imported, and one of them is in the current song list
- **THEN** the other one is added to the trash and the first one stays in the song list
