# DEVLOG

## 2026-10-03

- Creato il progetto con player locale (`index.html`, web component `@strudel/repl@1.3.0` da jsDelivr).
- Aggiunti 4 pattern progressivi in `patterns/`, da batteria a traccia trance completa.
- Scelto Strudel invece di TidalCycles per partire senza installazioni.
- `index.html` riscritto come synth lab: sequencer 909, canali melodici, scene, guida, libreria suoni, riferimenti.
- Visual canvas a ritmo con 4 temi; audio letto con `all(x => x.analyze(1))` e `getAnalyzerData`.
- `Ctrl+Enter` nel vecchio player funzionava solo con il focus nell'editor: ora la scorciatoia è globale.
- Pubblicata copia su claude.ai per mobile (poi abbandonata, vedi 2026-10-04).
- Prossimi passi: esplorare sample custom (`samples()`), visual (`_pianoroll()`), struttura di brano con `arrange()`.

## 2026-10-04

- Abbandonata la versione pubblicata su claude.ai: la pagina non riproduceva suoni perché le regole di sicurezza bloccano i worklet audio di Strudel caricati come `data:` URL.
- Progetto convertito in app Vite locale (`npm run dev`), con `@strudel/repl@1.3.0` da npm invece che da CDN.
- Codice diviso in moduli: `src/main.js`, `src/music.js`, `src/content.js`, `src/visuals.js`, `src/style.css`.
- Play chiama `initAudio()` dentro il gesto dell'utente: prima i worklet (supersaw, rumore) si caricavano solo al primo `mousedown`.
- Scelto di non fare un fork di Strudel: dipendenza npm finché non serve modificare il motore.
- Inizializzato git.
- Eliminata la pagina su claude.ai.
- Aggiunto il brano *Neon Ascent* (`patterns/05-neon-ascent.js`): techno trance, 128 BPM, 32 battute = 60 s, sezioni con `.mask()` a 32 valori.
- Nuovo tab Brani: il brano riparte dalla battuta 1, timeline con sezione attiva, stop automatico a fine pezzo.

## 2026-10-04 (sera)

- Nuovo brano *Ghost Protocol* (`patterns/06-ghost-protocol.js`): hard techno cyberpunk, 36 battute, 60 s. Sezioni come `stack()` messe in fila con `arrange()`, tempo cambiato con un evento muto `.cps()`, tonalità con `.transpose()`, drum machine con `.bank("<…>")`, ruvidità con `distort`, `crush`, `coarse`, `fm`, `vowel`.
- Interfaccia bilingue IT/EN (`src/i18n.js`): testi statici, controlli, lezioni, suoni, riferimenti, commenti del codice generato.
- Ogni layer usa `.analyze("strumento")`: i visual leggono un livello per strumento e rilevano gli attacchi.
- Nuovi visual: *Palco* (strumenti che si accendono) e *Pixel* (pixel art low poly). Il Palco è il visual predefinito.
- Nuovo logo: script al neon, scritta cromata, griglia in prospettiva, equalizzatore collegato agli strumenti.
- Il REPL carica solo parte di dirt-samples: l'app carica l'archivio completo.
- Limite noto: ai cambi di `.cps()` superdough scarta alcune note ("cannot schedule sounds in the past").
