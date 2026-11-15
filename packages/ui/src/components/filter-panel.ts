import { html, css, nothing } from 'lit';
import { define } from '../base.js';
import { CmSidePanel } from './side-panel.js';
import './search.js';
import './button.js';

/** Filter values: one entry per field name; a name used by several checked fields gives an array. */
export type FilterValues = Record<string, string | string[]>;

/**
 * "Search and Filter": a Side panel holding a search field and the fields that narrow a list (status, type,
 * category, date range, tags), with Reset and Search at the bottom. Put the fields in a `<form>` in the panel
 * (any form controls with a `name`, including `cm-select`, `cm-text-field`, `cm-checkbox`); the panel reads
 * and resets that form.
 *
 * A native modal `<dialog>`, like Side panel: Esc and the backdrop ask to close, scrolling is locked, focus
 * returns to the opener (usually the filter button of `cm-search`).
 * @element cm-filter-panel
 * @slot - A `<form>` with the filter fields.
 * @fires cm-filter-apply - When Search is pressed (or Enter in the search field). `detail: { values, query }`. Cancelable: call `preventDefault()` to keep the panel open (e.g. an invalid date range).
 * @fires cm-filter-reset - When Reset is pressed, after the fields went back to their first values.
 * @fires cm-open - After the panel opens.
 * @fires cm-close - Before it closes from Esc, the backdrop or the close button. `detail: { reason }`. Cancelable.
 * @fires cm-closed - After it has closed.
 */
export class CmFilterPanel extends CmSidePanel {
  static properties = {
    ...CmSidePanel.properties,
    search: { type: Boolean },
    query: {},
    searchLabel: { attribute: 'search-label' },
    searchPlaceholder: { attribute: 'search-placeholder' },
    applyLabel: { attribute: 'apply-label' },
    resetLabel: { attribute: 'reset-label' },
  };

  /** Title in the header. */
  heading = 'Search and Filter';
  /** Shows a search field above the filters. */
  search = false;
  /** Text in the search field. */
  query = '';
  /** Accessible name of the search field. */
  searchLabel = 'Search';
  /** Placeholder of the search field. */
  searchPlaceholder = 'Search anything';
  /** Text of the main button. */
  applyLabel = 'Search';
  /** Text of the reset button. */
  resetLabel = 'Reset';

  static styles = [
    ...CmSidePanel.styles,
    css`
      .search { display: block; margin-bottom: var(--cm-space-20); }
      .foot { justify-content: center; }
      ::slotted(form) { display: grid; gap: var(--cm-space-15); }
    `,
  ];

  /** The `<form>` holding the fields: a direct child, or the first one inside the panel. */
  get form(): HTMLFormElement | null {
    return this.querySelector('form');
  }

  /** The current filter values, keyed by field name. Empty values are left out. */
  get values(): FilterValues {
    const out: FilterValues = {};
    const add = (k: string, v: string) => {
      if (v === '') return;
      const cur = out[k];
      out[k] = cur === undefined ? v : Array.isArray(cur) ? [...cur, v] : [cur, v];
    };
    const form = this.form;
    if (form) {
      for (const [k, v] of new FormData(form)) if (typeof v === 'string') add(k, v);
      return out;
    }
    this.querySelectorAll<HTMLElement & { value?: string; checked?: boolean; type?: string }>('[name]').forEach((f) => {
      const name = f.getAttribute('name')!;
      if (('checked' in f) && (f.type === 'checkbox' || f.type === 'radio' || f.localName.match(/^cm-(checkbox|radio|toggle)$/))) {
        if (f.checked) add(name, f.value || 'on');
      } else if (typeof f.value === 'string') add(name, f.value);
    });
    return out;
  }

  /** Puts every field back to its first value and clears the search. */
  reset() {
    const form = this.form;
    if (form) form.reset();
    else this.querySelectorAll<HTMLElement & { formResetCallback?: () => void }>('[name]').forEach((f) => f.formResetCallback?.());
    this.query = '';
  }

  #apply = () => {
    const ok = this.dispatchEvent(new CustomEvent('cm-filter-apply', {
      detail: { values: this.values, query: this.query }, bubbles: true, composed: true, cancelable: true,
    }));
    if (ok) this.requestClose('action');
  };

  #reset = () => {
    this.reset();
    this.dispatchEvent(new CustomEvent('cm-filter-reset', { bubbles: true, composed: true }));
  };

  protected renderBody() {
    return html`${this.search ? html`<cm-search class="search" part="search" .value=${this.query} label=${this.searchLabel}
        placeholder=${this.searchPlaceholder}
        @input=${(e: Event) => { this.query = (e.target as HTMLInputElement).value; }}
        @cm-search=${(e: Event) => { e.stopPropagation(); this.#apply(); }}></cm-search>` : nothing}
      <slot @submit=${(e: Event) => { e.preventDefault(); this.#apply(); }}></slot>`;
  }

  protected renderFooter() {
    return html`<cm-button part="reset" @click=${this.#reset}>${this.resetLabel}</cm-button>
      <cm-button part="apply" variant="primary" @click=${this.#apply}>${this.applyLabel}</cm-button>`;
  }

  protected get showFooter() { return true; }
}
define('cm-filter-panel', CmFilterPanel);

declare global { interface HTMLElementTagNameMap { 'cm-filter-panel': CmFilterPanel } }
