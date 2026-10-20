import { LitElement, css, html } from 'lit';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';
// @lion/ui@0.14.3, installed under an npm alias
import { LionIcon } from '@lion/ui-legacy/icon.js';
import hammerIcon from './icons/hammer.svg.js';

export class HelloLegacy extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'lion-icon': LionIcon,
  };

  static styles = css`
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
      fill: slategray;
    }
  `;

  render() {
    return html`
      <h1>
        Hello legacy
        <lion-icon .svg=${hammerIcon} aria-label="Hammer"></lion-icon>
      </h1>
    `;
  }
}

customElements.define('hello-legacy', HelloLegacy);
