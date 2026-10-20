// @lion/ui@0.14.3, installed under an npm alias
import { LionIcon } from '@lion/ui-legacy/icon.js';
import starIcon from './icons/star.svg.js';

// Standard Scoped Custom Element Registry API, no ScopedElementsMixin:
// https://developer.mozilla.org/en-US/docs/Web/API/Element/customElementRegistry
const registry = new CustomElementRegistry();
registry.define('lion-icon', LionIcon);

export class HelloScopedRegistry extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open', customElementRegistry: registry });
    shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, sans-serif;
          padding: 2rem;
        }

        h1 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        lion-icon {
          fill: goldenrod;
        }
      </style>
      <h1>
        Hello Scoped Registry
        <lion-icon aria-label="Star"></lion-icon>
      </h1>
    `;
    shadowRoot.querySelector('lion-icon').svg = starIcon;
  }
}

customElements.define('hello-scoped-registry', HelloScopedRegistry);
