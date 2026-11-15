import { css } from 'lit';

/** Shared host reset. Tokens are CSS custom properties, so they cross the shadow boundary. */
export const base = css`
  :host {
    font-family: var(--cm-font-sans, 'Poppins', system-ui, sans-serif);
    color: var(--cm-text-default, #000);
    box-sizing: border-box;
  }
  :host([hidden]) { display: none !important; }
  *, *::before, *::after { box-sizing: inherit; }
`;

export const focusRing = css`
  outline: 2px solid var(--cm-border-strong);
  outline-offset: 2px;
`;

let uid = 0;
export const nextId = (p: string) => `${p}-${++uid}`;

/** Registers a custom element once, so two copies of the library on one page don't throw. */
export function define(tag: string, ctor: CustomElementConstructor) {
  if (!customElements.get(tag)) customElements.define(tag, ctor);
}

export type Tone = 'attention' | 'information' | 'success' | 'critical';
