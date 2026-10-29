## ADDED Requirements

### Requirement: Voci tab in the Groove Lab

The Groove Lab SHALL have a Voci tab after Suoni with four sections: Le mie frasi, Vocabolari inclusi, Voci e suoni, Campioni. The per-song voice controls of Compose and the radio SHALL stay where they are.

#### Scenario: Open the tab

- **WHEN** the user opens Groove Lab and presses Voci
- **THEN** Le mie frasi shows, with search, kind filters with counts, Quanto usarle, and the phrases grouped by kind and tag

### Requirement: My phrases section

Each phrase row SHALL show its speaker kind icon, text, source, uses, sample status (ready, being made, missing), and buttons to hear it with the voice it would use, edit and delete. Nuova frase SHALL add a phrase with any kind, tag and styles, so the user adds narrator phrases without changing the code.

#### Scenario: New narrator phrase

- **WHEN** the user adds "fermi tutti" as kind explain with the moment breakdown
- **THEN** it is saved, its sample is made, and the explaining narrator may say it at a breakdown

### Requirement: Built-in vocabularies section

The built-in vocabularies SHALL be browsable read-only: voice track groups, explaining moments and radio moves, poetic entries and movement images, and each style's lines, with both languages, headphones, and a ready or missing mark per speaker bank. Copia nelle mie frasi SHALL make an editable phrase of mine and leave the built-in one unchanged.

#### Scenario: Copy

- **WHEN** the user copies "l'ultimo treno" from the night group
- **THEN** a phrase of kind voice, tag night, source copy appears in Le mie frasi

### Requirement: Voices and sounds section

The section SHALL list the default voice and every speaker with its system voice per language, its sample counts per bank and whether it is installed; it SHALL let the user hear a test line per speaker and per voice style, and offer a test bench (a line, a speaker, a style, Ascolta, Salva nelle mie frasi) whose sample is temporary until saved.

#### Scenario: Speaker not installed

- **WHEN** a speaker has no system voice for English
- **THEN** its card says it is not installed in English and that the default voice is used

### Requirement: Look, languages, phone

The tab, the Settings card and the toasts SHALL have every string in Italian and English, drawn icons only (no emoji), work at 400 px without horizontal scroll, and follow the neon, hardware and light themes (hardware: lights and LCD; light: contrast checks pass).

#### Scenario: Phone in the hardware theme

- **WHEN** the tab is open at 400 px in the hardware theme
- **THEN** the section chips wrap, every row's actions stay on its first line, status lights use the LED colour, and the page does not scroll sideways
