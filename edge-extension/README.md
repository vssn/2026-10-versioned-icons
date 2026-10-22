# Versioned Asset Inspector (Edge-Extension)

Zeigt alle Ressourcen, die eine Seite von einer bestimmten Domain lädt, und
erkennt Versionen im Pfad. Gleiche Assets werden nach Namen gruppiert, ihre
Versionen aufgelistet. Ist dasselbe Asset in mehreren Versionen geladen, wird
es markiert.

```
cdn.example.com/feat-package/1.2.0/bundle.js
                └── Name ──┘ └Ver┘ └ Datei ┘
```

## Installation

1. `edge://extensions` öffnen
2. **Entwicklermodus** einschalten
3. **Entpackte Erweiterung laden** → Ordner `edge-extension/` wählen

Funktioniert genauso in Chrome (`chrome://extensions`).

## Benutzung

1. Seite öffnen, Extension-Icon klicken
2. Domain eingeben, z. B. `cdn.example.com`. Eingaben wie
   `https://cdn.example.com/foo` oder `cdn. example.com` werden bereinigt.
   Mit **inkl. Subdomains** findet `example.com` auch `cdn.example.com`.
3. **Aktueller Tab** oder **Alle Tabs** wählen

| Button        | Funktion                                                         |
| ------------- | ---------------------------------------------------------------- |
| Tab neu laden | lädt den Tab ohne Cache neu, damit jeder Request erfasst wird    |
| JSON          | kopiert Assets, Versionen und übrige URLs in die Zwischenablage |
| Leeren        | verwirft die Aufzeichnung (aktueller Tab bzw. alle Tabs)         |

Die Liste aktualisiert sich live, während die Seite lädt. Die Domain wird
gespeichert.

## Erkannte Versionsmuster

Eine Version ist `Major.Minor[.Patch[.Build]]`, optional mit `v`-Präfix,
Pre-Release (`-beta.1`) und Build-Metadaten (`+sha.5`).

| Muster                    | Beispiel                                          | Name           | Version  |
| ------------------------- | ------------------------------------------------- | -------------- | -------- |
| Version als Pfadsegment   | `cdn.example.com/feat-package/1.2.0/bundle.js`    | `feat-package` | `1.2.0`  |
| mit Scope                 | `cdn.example.com/@scope/pkg/v2.0.0/a.js`          | `@scope/pkg`   | `v2.0.0` |
| `name@version` (npm-CDNs) | `cdn.jsdelivr.net/npm/@lion/ui@0.14.3/dist/x.js`  | `@lion/ui`     | `0.14.3` |
| Version im Dateinamen     | `cdn.example.com/js/jquery-3.7.1.min.js`          | `jquery`       | `3.7.1`  |

Der Name ist das Segment vor der Version. Steht die Version direkt hinter der
Domain (`/1.2.0/app.js`), wird der Hostname als Name verwendet. Pfade wie
`/latest/`, `/v2/` (ohne Minor) oder Hash-Dateinamen (`app.4f3a2b.js`) gelten
nicht als versioniert und erscheinen unter „Weitere Ressourcen“.

## Funktionsweise

- `background.js` (Service Worker) zeichnet über `chrome.webRequest` jeden
  abgeschlossenen oder fehlgeschlagenen Request pro Tab auf (inkl. iFrames,
  max. 3000 URLs pro Tab) und legt ihn in `chrome.storage.session` ab. Beim
  Laden einer neuen Seite im Tab wird die Aufzeichnung zurückgesetzt.
- Das Popup liest zusätzlich `performance.getEntriesByType('resource')` aller
  Frames des Tabs aus. So erscheinen auch Ressourcen, die geladen wurden, bevor
  die Extension installiert oder der Service Worker aktiv war.
- `lib/assets.js` enthält die reine Logik (Domain-Filter, Versionserkennung,
  Gruppierung, SemVer-Sortierung) ohne Browser-APIs.

Berechtigungen: `webRequest` (Requests mitlesen), `scripting` (Performance-
Einträge der Seite lesen), `storage`, Host-Zugriff `<all_urls>`. Es werden
keine Daten versendet.

## Tests

```sh
npm run test:extension
```
