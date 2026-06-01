// Custom element event emitted when the player taps the bridge HUD button.
const BRIDGE_ACTION_EVENT = 'prepare-bridge';

// Web Component wrapping the bridge action UI. The game HUD controls it through
// attributes/properties instead of rebuilding the button markup manually.
export class BridgeActionButton extends HTMLElement {
  static get observedAttributes() {
    return ['disabled', 'aria-label'];
  }

  // Called by the browser when <bridge-action-button> is added to the page.
  connectedCallback() {
    if (!this.button) {
      this.render();
    }

    this.syncDisabledState();
  }

  attributeChangedCallback() {
    this.syncDisabledState();
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }

  set disabled(value) {
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  get available() {
    return !this.disabled;
  }

  set available(value) {
    this.disabled = !value;
  }

  // Internal markup stays inside the component; outside code only listens for
  // the prepare-bridge event.
  render() {
    this.innerHTML = `
      <button class="bridge-action" type="button">
        <span class="bridge-action__hint">You can build a bridge</span>
        <span class="bridge-action__button" aria-hidden="true">
          <span class="bridge-action__key">E</span>
        </span>
      </button>
    `;

    this.button = this.querySelector('button');
    this.button.addEventListener('click', () => {
      if (this.disabled) return;

      this.dispatchEvent(new CustomEvent(BRIDGE_ACTION_EVENT, {
        bubbles: true
      }));
    });
  }

  // Mirrors the custom element's disabled attribute to the real inner button.
  syncDisabledState() {
    if (!this.button) return;

    const label = this.getAttribute('aria-label') ?? 'Prepare bridge with three logs';
    this.button.disabled = this.disabled;
    this.button.setAttribute('aria-label', label);
    this.setAttribute('aria-disabled', String(this.disabled));
  }
}

if (!customElements.get('bridge-action-button')) {
  customElements.define('bridge-action-button', BridgeActionButton);
}
