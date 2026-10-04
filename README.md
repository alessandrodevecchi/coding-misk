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

- **Componi**: sequencer a 16 passi stile TR-909, canali basso, arpeggio, hook, pad e riser. Ogni controllo rigenera il codice Strudel visibile a destra.
- **Scene**: Intro, Build, Drop e Break accendono e spengono i canali (i layer spenti diventano `_$:`).
- **Brani**: player con timeline cliccabile (parte da qualsiasi battuta), pulsanti per ascoltare ogni stacco, ripetizione della sezione, stop automatico.
  - *Ghost Protocol*: hard techno cyberpunk, 60 battute, 1:43. Tempo da 132 a 148 BPM in rampa, layer continui con automazione per battuta, sezioni di passaggio (Fall, Rebuild), cambio di tonalità nel drop B.
  - *Neon Ascent*: techno trance, 128 BPM, 32 battute, 60 s.
- **Visual**: sei temi.
  - *Palco*: batteria, cassa del basso, tastiera, sequencer, synth lead e bobina di Tesla che si accendono quando lo strumento suona.
  - *Pixel*: città pixel art con montagne low poly.
  - *Tramonto*, *Montagne*, *Spazio*, *Sonar*.
- **Guida**: 14 lezioni da caricare e ascoltare.
- **Suoni**: anteprima di drum machine, oscillatori, suoni ruvidi e campioni.
- **Apri su strudel.cc**: porta il codice corrente nell'editor ufficiale.

### Collegare uno strumento ai visual

Aggiungi `.analyze("nome")` a un layer. Nomi riconosciuti dal Palco: `kick`, `snare`, `hats`, `fx`, `bass`, `arp`, `pad`, `hook`, `riser`. Il codice senza tag usa un canale generico.

## Struttura

| Percorso | Contenuto |
| --- | --- |
| `index.html` | Markup dell'interfaccia |
| `src/main.js` | Stato, controlli, render dell'interfaccia, collegamento con l'editor Strudel |
| `src/i18n.js` | Testi in italiano e inglese |
| `src/music.js` | Tonalità, accordi, preset e generatore di codice |
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
