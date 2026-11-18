# Spec Delta

## Purpose

Level B's beat grid with and without the learned beat tracker.

## ADDED Requirements

### Requirement: Grid engine recorded

A level B analysis SHALL record which engine gave its beat grid (`engines.grid`, absent for misk-analyzer's own) and, when the beat tracker ran, its tempo, how well its beats lock to one grid, its time and the relation used.

#### Scenario: The panel names the grid's engine

- **WHEN** Full ends with the beat tracker's grid
- **THEN** the line under the controls ends with "grid: Beat This!"

### Requirement: Whole tempo confirmed

Without the beat tracker, when level B's line fit lands within 0.25 BPM of a whole tempo and RhythmExtractor2013's tempo lies within 0.15 BPM of that whole tempo, level B SHALL fit the grid again with the whole tempo allowed, and keep it when the fit is as good.

#### Scenario: A long track at 111 BPM

- **WHEN** the line fit of a 6-minute track gives 111.17 BPM and RhythmExtractor2013 gives 110.9
- **THEN** the grid's tempo is 111
