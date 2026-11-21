# Spec Delta

## ADDED Requirements

### Requirement: Pluggable AI engines

The app SHALL reach AI models only through engines that share one interface (status, model list, prompt with a JSON schema). It SHALL offer the browser's built-in model first and OpenRouter as an online engine, and SHALL allow adding the Anthropic API as a further engine without changes to the areas that use engines.

#### Scenario: Built-in engine with no key

- **WHEN** the browser reports the built-in model as available and no key is set anywhere
- **THEN** the Radio console's request field works with the built-in engine and no request leaves the device

#### Scenario: Built-in model not downloaded

- **WHEN** the built-in model is downloadable and the user clicks the download button
- **THEN** the download starts from that click, a progress bar shows it, and the field becomes usable when it ends

#### Scenario: Built-in model unavailable

- **WHEN** the browser reports the built-in model as unavailable
- **THEN** the request field says why and links to Settings, and the rest of the console works as before

#### Scenario: Turned off by policy

- **WHEN** a Chrome Enterprise policy turns the built-in model or the built-in AI APIs off
- **THEN** the field says the built-in model is turned off by the organisation and offers the online engines

#### Scenario: Compose on an online engine only

- **WHEN** the user picks an engine for the Compose area
- **THEN** only online engines are offered, because a Compose request does not fit the built-in model's context window

### Requirement: An engine and a model per app area

Settings SHALL let the user choose an engine and a model for each app area separately (the Radio console now; Compose and other areas later). A choice for one area SHALL NOT change another area.

#### Scenario: Different models per area

- **WHEN** the user sets the Radio console to the built-in engine and a later area to an online model
- **THEN** requests from the Radio console use the built-in engine and requests from the other area use the online model

### Requirement: Model lists fetched and refreshed

The app SHALL fetch the models of each engine, offer only those that can return structured JSON in the main list, cache the list with its fetch time, and refresh it on a button press and at most once a day on the first request of the day. A failed refresh SHALL keep the cached list and show when it was fetched.

#### Scenario: Manual refresh

- **WHEN** the user presses Refresh for OpenRouter
- **THEN** the list is fetched again, new models appear, and the fetch time updates

#### Scenario: Offline refresh

- **WHEN** a refresh fails because the network is down
- **THEN** the cached list stays and Settings shows the date of the last successful fetch

### Requirement: Gone models replaced within their family

When a chosen model is missing from a refreshed list, its retirement date has passed, or a request fails because the model is not found, the app SHALL replace it with the newest model of the same engine and family (highest version, then newest date). A free model SHALL only be replaced by a free model. The app SHALL ask instead of replacing when no model of the family is left or the replacement costs more than twice as much, and SHALL never replace a model the user pinned.

#### Scenario: A newer model of the family

- **WHEN** the Radio console uses Claude Haiku 5.5 and a refreshed list holds Claude Haiku 5.6 but no longer 5.5
- **THEN** the area switches to Haiku 5.6, a toast says so once with Undo, and the area's Settings row shows the change until dismissed

#### Scenario: Undo of an upgrade

- **WHEN** the user presses Undo on that toast
- **THEN** the old model is restored and pinned, and the area says the model is gone and asks the user to choose

#### Scenario: Retirement announced

- **WHEN** a chosen model's retirement date is within 14 days
- **THEN** Settings shows the date next to the model, and nothing changes until the date passes

#### Scenario: Price jump

- **WHEN** the only newer model of the family costs more than twice the old one
- **THEN** the app does not switch and asks the user to choose

### Requirement: API keys never in page code

The recommended place for API keys SHALL be the local helper, which reads them from a git-ignored file or environment variables and forwards engine calls on local-only routes, never returning a key. When the helper is not running, the user MAY store a key in Settings; that field SHALL show a warning that the key is stored in this browser and readable by page code, and the key SHALL never be written to the backup, exports or shared songs.

#### Scenario: Key in the helper

- **WHEN** the helper has an OpenRouter key and the page asks for the helper's status
- **THEN** the answer says that OpenRouter has a key and contains no key

#### Scenario: Key in Settings

- **WHEN** the user stores a key in Settings and exports a backup
- **THEN** the backup file holds no key, and Settings shows the key masked with a Delete button

#### Scenario: Helper wins

- **WHEN** both the helper and Settings have a key for the same engine
- **THEN** calls go through the helper and the Settings field says the helper's key is in use

### Requirement: Privacy controls

Settings SHALL have an "Online engines" switch, off until a key exists; while it is off every area uses the built-in engine. The user SHALL be able to see the exact text sent by the last request, and to clear a local log of the last 20 requests that is never in the backup.

#### Scenario: Online engines off

- **WHEN** online engines are off and an area was set to an online model
- **THEN** that area uses the built-in engine and its Settings row says why

#### Scenario: What is sent

- **WHEN** the user opens "What is sent" after a request
- **THEN** it shows the request text and the song state sent with it, with no audio and no saved songs
