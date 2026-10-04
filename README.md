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

- **Componi**: sequencer a 16 passi stile TR-909, canali basso, arpeggio, hook, pad e riser. Ogni controllo rigenera il codice Strudel visibile a destra.
- **Scene**: Intro, Build, Drop e Break accendono e spengono i canali (i layer spenti diventano `_$:`).
- **Visual**: quattro temi (Tramonto, Montagne, Spazio, Sonar). Forma d'onda reale da `getAnalyzerData`, eco sincronizzate con la cassa.
- **Brani**: pezzi completi con timeline delle sezioni. *Neon Ascent* è una techno trance di 60 secondi (128 BPM, 32 battute) che si ferma da sola.
- **Guida**: 14 lezioni da caricare e ascoltare.
- **Suoni**: anteprima di drum machine, oscillatori e campioni.
- **Apri su strudel.cc**: porta il codice corrente nell'editor ufficiale.

## Struttura

| Percorso | Contenuto |
| --- | --- |
| `index.html` | Markup dell'interfaccia |
| `src/main.js` | Stato, controlli, collegamento con l'editor Strudel |
| `src/music.js` | Tonalità, accordi, preset e generatore di codice |
| `src/content.js` | Lezioni, libreria suoni, riferimenti |
| `src/visuals.js` | Visual su canvas sincronizzati con l'audio |
| `src/style.css` | Stili e temi |
| `patterns/` | Pattern di esempio e brani completi (`05-neon-ascent.js`), anche da incollare su strudel.cc |

## Note

- Strudel è una dipendenza npm (`@strudel/repl`), non un fork. Per aggiornarlo: `npm update @strudel/repl`.
- I campioni di batteria arrivano da GitHub al primo utilizzo: serve la connessione.
- Strudel è distribuito con licenza AGPL-3.0. Per uso locale non cambia nulla; se un giorno pubblichiamo il tool, il codice va rilasciato con licenza compatibile.
