# versioned-icons

Hello-World-App mit der [Lion Icon Web-Komponente](https://github.com/ing-bank/lion/tree/master/packages/ui/components/icon) (`@lion/ui`).

Angezeigt wird das Herz-SVG aus den Lion-Tests (`src/icons/heart.svg.js`).

## Start

```sh
npm install
npm start        # Dev-Server (Vite)
npm run build    # Produktions-Build nach dist/
```

## Aufbau

- `index.html` – Einstiegsseite, rendert `<hello-world>`
- `src/hello-world.js` – Lit-Komponente, die `<lion-icon>` mit dem SVG nutzt
- `src/icons/heart.svg.js` – SVG als Lit-Tag-Funktion (Format, das `lion-icon` erwartet)

`lion-icon` wird aktuell global über `@lion/ui/define/lion-icon.js` in der
Custom Elements Registry registriert. Sollen später zwei Versionen parallel
laufen, muss die Registrierung auf Scoped Custom Element Registries
(z. B. `@open-wc/scoped-elements`) umgestellt werden.
