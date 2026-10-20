# versioned-icons

Hello-World-App, die zwei Versionen der
[Lion Icon Web-Komponente](https://github.com/ing-bank/lion/tree/master/packages/ui/components/icon)
parallel auf einer Seite nutzt:

| Komponente       | Paket                                     | Icon   |
| ---------------- | ----------------------------------------- | ------ |
| `<hello-world>`  | `@lion/ui@0.25.x`                         | Herz   |
| `<hello-legacy>` | `@lion/ui@0.14.3` (Alias `@lion/ui-legacy`) | Hammer |

Die SVGs stammen aus den Lion-Tests (`src/icons/`).

## Start

```sh
npm install
npm start        # Dev-Server (Vite)
npm run build    # Produktions-Build nach dist/
```

## Scoping

Beide Versionen definieren `lion-icon`. Ein Tag-Name kann in der globalen
Custom Elements Registry nur einmal registriert werden. Deshalb registriert
jede Host-Komponente ihre Version über `ScopedElementsMixin`
(`@open-wc/scoped-elements`) in einer eigenen, scoped Registry ihres Shadow
Roots:

```js
class HelloLegacy extends ScopedElementsMixin(LitElement) {
  static scopedElements = { 'lion-icon': LionIcon }; // aus @lion/ui-legacy
}
```

Global registriert sind nur `hello-world` und `hello-legacy`.

Der Polyfill `@webcomponents/scoped-custom-element-registry` muss als Erstes
geladen werden (siehe `src/main.js`).

### Hinweis: IconManager

Beide Versionen teilen sich über `singleton-manager` denselben Schlüssel
`@lion/ui::icons::0.x` für den `IconManager`. Hier spielt das keine Rolle,
weil die SVGs direkt über `.svg` gesetzt werden. Für Icon-Resolver über
`icon-id` müsste man das gezielt behandeln.
