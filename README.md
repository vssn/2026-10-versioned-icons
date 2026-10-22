# versioned-icons

Hello-World-App, die zwei Versionen der
[Lion Icon Web-Komponente](https://github.com/ing-bank/lion/tree/master/packages/ui/components/icon)
parallel auf einer Seite nutzt:

| Komponente                | Paket                                       | Scoping                            | Icon   |
| ------------------------- | ------------------------------------------- | ---------------------------------- | ------ |
| `<hello-world>`           | `@lion/ui@0.25.x`                           | `ScopedElementsMixin`              | Herz   |
| `<hello-legacy>`          | `@lion/ui@0.14.3` (Alias `@lion/ui-legacy`) | `ScopedElementsMixin`              | Hammer |
| `<hello-scoped-registry>` | `@lion/ui@0.14.3` (Alias `@lion/ui-legacy`) | Standard-API `customElementRegistry` | Stern  |

Herz und Hammer stammen aus den Lion-Tests, der Stern ist selbst gezeichnet (`src/icons/`).

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

`<hello-scoped-registry>` ist ein schlichtes `HTMLElement` ohne Mixin und nutzt
die [standardisierte API](https://developer.mozilla.org/en-US/docs/Web/API/Element/customElementRegistry):

```js
const registry = new CustomElementRegistry();
registry.define('lion-icon', LionIcon);
this.attachShadow({ mode: 'open', customElementRegistry: registry });
```

### Polyfill

`src/polyfills.js` wird als Erstes geladen und enthält
`@webcomponents/scoped-custom-element-registry`. Der Polyfill ersetzt immer auch
eine native Implementierung. Das ist nötig, weil `@open-wc/scoped-elements`
(3.0.10) mit Lit auf `shadowRoot.importNode` setzt. Das gibt es nur im
Polyfill, nativ schlägt das Rendern fehl.

Der Polyfill (0.0.10) kennt allerdings nur die älteren Optionsnamen `registry`
bzw. `customElements`. `src/polyfills.js` bildet deshalb die Standard-Option
`customElementRegistry` darauf ab. Ohne diese Abbildung würde
`<hello-scoped-registry>` in die globale Registry rendern und das Icon nie
upgraden.

### Hinweis: IconManager

Beide Versionen teilen sich über `singleton-manager` denselben Schlüssel
`@lion/ui::icons::0.x` für den `IconManager`. Hier spielt das keine Rolle,
weil die SVGs direkt über `.svg` gesetzt werden. Für Icon-Resolver über
`icon-id` müsste man das gezielt behandeln.

## Edge-Extension: Versioned Asset Inspector

[`edge-extension/`](edge-extension/) enthält eine Browser-Extension für Edge
(und Chrome), die alle Ressourcen einer Domain auflistet und versionierte
Pfade wie `cdn.example.com/feat-package/1.2.0/bundle.js` nach Asset-Name und
Version gruppiert. So sieht man z. B. sofort, dass `@lion/ui` in zwei
Versionen geladen wird. Details in der [README](edge-extension/README.md).
