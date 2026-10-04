# coding-misk

Synth lab locale per comporre musica con il codice usando [Strudel](https://strudel.cc/), il porting JavaScript di [TidalCycles](https://tidalcycles.org/).

Ispirazione: [Coding Trance Music (Full Narrated)](https://www.youtube.com/watch?v=GWXCCBsOMSg) di Switch Angel.

## Avvio

Serve Node.js 20 o successivo.

```sh
npm install
npm run dev
```

Si apre <http://localhost:5173>. Premi **Play**.

- `Ctrl+Enter` o `⌘+Enter` avvia o aggiorna, da qualsiasi punto della pagina
- `Ctrl+.` ferma

## Interfaccia

Italiano e inglese, con il selettore IT/EN in alto a destra.

- **Barra in alto**: Play/Pausa, Stop, lingua. Barra spaziatrice = play e pausa.
- **Componi**: arrangiatore a scene con selettore del brano. Ogni scena ha nome, battute, entrata (taglio netto o dissolvenza), BPM (anche in rampa fino a fine scena), tonalità, accordi (anche settime), metro (4/4, 3/4, 5/4, 7/8), swing, crash sul primo colpo, mezza battuta di silenzio finale, e tutti i canali: sequencer (7 righe), basso, arpeggio, hook, pad, texture, riser. Ogni canale può usare un oscillatore o uno strumento General MIDI (chitarre, organi, piano elettrico, basso, archi, vibrafono…). Volume e filtro hanno l'automazione ↗ fino a fine scena; ci sono saturazione, sgranatura (bitcrusher), risonanza, FM e filtro vocale. Clic su una scena mentre suona = salto lì. Salva, Salva come nuovo, Nuovo brano, Elimina o Ripristina originale.
- **Brani**: tutti i brani a scene si aprono in Componi. Player con timeline cliccabile, Pausa/Riprendi e Stop, pulsanti per gli stacchi, ripetizione della sezione, stop automatico.
  - *Ghost Protocol* e *Neon Ascent* in versione a scene, *Synth Lab Demo* (la traccia di prova del primo giorno).
  - *Neon Rush · reel 28s* (techno cyberpunk, 145 BPM, 17 battute esatte), *Settimo Cielo* (progressive rock in 7/8, 5/4 e 4/4), *Pioggia sul vetro* (lo-fi con swing e vinile).
  - *Ten Years · ricostruzione* e *DCI Jingle · ricostruzione*: ricostruite analizzando due tracce audio (tempo, tonalità, accordi per battuta, struttura, griglia della batteria, sidechain).
  - *Next Chapter* e *DCI Ignition*: brani nuovi negli stessi due stili.
  - **⬇ Esporta WAV** (card e arrangiatore): registra il brano in tempo reale e scarica un WAV stereo 16 bit.
  - In fondo, le versioni originali scritte a mano (`patterns/05`, `patterns/06`), modificabili nell'editor con Salva il codice nel brano.
  - *Ghost Protocol* (codice): hard techno cyberpunk, 60 battute, 1:43. Tempo da 132 a 148 BPM in rampa, layer continui con automazione per battuta, sezioni di passaggio (Fall, Rebuild), cambio di tonalità nel drop B.
  - *Neon Ascent*: techno trance, 128 BPM, 32 battute, 60 s.
- **Visual**: sei temi.
  - *Palco*: batteria, cassa del basso, tastiera, sequencer, synth lead e bobina di Tesla che si accendono quando lo strumento suona.
  - *Pixel*: città pixel art con montagne low poly.
  - *Tramonto*, *Montagne*, *Spazio*, *Sonar*.
- **Guida**: 14 lezioni da caricare e ascoltare.
- **Suoni**: anteprima di drum machine, oscillatori, suoni ruvidi e campioni.
- **Apri su strudel.cc**: porta il codice corrente nell'editor ufficiale. Rampe di tempo, salto a una battuta e campioni extra funzionano solo in coding-misk.

### Collegare uno strumento ai visual

Aggiungi `.analyze("nome")` a un layer. Nomi riconosciuti dal Palco: `kick`, `snare`, `hats`, `fx`, `bass`, `arp`, `pad`, `hook`, `riser`. Il codice senza tag usa un canale generico.

## Campioni personalizzati

Metti file WAV, MP3, OGG o FLAC in `public/samples/`: una cartella per strumento (`voce/01.wav` → `s("voce").n(0)`) o un file sciolto (`swoosh.wav` → `s("swoosh")`). Il plugin in `vite.config.js` genera `/samples/strudel.json`; i suoni compaiono nel canale Texture e nel tab Suoni dopo un ricaricamento. Dettagli in `public/samples/README.md`.

## Struttura

| Percorso | Contenuto |
| --- | --- |
| `index.html` | Markup dell'interfaccia |
| `src/main.js` | Libreria dei brani, arrangiatore, controlli, trasporto, collegamento con l'editor Strudel |
| `src/i18n.js` | Testi in italiano e inglese |
| `src/music.js` | Tonalità, accordi, preset, stato di una scena, compilatore da scene a codice, brano demo |
| `src/tracks.js` | Brani a scene inclusi: Ghost Protocol, Neon Ascent, ricostruzioni e brani nuovi |
| `vite.config.js` | Plugin che pubblica i campioni di `public/samples/` |
| `src/songs.js` | Lettura di sezioni e tempo dal codice di un brano |
| `src/content.js` | Lezioni, libreria suoni, riferimenti |
| `src/visuals.js` | Visual su canvas sincronizzati con l'audio |
| `src/style.css` | Stili e temi |
| `patterns/` | Pattern di esempio e brani completi (`05-neon-ascent.js`, `06-ghost-protocol.js`), anche da incollare su strudel.cc |

## Note

- Strudel è una dipendenza npm (`@strudel/repl`), non un fork. Per aggiornarlo: `npm update @strudel/repl`.
- I campioni arrivano da GitHub al primo utilizzo: serve la connessione. L'app carica l'archivio completo di dirt-samples, il REPL di base ne carica solo una parte.
- Non usare `.cps()` dentro un pattern per cambiare tempo: lo scheduler ricalcola le note in coda con il riferimento sbagliato e ne scarta alcune. I brani dichiarano `const TEMPO = {…}` e il player cambia il tempo battuta per battuta con `scheduler.setCps`. Su strudel.cc il brano resta al tempo di `setcpm`.
- Il player legge dal codice del brano due righe su una sola linea, con apici singoli: `const SECTIONS = [['intro', 8], …]` e `const TEMPO = {'intro': 132, 'build': [132, 140], …}` (un numero è fisso, `[da, a]` è una rampa).
- Nel codice Strudel i doppi apici e i backtick sono mini-notation. Le stringhe JavaScript normali vanno tra apici singoli; `mini('…')` le trasforma in pattern.
- Strudel è distribuito con licenza AGPL-3.0. Per uso locale non cambia nulla; se un giorno pubblichiamo il tool, il codice va rilasciato con licenza compatibile.

- I brani salvati e la bozza in corso stanno nel `localStorage` del browser (`coding-misk-library`, `coding-misk-draft`). Svuotare i dati del sito li cancella.
