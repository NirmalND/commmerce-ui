import { css } from 'lit';

/**
 * The floating list under a text box, shared by `cm-combobox` and `cm-global-search`: `.pop` sits 10px under its
 * positioned parent (`.wrap`), full width, over the content below; `.message` is its "Loading" / "No results"
 * line and `.vh` hides live-region text visually.
 */
export const popoverStyles = css`
  .pop {
    position: absolute; z-index: 20; inset-block-start: calc(100% + var(--cm-space-10)); inset-inline: 0;
    background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-default);
    border-radius: var(--cm-radius-md); box-shadow: var(--cm-shadow-100); overflow: hidden;
  }
  .pop[hidden] { display: none; }
  .message { display: flex; align-items: center; gap: var(--cm-space-10); margin: 0; padding: var(--cm-space-15) var(--cm-space-20); font-size: 14px; color: var(--cm-text-tertiary); }
  .vh {
    position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden;
    clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
  }
`;

/** Calls `close` when a pointer goes down outside `host` (through shadow roots). Returns the function that stops listening. */
export function closeOnOutsidePointer(host: HTMLElement, isOpen: () => boolean, close: () => void): () => void {
  const listener = (e: Event) => { if (isOpen() && !e.composedPath().includes(host)) close(); };
  document.addEventListener('pointerdown', listener, true);
  return () => document.removeEventListener('pointerdown', listener, true);
}
