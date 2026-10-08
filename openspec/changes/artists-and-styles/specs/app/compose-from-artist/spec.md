# Spec Delta

## Purpose

Compose can start a new song from an artist, so the endless director is also a way to get a first draft to work on by hand.

## ADDED Requirements

### Requirement: New song from artist
Compose SHALL offer "New song from artist": the user picks an artist (and optionally a seed), and the app writes one live build song by that artist, opens it in Compose ready to play, and keeps it unsaved until the user saves it.

#### Scenario: Draft from an artist
- **WHEN** the user picks the dreamer and confirms
- **THEN** a new live build song opens in Compose, plays as a live build, and can be saved to the library
