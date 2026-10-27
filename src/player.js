// <radio-player> custom element. Filled in over the following stages.
export class RadioPlayer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.textContent = this.getAttribute('title') || 'Radio';
  }
}
