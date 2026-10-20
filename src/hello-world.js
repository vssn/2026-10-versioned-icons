import { LitElement, css, html } from 'lit';
import '@lion/ui/define/lion-icon.js';
import heartIcon from './icons/heart.svg.js';

export class HelloWorld extends LitElement {
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
      fill: crimson;
    }
  `;

  render() {
    return html`
      <h1>
        Hello World
        <lion-icon .svg=${heartIcon} aria-label="Heart"></lion-icon>
      </h1>
    `;
  }
}

customElements.define('hello-world', HelloWorld);
