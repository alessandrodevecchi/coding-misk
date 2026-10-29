---
id: glossary
related: [profiles, radio-commands, growth-shapes, settings, songs]
code: [src/i18n.js]
checks: [npm run check:guide, npm run check:knowledge]
---

# Glossary

The owner speaks Italian; the code, the docs and this knowledge base are in English. Use these words in both languages, the same way the app does.

## Words we use

**Genre, style, artist.** The owner mixes them up, so the app and the docs keep one meaning each: a **genre** (genere) is a broad family of music, a fixed list (Techno); a **style** (stile) is a precise recipe inside one genre (Techno berlinese); an **artist** (artista) is an invented name with a taste that mixes styles (Velvet Monk). The app invents styles and artists, never genres (invented-styles, `#51`).

- **Song** (it: brano): the whole piece. Not "composition", which sits too close to the Compose tab.
- **Track** (it: traccia): one row of the arranger, an instrument with its settings, rack, patterns and clips.
- **Section** (it: sezione): a part of the song, like an intro or a drop. The word "scene" is no longer used in the interface; old code and saves still say scene.
- **Pattern** and **clip**: what a track plays, and where it plays it.
- **Idea** (it: idea): a pattern written as a small musical idea instead of every step.
- **Live build** (it: in divenire): a song that builds itself while it plays. A **step** (it: passo) is one timed change.
- **Voice: narrator** (it: Voce: narratore) speaks the step comments; **Voice: track** (it: Voce: traccia; "voice track" in sentences) speaks lines in the music (track type `spoken`, once "voice instrument"). A **voice style** (it: stile della voce) sets their sound; **Where it speaks** (it: Dove parla) picks quiet, medium and busy parts.
- **Director** (it: regista): the code that writes radio songs. **Recipe** or **style** (it: stile): a JSON file the director reads.
- **Live coder** is the profile shown to people; its id stays `switch`.
- **Groove Lab** and **Listen** (it: Ascolta) are the two modes of the app.
- **Patterns in this song** (it: Pattern disponibili nel brano) and **Make** (it: Crea): the pattern row of a track panel, with its marks and status line, and the row of the tools that make patterns.
- **Pattern preview** (it: anteprima del pattern): the small second player of Compose, with the headphones icon. The play triangle means the player bar takes what you press; the headphones mean a preview; the flask opens the Patterns tab.
- **FM amount** (it: quantità FM): the FM index of an FM card in the Sounds tab, from 0 to the card's maximum; a slider, a horizontal fader in the hardware theme.
- **Lab preview** (it: ascolto da solo): the third preview player, for the FM cards of the Sounds tab; with the headphones, like the pattern preview. Its listening modes: **Phrase** (it: Frase), **Held note** (it: Nota tenuta), **FM rise** (it: Salita FM).
- **bar** (the same word in both languages): the bar counter of the player bar, `bar 12 / 64`.

## Interface terms

Generated from the app's own texts in `src/i18n.js`: the tabs, the profiles, the live build options, growth shapes, radio knobs and transitions, console commands, voice ways and a few other labels.

<!-- generated:glossary -->
| Area | English | Italian | Key |
| --- | --- | --- | --- |
| Tabs | Artists | Artisti | `tabArtisti` |
| Tabs | Styles | Stili | `tabStili` |
| Tabs | Genres | Generi | `tabGeneri` |
| Tabs | Playlists | Playlist | `tabPlaylist` |
| Tabs | Compose | Componi | `tabComponi` |
| Tabs | Songs | Brani | `tabBrani` |
| Tabs | Guide | Guida | `tabGuida` |
| Tabs | Strudel lessons | Lezioni Strudel | `tabLezioni` |
| Tabs | Sounds | Suoni | `tabSuoni` |
| Tabs | References | Riferimenti | `tabRiferimenti` |
| Tabs | Radio | Radio | `tabRadio` |
| Tabs | Patterns | Pattern | `tabPattern` |
| Profiles | Classic | Classico | `profile:classic` |
| Profiles | Crescendo | Crescendo | `profile:crescendo` |
| Profiles | Live coder | Live coder | `profile:switch` |
| Live build options | Build style | Andamento | `liveStyle` |
| Live build options | Growth | Crescita | `growthLbl` |
| Live build options | Growth duration | Durata della crescita | `durLbl` |
| Live build options | On | Accesa | `liveNarrator` |
| Live build options | Narrated growth | Crescita raccontata | `liveNarrated` |
| Live build options | Narrator style | Stile del narratore | `narratorStyleLbl` |
| Live build options | Code typing | Scrittura del codice | `setTyping` |
| Live build options | Code view | Vista del codice | `liveCodeView` |
| Live build options | Generator | Generatore | `liveGen` |
| Live build options | Title | Titolo | `liveTitle` |
| Live build options | Lit notes | Note accese | `liveHl` |
| Live build options | Line breaks | A capo | `liveWrap` |
| Live build options | Human typing | Scrittura umana | `liveHuman` |
| Live build options | Typing mistakes | Errori di battitura | `liveMistakes` |
| Live build options | Tracks | Tracce | `cOpt:tracks` |
| Live build options | Notes | Note | `cOpt:notes` |
| Live build options | Step phrases | Frasi dei passi | `cOpt:steps` |
| Live build options | Narrator voice code | Codice voce narratore | `cOpt:voice` |
| Live build options | Bus | Bus | `fOpt:fnBus` |
| Live build options | Mixer | Mixer | `fOpt:fnLevel` |
| Live build options | Distortion | Distorsione | `fOpt:fnCrunch` |
| Live build options | Voice effects | Effetti voci | `fOpt:fnVoice` |
| Live build options | Song | Del brano | `fOpt:fnSong` |
| Live build options | Library | Libreria | `fOpt:fnLib` |
| Live build options | Sections | Sezioni | `fOpt:fnLanes` |
| Live build options | Opening | Apertura | `openingLbl` |
| Live build options | Pace | Velocità | `paceLbl` |
| Live build options | Development | Sviluppo | `developmentLbl` |
| Growth shape values | Slow | Lenta | `opening:slow` |
| Growth shape values | full kick | cassa intera | `opening:full-kick` |
| Growth shape values | from silence | dal silenzio | `opening:typed` |
| Growth shape values | broken beat | ritmo spezzato | `opening:broken` |
| Growth shape values | filtered kick | cassa filtrata | `opening:filtered` |
| Growth shape values | arpeggio or melody | arpeggio o melodia | `opening:melodic` |
| Growth shape values | pad or drone | pad o bordone | `opening:pad` |
| Growth shape values | voice track | voce traccia | `opening:voice` |
| Growth shape values | muted base | base muta | `opening:muted-base` |
| Growth shape values | mid-set | a metà set | `opening:mid-set` |
| Growth shape values | slow | lenta | `pace:slow` |
| Growth shape values | medium | media | `pace:medium` |
| Growth shape values | fast | veloce | `pace:fast` |
| Growth shape values | by type | per tipo | `development:by-type` |
| Growth shape values | as written | come scritto | `development:as-written` |
| Growth shape values | masks | maschere | `development:masks` |
| Growth shape values | parameters only | solo parametri | `development:parameters` |
| Growth shape values | second section | seconda sezione | `development:second-section` |
| Growth shape values | metamorphosis | metamorfosi | `development:metamorphosis` |
| Radio | Chaos | Caos | `radioChaos` |
| Radio | Energy | Energia | `radioEnergy` |
| Radio | Complexity | Complessità | `radioComplexity` |
| Radio | Voice: narrator | Voce: narratore | `radioTalk` |
| Radio | Transitions | Transizioni | `radioTransition` |
| Radio | Harmony | Armonia | `radioHarmony` |
| Radio | Material | Materiale | `matSource` |
| Radio | Profile | Profilo | `radioProfile` |
| Radio | Mix | Mix | `tx:mix` |
| Radio | Morph | Morph | `tx:morph` |
| Radio | Break and riser | Break con riser | `tx:break` |
| Radio | Echo out | Eco in uscita | `tx:echo` |
| Radio | Interlude | Interludio | `tx:interlude` |
| Radio | Cut | Stacco netto | `tx:cut` |
| Radio | Varied | Variati | `matShort:varied` |
| Radio | Composed | Composti | `matShort:composed` |
| Radio | Mix | Misto | `matShort:mix` |
| Console commands | ▲ More energy | ▲ Più energia | `steer:energy-up` |
| Console commands | ▼ Less energy | ▼ Meno energia | `steer:energy-down` |
| Console commands | More complex | Più complesso | `steer:more-complex` |
| Console commands | Simpler | Più semplice | `steer:less-complex` |
| Console commands | Saved pattern | Pattern salvato | `steer:pattern` |
| Console commands | Part harmony | Armonia della parte | `steer:voicing` |
| Console commands | Darker | Più scuro | `steer:darker` |
| Console commands | Brighter | Più brillante | `steer:brighter` |
| Console commands | Dirtier | Più sporco | `steer:dirtier` |
| Console commands | Cleaner | Più pulito | `steer:cleaner` |
| Console commands | More space | Più spazio | `steer:more-space` |
| Console commands | Change instrument | Cambia strumento | `steer:instrument` |
| Console commands | Change chords | Cambia accordi | `steer:progression` |
| Console commands | Change key | Cambia tonalità | `steer:key` |
| Console commands | Talk more | Parla di più | `steer:talk-more` |
| Console commands | Talk less | Parla di meno | `steer:talk-less` |
| Console commands | Voice: track | Voce: traccia | `steer:voice` |
| Console commands | Add a line | Aggiungi frase | `steer:say-live` |
| Console commands | Voice style | Stile della voce | `steer:voice-sound` |
| Console commands | Go to the drop | Vai al drop | `steer:drop` |
| Console commands | Stay here | Resta qui | `steer:stay` |
| Console commands | End the song | Chiudi il brano | `steer:end` |
| Console commands | Curve | Curva | `steer:curve` |
| Voice | spoken passage | passaggio parlato | `way:passage` |
| Voice | refrain | ritornello | `way:refrain` |
| Voice | chop | taglio | `way:chop` |
| Voice | opening | apertura | `way:opening` |
| Other | Artist | Artista | `radioArtist` |
| Other | Custom | Personalizzato | `radioCustom` |
| Other | Favourite styles | Stili preferiti | `artStyles` |
| Other | Quirks | Manie | `artQuirks` |
| Other | Keys | Tonalità | `libKeys` |
| Other | Progressions | Progressioni | `libProgressions` |
| Other | Meters | Metri | `libMeters` |
| Other | Energy shapes | Curve di energia | `libShapes` |
| Other | Title words | Parole dei titoli | `libWords` |
| Other | Favourites | Preferiti | `favourites` |
| Other | Resume live build | Riprendi il divenire | `handResume` |
| Other | BY HAND | A MANO | `handTag` |
| Other | Save as pattern | Salva come pattern | `ptSaveAs` |
| Other | Player | Player | `player` |
| Other | Compilation | Compilation | `compBtn` |
<!-- /generated -->

To find any other text, search its English or Italian words in `src/i18n.js`: both languages share the key.
