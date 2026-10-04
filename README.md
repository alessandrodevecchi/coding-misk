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
- **Brani**: pezzi completi con timeline delle sezioni, partenza dalla battuta 1 e stop automatico.
  - *Ghost Protocol*: hard techno cyberpunk, 36 battute, 60 s. Tempo da 135 a 150 BPM, cambi di drum machine, tonalità e groove per sezione.
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
- Il tempo si può cambiare dentro un brano con un evento muto `.cps(bpm / 240)`. Al cambio lo scheduler può perdere qualche nota già programmata.
- Strudel è distribuito con licenza AGPL-3.0. Per uso locale non cambia nulla; se un giorno pubblichiamo il tool, il codice va rilasciato con licenza compatibile.
