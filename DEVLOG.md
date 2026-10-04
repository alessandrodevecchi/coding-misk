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

## 2026-10-05

- *Ghost Protocol* riscritto come arrangiamento a layer continui (60 battute, 1:43): helper `lane()` e `fade()` per automazioni per battuta di volume, filtro, distorsione, tonalità e drum machine. Sezioni di passaggio Fall (2 battute, downlifter, filtri che si chiudono) e Rebuild (8 battute, cassa filtrata che si apre, rullate, riser). Acid, accordi e hi-hat restano accesi per tutto il brano come filo conduttore; batteria LinnDrum e sub del break in dissolvenza incrociata con 909 e rumble.
- Causa degli inciampi ai cambi di BPM: `.cps()` dentro il pattern fa ricalcolare le note in coda con un riferimento vecchio (fino a ~1 s di errore), superdough le scarta. Ora il tempo lo cambia il player con `scheduler.setCps` al confine di battuta, in rampa. Nessun avviso "cannot schedule sounds in the past" sul brano intero.
- Player dei brani (`src/songs.js`): sezioni e tempo letti dal codice, partenza da una battuta impostando `scheduler.lastEnd` prima di avviare, timeline cliccabile, pulsanti per gli stacchi (2 battute prima), ripetizione della sezione, tempo trascorso.
- Trappola: nel codice Strudel i doppi apici e i backtick diventano mini-notation anche dentro funzioni JS. Usare apici singoli e `mini()`.

## 2026-10-05 (pomeriggio)

- Tolti i pulsanti Intro/Build/Drop/Break dal visual. Componi ora è un arrangiatore: brano = lista di scene (nome, battute, entrata, stato completo del compositore).
- `compileTrack()` in `src/music.js`: ogni scena diventa un blocco di layer con una lane per battuta (`.mask().velocity()`), le dissolvenze sovrappongono la scena uscente e quella entrante. Il codice dichiara `SECTIONS` e `TEMPO`, quindi usa lo stesso player dei brani scritti a mano (salto, rampe, loop).
- La traccia di prova è diventata *Synth Lab Demo* (5 scene) nel tab Brani.
- Libreria in `localStorage`: brani dell'utente, modifiche ai brani inclusi (Ripristina originale), codice modificato dei brani scritti a mano.
- Riproduzione: la scena selezionata segue il playhead ("Segui la riproduzione"); le modifiche durante il play rivalutano il codice senza fermare la musica.
- Ghost Protocol e Neon Ascent restano brani "scritti nel codice": le loro automazioni non sono rappresentabili nelle scene.

## 2026-10-05 (sera)

- BPM, tonalità e accordi spostati dalla barra in alto al pannello della scena: sono proprietà della scena, non del brano. In alto restano Play/Pausa, Stop e lingua.
- Modello della scena esteso (`normalizeState` completa gli stati salvati prima): automazioni ↗ di volume e filtro fino a fine scena, BPM in rampa (`bpmEnd`), saturazione, sgranatura, risonanza, FM, filtro vocale, modi della scala, preset rumble/acid/stab/pump/cyber/neon, canale Texture, riser che scende, crash sul primo colpo, mezza battuta di silenzio, tonalità Mi e Fa, progressione Cyber, riga Ride nel sequencer.
- *Ghost Protocol* e *Neon Ascent* riscritti come brani a scene (`src/tracks.js`): si aprono in Componi. Gli originali in codice restano in fondo al tab Brani.
- Selettore del brano in Componi. Clic su una scena durante la riproduzione = salto a quella scena (prima "Segui la riproduzione" riportava subito indietro la selezione).
- Pausa/Riprendi (riparte dalla posizione esatta) e Stop: barra in alto, arrangiatore, card dei brani. Barra spaziatrice = play/pausa.
