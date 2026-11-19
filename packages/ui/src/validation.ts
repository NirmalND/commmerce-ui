import type { ReactiveElement } from 'lit';

/**
 * Field validation messages (1.14): one behaviour for every form field.
 *
 * - Leaving a field the person changed shows its own message under it when the value is wrong for any reason except
 *   "required and empty" (format, range, step, pattern, length, text that isn't a date). Tabbing past an empty
 *   required field shows nothing.
 * - A submit that fails because of invalid fields shows the message on every invalid field, required ones included,
 *   instead of the browser's bubble, and moves focus to the first one.
 * - Once shown, the message follows the value: it changes while the person types and goes as soon as the value is
 *   valid. An `error` set by the app always wins.
 *
 * "A submit" means `invalid` events caused by something the person did: a click (a submit button, the save bar) or
 * Enter or a Ctrl/Cmd shortcut, or the field's own `reportValidity()`. Silent checks by the app (`checkValidity()`
 * while typing or on load) keep the browser's behaviour and show nothing, so a Save button that is enabled from
 * `form.checkValidity()` doesn't light up every field.
 *
 * Usage: `#v = new FieldValidity(this, this.#internals)`; render `this.#v.message` where `error` was rendered (and
 * in aria-invalid / aria-describedby); call `this.#v.sync()` after every validity change (end of `updated()`);
 * `this.#v.reset()` in `formResetCallback`; `this.#v.report()` in a `reportValidity()` override. While a message
 * shows, the host has the `data-cm-invalid` attribute, for the critical border.
 */

type Host = ReactiveElement & { error?: string };

// Set during the task of a click, Enter or Ctrl/Cmd shortcut anywhere on the page; cleared on the next task.
let userAction = false;
// The first invalid field of this action has been focused.
let focused = false;
let listening = false;
const mark = () => {
  if (userAction) return;
  userAction = true;
  setTimeout(() => { userAction = false; focused = false; });
};
function listen() {
  if (listening || typeof document === 'undefined') return;
  listening = true;
  document.addEventListener('click', mark, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.ctrlKey || e.metaKey) mark(); }, true);
}

export class FieldValidity {
  #host: Host;
  #internals: ElementInternals;
  #focus: () => void;
  #changed = false;
  #shown = false;
  #synced = '';
  #reporting = false;

  /** `focus` moves focus to the field; the default focuses the host (components with `delegatesFocus`). */
  constructor(host: Host, internals: ElementInternals, focus?: () => void) {
    this.#host = host;
    this.#internals = internals;
    this.#focus = focus ?? (() => host.focus());
    listen();
    host.addEventListener('invalid', this.#onInvalid);
    // Capture: some fields stop their inner input's own `input` event and send one only for a committed value.
    host.addEventListener('input', this.#onEdit, true);
    host.addEventListener('change', this.#onEdit, true);
    host.addEventListener('focusout', this.#onLeave);
  }

  #compute(): string {
    if (this.#host.error) return this.#host.error;
    if (!this.#shown) return '';
    const v = this.#internals.validity;
    return v.valid ? '' : this.#internals.validationMessage;
  }

  /** The message to show under the field: the app's `error`, or the field's own message once it is shown. */
  get message(): string {
    return this.#compute();
  }

  /** Call after the validity changed: re-renders when the message to show is different from the one on screen. */
  sync() {
    const m = this.#compute();
    this.#host.toggleAttribute('data-cm-invalid', !!m);
    // Validity is set after render, so a render may have shown the previous message: render once more when it
    // changed. Compared with the last synced message, never with what render read, so it can't loop.
    if (m === this.#synced) return;
    this.#synced = m;
    queueMicrotask(() => this.#host.requestUpdate());
  }

  /** The form was reset: back to showing nothing. */
  reset() {
    this.#changed = this.#shown = false;
    this.#host.requestUpdate();
  }

  /** For the field's own `reportValidity()`: show its message (no browser bubble) and focus it when invalid. */
  report(check: () => boolean): boolean {
    this.#reporting = true;
    try { return check(); } finally { this.#reporting = false; }
  }

  #onEdit = () => { this.#changed = true; };

  #onLeave = (e: FocusEvent) => {
    const to = e.relatedTarget as Node | null;
    if (to && (this.#host.contains(to) || this.#host.shadowRoot?.contains(to))) return;
    this.#host.updateComplete.then(() => {
      if (!this.#changed || this.#shown) return;
      const v = this.#internals.validity;
      if (v.valid || v.valueMissing) return;
      this.#shown = true;
      this.#host.requestUpdate();
    });
  };

  #onInvalid = (e: Event) => {
    if (!userAction && !this.#reporting) return; // a silent check: leave it to the browser
    e.preventDefault(); // our message instead of the browser's bubble
    this.#shown = true;
    this.#host.requestUpdate();
    if (this.#reporting) { this.#focus(); return; }
    if (focused) return;
    focused = true; // invalid fires in document order: this is the first invalid field of the submit
    this.#focus();
  };
}
