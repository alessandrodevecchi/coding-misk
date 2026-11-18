# Spec Delta

## Purpose

An optional learned beat tracker for level B of the Decode tab: downloaded only when the user asks, checked, run on this device.

## ADDED Requirements

### Requirement: Opt-in download

The beat tracker SHALL NOT be downloaded unless the user starts the download from its Settings card. The card SHALL say that the model is a third-party model, its licence (MIT), that its training data include copyrighted recordings, its download size, the host it comes from, and that the audio never leaves the device. The download SHALL show its progress and SHALL be cancellable. Once downloaded, the card SHALL show the size on disk and a Remove button that deletes the files.

#### Scenario: Nothing without a click

- **WHEN** the user opens the Decode tab and runs Full without having downloaded the model
- **THEN** no request for the model files is made and Full runs with the free engines

#### Scenario: Remove

- **WHEN** the user presses Remove on the card
- **THEN** the stored files are deleted and the next Full runs without the model

### Requirement: Pinned files

Each model file SHALL have a fixed URL at a fixed revision and a SHA-256 pin in the code. A file whose digest differs from its pin SHALL be refused, after the download and again before each load. The files SHALL be ONNX (protobuf); no pickled file SHALL be loaded in the browser.

#### Scenario: A changed file

- **WHEN** a downloaded file's SHA-256 differs from its pin
- **THEN** the download fails with a message, nothing is stored, and Full runs without the model

### Requirement: Runtime served by the app

The ONNX runtime SHALL be a pinned version of `onnxruntime-web` bundled and served by the app itself, on the WebAssembly backend with one thread, inside the level B worker. No script or WebAssembly SHALL be loaded from another host.

#### Scenario: No CDN

- **WHEN** Full runs with the model
- **THEN** the only requests to another host are none (the model files were stored at download)

### Requirement: The grid from the tracker

With the model present, level B SHALL take the exact tempo, the beat phase and the downbeat from the tracker's beats when they are steady and agree with the tempo picked by the free engines (the same, half, double, or a 3:2 relation); the picked tempo's octave SHALL stay. When the tracker's beats are not steady or do not relate to the picked tempo, level B SHALL use its own grid. A tapped or picked tempo SHALL win as today. The model SHALL record which engine gave the grid.

#### Scenario: A long track keeps its grid

- **WHEN** a 6-minute track at 111 BPM is analysed with the model
- **THEN** the grid's tempo is 111.0 and its beats stay on the kicks at the end of the track

#### Scenario: A half-time reading keeps the picked tempo

- **WHEN** the free engines pick 160 and the tracker's beats say 80
- **THEN** the tempo stays 160 and the grid's phase comes from the tracker's beats

### Requirement: Fallback

When the model cannot load or fails, level B SHALL finish with its own grid and record a note, as it does when Essentia.js fails.

#### Scenario: A failed load

- **WHEN** the stored model cannot be read
- **THEN** Full finishes and the panel names misk-analyzer for the grid
