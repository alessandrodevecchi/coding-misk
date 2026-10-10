# Prove prima di v0.6.0

Lista per il proprietario (in italiano, come il DEVLOG): cosa provare su `develop` prima di portarlo su `main`. Spunta mentre provi e annota accanto quello che non va. Avvia con `npm run dev` e apri http://localhost:5173.

## Barra del player e volume (`#32`)

- [ ] Play, pausa, stop, precedente e successivo dalla barra in fondo, in ogni scheda.
- [ ] Trascinare la timeline per spostarsi nel brano.
- [ ] Volume e muto; l'export WAV resta allo stesso livello anche col volume basso.
- [ ] Tema HW: tasti meccanici, display ambra, spie di casuale, ripeti e mix.

## Modalità (`#42`)

- [ ] Ascolta e Groove Lab: ognuna ricorda l'ultima scheda.
- [ ] Sul telefono (o finestra stretta) tutto sta nello schermo.

## Brani (`#34`)

- [ ] Ricerca (prova "frigio" e "phrygian"), chip di genere, stile e tipo, ordine.
- [ ] Legenda dei tag; un tocco su un tag filtra.
- [ ] Stella dei preferiti; tag sui tuoi brani.

## Playlist (`#36`)

- [ ] Creare una playlist da "+ Playlist" su una card, riordinare nella scheda Playlist.
- [ ] Riproduci playlist: passa da sola al brano dopo; casuale; ripeti tutto e ripeti un brano.
- [ ] Interruttore Mix nella barra: due brani salvati si mixano.
- [ ] Esporta e importa una playlist.

## Artisti e stili (`#35`)

- [ ] Scheda Artisti: ritratti, scheda personaggio, preferenze di transizione.
- [ ] "♪ Nuovo brano" dalla scheda di un artista porta in Componi.
- [ ] Scheda Stili: duplicare, modificare, genere dello stile.
- [ ] **Decidere i nomi definitivi** dei sei artisti (ora: Night Owl, HYPERDROP, Lumen Drift, Jukebox Joe, The Purist, Wake Horizon).

## Radio: transizioni e console (`#23`, `#24`)

- [ ] Ascoltare qualche cambio di brano con artisti diversi (mix, morph, eco, break, interludio).
- [ ] Menu Transizioni e Armonia.
- [ ] Console: più o meno energia, + e − strumenti, più scuro e più sporco, cambia accordi e tonalità, vai al drop, resta qui, chiudi il brano.
- [ ] Estendi (`#45`): il tasto dice quanto aggiunge, il brano si allunga prima del finale con un tratto nuovo, la riga mostra il totale; più pressioni; annullare dalla coda; spento quando parte la transizione.
- [ ] Coda "In arrivo" con ✕; switch "questo brano / tutta la diretta".
- [ ] Trascinare la curva dell'energia.
- [ ] Curve di densità, luminosità, tensione e voce (`#40`): trascinare un punto, sentire la differenza, tasto ↺ per tornare automatica.
- [ ] Aspetto delle curve (`#47`): dettagli chiusi di default e riga riassunto, apri e chiudi, punti fissati che si illuminano, riquadro dei valori passando col mouse, tema HW a oscilloscopio.
- [ ] Tensione alta (70 o più) sulla parte prima di un drop: si sente la carica e il drop la scarica.
- [ ] Mixer: volume, muto, lucchetto, cambia strumento.
- [ ] Scorciatoie da tastiera (↑ ↓, 1-5, G, R, E).
- [ ] Riascolta: rifà le stesse mosse.

## Visual Studio (`#28`, da rivedere)

- [ ] La radio parte con lo Studio; come lo vorresti invece.

## Codice a mano (`#20`, `#33`)

- [ ] Prendere il controllo di un live build scrivendo nel codice, "Riprendi" e "dal punto in cui ero".
- [ ] "Salva come nuova versione" in Componi e in radio; versioni sulla scheda dell'originale.

## Impostazioni (`#31`)

- [ ] Ingranaggio: tema, lingua, visual della radio, formato WAV o Opus.
- [ ] Esporta tutto e importa in un altro browser.

## Registrazione (`#30`)

- [ ] Registrare 5-10 minuti di radio in Opus e ascoltare il file.
- [ ] Pausa durante la registrazione: niente buchi.
- [ ] Scaletta e ricetta scaricate; "Registra dall'inizio".

## Continua in radio (`#29`)

- [ ] In Componi, a metà brano, "▶ Continua in radio": il brano prosegue da lì, poi una transizione porta nella radio in uno stile vicino.
- [ ] Sulla card di un brano, "▶ Continua in radio" parte dall'inizio.
- [ ] Mentre suona il tuo brano la console dice che vale dal prossimo; dal brano dopo funziona. Riascolta rifà anche il tuo brano.

## Sessioni nelle playlist (`#38`)

- [ ] In radio, "+ Playlist" accanto ai comandi e su una sessione della Cronologia.
- [ ] Nella playlist la sessione (📻) suona i suoi brani con le tue mosse, poi passa all'elemento dopo; con Mix entra con una transizione.
- [ ] ❄ Congela; esporta e importa una playlist con una sessione.

## Guida (`#48`)

- [ ] Groove Lab: schede Guida e Lezioni Strudel; chip in alto, card per funzione, tabella "Cosa cambia cosa" nella Radio.
- [ ] "Mostrami" apre la funzione e fa lampeggiare il controllo; il "?" in ogni scheda porta alla sua card.
- [ ] Testi chiari e giusti? Segna qui cosa manca o non torna.

## Anima del brano, fase 1 (`#46`)

- [ ] Il menu dei visual è a tendina accanto a "Schermo intero"; scegli "Anima" con la radio accesa: compare l'anima del brano in onda, prima con la riga "ANALYZING..." e la barra.
- [ ] ◀ e ▶ passano per le dieci viste; ognuna si muove, segue la battuta e ha piccoli eventi suoi (glitch, lampi, impulsi).
- [ ] Un comando della console fa disturbare lo schermo con una riga "RECALIBRATING" e l'anima si ridisegna.
- [ ] Al brano dopo la vista cambia in quella del nuovo brano; con 🔒 resta uguale (anche dopo aver ricaricato la pagina).
- [ ] Tema HW: viste A, B, C in ambra, le altre col filtro retro ambra e titoli leggibili.
- [ ] Anima anche in Componi, sui brani e nelle playlist (curve misurate dalle sezioni); schermo intero; telefono.
- [ ] Un brano con un suo visual non toglie l'Anima se la stai guardando.

## Display dell'anima, fase 2 (`#46`)

- [ ] Sul palco nessun pulsante parla del display; la vitina nell'angolo in basso a destra si svita con tre clic e cade, esce la linguetta "SONG SOUL ANALYZER" (rientra da sola dopo 20 secondi); OPEN apre il portellone, il display si accende e chiede "ANALYZE NOW?" (testi che variano): YES mostra l'anima, NO richiude. Anche scrivendo "soul".
- [ ] I tasti del display: accensione (lo richiude e la vite torna), schermo intero, vista precedente e successiva, blocco, override.
- [ ] Selettore sotto il display: ◀ ▶ cambiano guscio (il display rientra ed esce il nuovo); il guscio scelto resta.
- [ ] Override: il cavo SCART scende da sotto il display ed entra nella presa sotto il palco, il palco mostra l'anima; il cavo si trascina e oscilla; spegnendo torna il visual.
- [ ] Tema HW: guscio MISK/OS 6000 di default, cavo intrecciato con una spia; telefono.

## Casuali (`#50`)

- [ ] Radio: dado accanto ad Artista (artista nuovo con "Tieni" e ×), dadi Stili e Genere, un dado per manopola e uno per tutte con "In range / Casuale", dado Suoni (strumenti diversi dal prossimo brano, × per tornare normali). I tooltip mostrano il seme.
- [ ] Artisti: "Artista casuale" con Tieni, Ancora, Scarta; l'artista tenuto suona in radio e si può modificare.
- [ ] Stili e Generi: "a caso in radio".

## Dopo le prove

- [ ] Nomi degli artisti decisi.
- [ ] Problemi trovati scritti qui o nel DEVLOG.
- [ ] Via libera per `v0.6.0` su `main` (dopo il rilascio riaprire `#28` se GitHub la chiude).
