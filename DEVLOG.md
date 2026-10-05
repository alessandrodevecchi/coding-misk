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
- Aggiunto il brano _Neon Ascent_ (`patterns/05-neon-ascent.js`): techno trance, 128 BPM, 32 battute = 60 s, sezioni con `.mask()` a 32 valori.
- Nuovo tab Brani: il brano riparte dalla battuta 1, timeline con sezione attiva, stop automatico a fine pezzo.

## 2026-10-04 (sera)

- Nuovo brano _Ghost Protocol_ (`patterns/06-ghost-protocol.js`): hard techno cyberpunk, 36 battute, 60 s. Sezioni come `stack()` messe in fila con `arrange()`, tempo cambiato con un evento muto `.cps()`, tonalità con `.transpose()`, drum machine con `.bank("<…>")`, ruvidità con `distort`, `crush`, `coarse`, `fm`, `vowel`.
- Interfaccia bilingue IT/EN (`src/i18n.js`): testi statici, controlli, lezioni, suoni, riferimenti, commenti del codice generato.
- Ogni layer usa `.analyze("strumento")`: i visual leggono un livello per strumento e rilevano gli attacchi.
- Nuovi visual: _Palco_ (strumenti che si accendono) e _Pixel_ (pixel art low poly). Il Palco è il visual predefinito.
- Nuovo logo: script al neon, scritta cromata, griglia in prospettiva, equalizzatore collegato agli strumenti.
- Il REPL carica solo parte di dirt-samples: l'app carica l'archivio completo.
- Limite noto: ai cambi di `.cps()` superdough scarta alcune note ("cannot schedule sounds in the past").

## 2026-10-05

- _Ghost Protocol_ riscritto come arrangiamento a layer continui (60 battute, 1:43): helper `lane()` e `fade()` per automazioni per battuta di volume, filtro, distorsione, tonalità e drum machine. Sezioni di passaggio Fall (2 battute, downlifter, filtri che si chiudono) e Rebuild (8 battute, cassa filtrata che si apre, rullate, riser). Acid, accordi e hi-hat restano accesi per tutto il brano come filo conduttore; batteria LinnDrum e sub del break in dissolvenza incrociata con 909 e rumble.
- Causa degli inciampi ai cambi di BPM: `.cps()` dentro il pattern fa ricalcolare le note in coda con un riferimento vecchio (fino a ~1 s di errore), superdough le scarta. Ora il tempo lo cambia il player con `scheduler.setCps` al confine di battuta, in rampa. Nessun avviso "cannot schedule sounds in the past" sul brano intero.
- Player dei brani (`src/songs.js`): sezioni e tempo letti dal codice, partenza da una battuta impostando `scheduler.lastEnd` prima di avviare, timeline cliccabile, pulsanti per gli stacchi (2 battute prima), ripetizione della sezione, tempo trascorso.
- Trappola: nel codice Strudel i doppi apici e i backtick diventano mini-notation anche dentro funzioni JS. Usare apici singoli e `mini()`.

## 2026-10-05 (pomeriggio)

- Tolti i pulsanti Intro/Build/Drop/Break dal visual. Componi ora è un arrangiatore: brano = lista di scene (nome, battute, entrata, stato completo del compositore).
- `compileTrack()` in `src/music.js`: ogni scena diventa un blocco di layer con una lane per battuta (`.mask().velocity()`), le dissolvenze sovrappongono la scena uscente e quella entrante. Il codice dichiara `SECTIONS` e `TEMPO`, quindi usa lo stesso player dei brani scritti a mano (salto, rampe, loop).
- La traccia di prova è diventata _Synth Lab Demo_ (5 scene) nel tab Brani.
- Libreria in `localStorage`: brani dell'utente, modifiche ai brani inclusi (Ripristina originale), codice modificato dei brani scritti a mano.
- Riproduzione: la scena selezionata segue il playhead ("Segui la riproduzione"); le modifiche durante il play rivalutano il codice senza fermare la musica.
- Ghost Protocol e Neon Ascent restano brani "scritti nel codice": le loro automazioni non sono rappresentabili nelle scene.

## 2026-10-05 (sera)

- BPM, tonalità e accordi spostati dalla barra in alto al pannello della scena: sono proprietà della scena, non del brano. In alto restano Play/Pausa, Stop e lingua.
- Modello della scena esteso (`normalizeState` completa gli stati salvati prima): automazioni ↗ di volume e filtro fino a fine scena, BPM in rampa (`bpmEnd`), saturazione, sgranatura, risonanza, FM, filtro vocale, modi della scala, preset rumble/acid/stab/pump/cyber/neon, canale Texture, riser che scende, crash sul primo colpo, mezza battuta di silenzio, tonalità Mi e Fa, progressione Cyber, riga Ride nel sequencer.
- _Ghost Protocol_ e _Neon Ascent_ riscritti come brani a scene (`src/tracks.js`): si aprono in Componi. Gli originali in codice restano in fondo al tab Brani.
- Selettore del brano in Componi. Clic su una scena durante la riproduzione = salto a quella scena (prima "Segui la riproduzione" riportava subito indietro la selezione).
- Pausa/Riprendi (riparte dalla posizione esatta) e Stop: barra in alto, arrangiatore, card dei brani. Barra spaziatrice = play/pausa.

## 2026-10-05 (notte)

- Analisi di due tracce audio (librosa in un ambiente temporaneo, non nel progetto): tempo, tonalità, accordi per battuta, struttura per energia e novità, griglia della batteria per banda, melodia per ottavi, zoom sugli attacchi.
  - `sf-tenyears-149s.m4a`: future pop ispirazionale, 92 BPM, Mi minore, giro Em Em D D C C D D, cassa dritta con sidechain evidente (bassi che crollano a ogni cassa), hi-hat a sedicesimi, swoosh, riser, 57 battute.
  - `dci-track-23s.m4a`: jingle tech, 103 BPM, Fa# minore con tensione frigia (basso su Sol), accordi staccati, build di hi-hat e rumore, drop con stab sincopati, coda tenuta, 10 battute.
- Nuovi elementi del modello: pad sidechain/staccato/sincopato, basso pompato (forma del volume con `postgain`, perché `velocity` viene sovrascritta dalla lane della scena), progressioni con accordi di due battute, rullata di fine scena, hook Decennale, Scintilla, Orizzonte.
- Brani: _Ten Years · ricostruzione_, _Next Chapter_, _DCI Jingle · ricostruzione_, _DCI Ignition_.
- Esportazione WAV: `MediaRecorder` collegato a `getSuperdoughAudioController().output.destinationGain`, registrazione in tempo reale con 2,5 s di coda, conversione in WAV 16 bit.
- Campioni personalizzati da `public/samples/` con manifest generato da un plugin Vite.

## 2026-10-06

- Le ricostruzioni da audio restano lontane dagli originali: struttura, tempo e armonia tornano, timbri e melodie no (synth di Strudel, melodie stimate dallo spettro).
- Scene con metro (4/4, 3/4, 5/4, 7/8): ritmi di basso, pad, sidechain scritti come modelli per beat `[beat, mezzo beat]` e ripetuti per i beat della battuta, con pesi `@` per il mezzo beat del 7/8. Sequencer a lunghezza variabile. `TEMPO` e `setcpm` sono in "BPM da 4/4" (BPM × 16 / sedicesimi della battuta); le etichette mostrano i BPM veri.
- Swing per scena (`.swingBy(swing/6, sedicesimi/2)`), strumenti General MIDI come suono di ogni canale, accordi di settima, power chord, preset rock e lo-fi, fruscio del vinile sintetico, drum machine LinnLM1, OberheimDMX, EmuSP12, AkaiMPC60, AlesisHR16, YamahaRX5.
- Brani: _Neon Rush · reel 28s_, _Settimo Cielo_, _Pioggia sul vetro_.
- I soundfont General MIDI hanno livelli molto diversi (vibrafono e organo molto più bassi del piano elettrico): volumi bilanciati a mano nei brani.

## 2026-10-06 (pomeriggio)

- Le chitarre General MIDI da sole erano quasi inudibili (campioni piccoli, livello basso, riverbero). Nuovo canale Chitarra: campione di chitarra + dente di sega (`s("gm_distortion_guitar,sawtooth")`), saturazione, passa-alto, filtro, raddoppio stereo con `.jux(x => x.late(.012))`, voicing a power chord, accordatura (−2, −12).
- Con distorsione pesante il `gain` prima dell'amp cambia solo la saturazione: il volume della chitarra e la dissolvenza della scena sono applicati con `postgain` (`.postgain(sceneN.mul(livello))`). Livelli misurati per strumento e bilanciati (chitarre ~0,5 di picco nel metal, alla pari con la cassa).
- Hook: armonia (`superimpose(x => x.add(2))` per le terze), saturazione, cowbell 808 come suono.
- Brani reel da 30 s: _Ferro_ (metal), _Ali di cenere_ (metal melodico), _Drift_ (phonk). Prog e reel cyberpunk passati al canale Chitarra.

## 2026-10-06 (sera)

- Reel ricavati da brani interi (`reelFrom` in `src/tracks.js`): il reel prende le scene più cariche (ritornello o drop, breakdown, finale) e parte col crash, senza build-up. Brani interi _Ferro_, _Ali di cenere_, _Drift_ (circa 1:20) e i rispettivi reel da 30 s.
- Chitarra con riff: pattern con spostamenti in semitoni del power chord (`.struct()` + `.transpose("0 0 1 0 …")`): thrash con seconda bemolle, galoppo, groove, djent, aperture eroiche. La chitarra ha il suo analizzatore `guitar`.
- Palco ridisegnato con disposizione calcolata in unità: crash dentro la batteria sotto il muro LED, testata e cassa 4×12 con chitarra, campionatore FX con pad, etichette su una riga. La chitarra guida anche Tramonto, Montagne, Pixel, Sonar, Spazio e l'equalizzatore del logo.
- Spazio ridisegnato: niente pianeta al centro; gigante gassoso dal basso a destra con bande e anelli, nebulose, aurora, comete, navicella.

## 2026-10-06 (notte)

- Nuovo brano _Circuito Ruggine_ (techno industrial cyberpunk con chitarre): riff `stomp` e `industrial` aggiunti al canale Chitarra. Mix misurato: la saturazione forte sulla batteria portava gli hi-hat sopra la cassa, ridotta e tolto il ride nei drop.

## 2026-10-07

- Riscontro: melodie troppo dolci e ricorrenti, troppi strati insieme. Le melodie dell'hook andavano per gradi congiunti della scala minore. Aggiunti modi `locrian` e `chromatic` (melodie in semitoni: tritono, seconda bemolle, ottave), ottava dell'hook, riff per il basso (`spirale`, `mirino`, `tritono`, `ottaveArcade`), progressioni ferme (`drone`, `tensione`), `dorico`.
- Brani nuovi con al massimo 4-5 strati per scena: _Luci Rosse_ (club scuro stile Le Castle Vania / John Wick: il riff di basso distorto è il protagonista), _DCI Jingle · carica_, _Insert Coin_ (arcade anni '90: lead FM, basso a ottave, arpeggi), _Segnale nel rumore_ (il brano libero).
- Le drum machine senza crash (YamahaRX5, AlesisHR16, KorgMinipops) prendono il crash dalla 909.

## 2026-10-07 (pomeriggio)

- Volume master di Strudel fissato a 0,6 (`destinationGain` del controller di superdough): nei drop la somma degli strumenti arrivava a 1,33 e saturava l'uscita.
- Video demo registrato con Playwright (Chrome headless) + audio catturato dall'uscita master, unito con ffmpeg: `demo/coding-misk-demo.mp4` (ignorato da git).

## 2026-10-07 (sera)

- `#1` Visual Edgerunners: luna a retino, città a strati con bordi ciano, insegne olografiche sugli hi-hat, treno sopraelevato, linee di velocità su cassa e chitarra, glitch con fette e separazione RGB sul rullante, HUD con la forma d'onda.
- `#2` Tema interfaccia hardware (`src/hardware.js`): selettore NEON/HW, manopole che leggono e scrivono i cursori originali (nascosti ma usabili da tastiera), display LCD ambra, LED di attività per canale dagli analizzatori, pannelli anodizzati.
- Flusso: un branch per issue partito da `develop`, unito in `develop`.

## 2026-10-07 (notte)

- Salvato tutto il contesto nel repository per altri agenti e sessioni: `AGENTS.md` (regole e punto d'ingresso), `CLAUDE.md`, `docs/CONTEXT.md` (storia, preferenze, decisioni, riferimenti, backlog), `docs/ARCHITECTURE.md`, `docs/MUSIC-ENGINE.md` (modello, compilatore, preset, insidie di Strudel), `docs/DESIGN-SYSTEM.md`.
- Strumenti riutilizzabili in `tools/`: verifica livelli per scena, screenshot, registrazione demo con audio, test del tema hardware, analisi audio.
- Regola: ogni modifica aggiunge una voce a questo file e aggiorna `docs/` quando cambiano architettura, modello, design o decisioni.

## 2026-10-04

- `#3` Voci: ricerca completata, risultati in `docs/VOCALS.md`. Raccomandazione: ACE-Step 1.5 turbo (MIT, gira su Mac M4 16 GB) per generare parti cantate, estrazione della voce, Seed-VC per portarle nella voce del proprietario, effetti offline con `pedalboard`/`pyworld`, nuovo canale `vocal` nel modello a scene. Escluse per uso aziendale le licenze non commerciali (SongGeneration/LeVo, F5-TTS, XTTS-v2).

## 2026-10-05

- Licenza AGPL-3.0-or-later (la stessa di Strudel) in `LICENSE`, `package.json` e nei README, in vista del repository pubblico.
- Tolti i reel da 30 s di Ferro, Ali di cenere e Drift: restano i brani interi. Tolto da `docs/CONTEXT.md` il percorso locale dei file audio di riferimento.
- Lingua predefinita dell'interfaccia: inglese (prima seguiva la lingua del browser). La scelta salvata resta.
- Esportati 5 brani in `docs/media/audio/` (MP3 160k, limitatore a -0,5 dB) con il nuovo `tools/export-audio.cjs`, collegati nella sezione Listen dei README: Luci Rosse, Ghost Protocol, Segnale nel rumore, Pioggia sul vetro, DCI Jingle carica. Picchi misurati prima del limitatore fra -6,5 e 0 dB, nessun buco.
- Aperta la issue `#8`: export più veloce del tempo reale (oggi l'export registra il brano mentre suona).
- Verificato: la chitarra suona anche con la batteria spenta (picco 0,43); il pad controlla solo la batteria, gli altri canali hanno ritmi da preset sulla stessa griglia.
- Piano per tracce, pattern e timeline in `docs/PLAN-TRACKS.md`, ispirato a Reason (rack, pattern, Blocks): una riga `$:` per traccia con `pick` per sezione, tracce di codice, fasi da 0 a 5. In attesa delle decisioni del proprietario.
- Decisioni del proprietario sul piano: timeline libera come obiettivo con modalità a sezioni come MVP (passaggio senza perdite fra le due), note relative agli accordi, tracce di codice componibili. Aggiunti al piano: un bus (orbit) per traccia, brani in JSON con validatore e CLI per gli agenti, `docs/COMPOSING.md` con esempi verificati.
- Aperte le issue delle fasi del piano: `#9` rete di sicurezza, `#10` ritmo per ogni strumento, `#11` formato brani v2, `#12` griglia con tracce libere, `#13` rack ed effetti e tracce di codice, `#14` timeline libera.
- `#9` Rete di sicurezza: `tools/snapshot-code.mjs` (codice generato dei 18 brani in `tests/snapshots/code/`, senza browser, `npm run check:code`) e `tools/snapshot-levels.cjs` (picchi per scena e strumento in `tests/snapshots/levels.json`, tolleranza 0,12). Due giri sul codice invariato: tutto entro tolleranza tranne `fx` (crash e riser dipendono da dove cade la finestra di misura), quindi `fx` viene registrato ma non confrontato.
- `#10` Ritmo per ogni strumento: riga di passi per basso, chitarra, arpeggio, hook e pad (parte dal preset, il primo clic la copia, "Torna al preset" la azzera, cambiare preset la azzera). Basso, chitarra e pad la usano come `struct`, arpeggio e hook come `mask` (possono solo togliere note). Timeline in sola lettura sotto le scene con una corsia per strumento e la testina. Un orbit per strumento: delay e riverbero indipendenti. Il codice dei brani cambia solo per `.orbit(n)`; snapshot aggiornati.
- `#11` Formato brani v2: `src/song/` (formato, conversione `fromScenes`, compilatore `compileSong`, validatore `validateSong`), CLI `tools/song.mjs` (validate, compile, export, list), `tools/parity-v2.mjs`. L'app compila tutto passando dal v2: i 18 brani convertiti producono esattamente gli stessi layer del compilatore a scene (verificato strato per strato) e gli stessi livelli. Note scritte a mano (`notes`) per basso e arpeggio (gradi dell'accordo) e hook (gradi della scala). Tracce di codice Strudel. Clip a qualsiasi battuta e più tracce dello stesso tipo, ognuna con il suo orbit. Brani JSON in `songs/` caricati nella tab Brani; tre esempi in `songs/examples/`, verificati nel browser senza errori. Documentazione: `docs/SONG-FORMAT.md` e `docs/COMPOSING.md`.
- Corretto: le colonne della timeline non erano allineate con i blocchi delle scene (flex conta padding e bordo dei pulsanti nella base). Ora scene e corsie usano la stessa griglia CSS `minmax(54px, Nfr)`; misurato a 1440, 900 e 400 px: 0 px di scarto.
- `#12` Arrangiatore a griglia: righe = tracce, colonne = sezioni, ogni cella è un clip (lettera del pattern, `*` se ha impostazioni solo per quella sezione, righe oblique per clip parziali). Tracce libere: aggiungi di qualsiasi tipo (anche più chitarre e tracce di codice), duplica, sposta, rimuovi, muto e solo. Pannello traccia: cosa suona nella sezione, pattern (nuovo, elimina), editor (griglia batteria con groove, preset, passi, griglia delle note per gradi con campo di testo, codice Strudel), impostazioni per tutta la traccia o solo per la sezione. I brani integrati ora sono JSON in `songs/` (ordine in `songs/index.json`), codice identico al compilatore a scene; tolti `src/tracks.js`, il compilatore a scene e il controllo di parità. I salvataggi vecchi vengono convertiti all'apertura. "Segui la riproduzione" non cambia sezione mentre si scrive in un campo.
- Pannello del codice: ridimensionabile trascinando la maniglia (fino al 50% dello schermo, frecce da tastiera, doppio clic per tornare normale), richiudibile, a schermo intero (Esc per uscire). Preferenze salvate.
- Verifica livelli dopo `#12`: tutti i brani uguali; unica eccezione la chitarra di "Macchina" in Circuito Ruggine, che in tre misure dà 0, 0,21 e 0,41 con codice identico (entra con una rampa, la finestra di misura breve la coglie o no). Livelli dei tre esempi aggiunti al riferimento.

## Prossimo passo

- `#13` Rack: vista "tutte le tracce attive qui" con schede compatte (proposta in attesa di conferma), catena di effetti ordinata per traccia, evidenziazione del codice per traccia. Lo spike sulle voci (`#3`) aspetta spazio su disco (servono circa 10 GB liberi).
