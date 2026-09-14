# Pokémon Kids

Winziges, text-freies Pokémon-Sammelspiel für kleine Kinder (die noch nicht lesen).
Über die Wiese laufen, dem raschelnden Gras folgen, mit einem Wurf fangen (Timing der
Power-Leiste), im Haus alle 10 sammeln. Touch **und** Tastatur. Speichert im Browser.

## Lokal starten

```
python -m http.server 8080
# dann http://localhost:8080/
```

## Eigene Sprites einsetzen

Lege 10 transparente PNGs unter `assets/pokemon/` ab: `01.png` … `10.png`.
Fehlt eins, zeichnet das Spiel automatisch einen bunten Platzhalter.

## Tests

```
npm test
```
