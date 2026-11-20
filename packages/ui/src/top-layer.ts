import { css } from 'lit';

/**
 * Floating lists and menus in the top layer (since 1.10.1, issue #35). A dropdown drawn with `position: absolute`
 * inside a component is covered by later rows that make their own stacking context (a `cm-resource-item`'s actions)
 * and clipped by any ancestor with `overflow: hidden` / `auto` (a card, a board column, a table's scroll area). In
 * the top layer nothing can cover or clip it. `TopLayer` shows the element as a manual popover, puts it beside its
 * anchor (below, or above when there is more room there), keeps it inside the window and follows scrolling and
 * resizing while it is open. Browsers without popovers, or a list styled `position: static` (the header bar's
 * full-screen search), keep the in-place layout.
 */

/** Neutralises the browser's own popover styles (border, padding, colours) so each component's styles apply as before. */
export const topLayerStyles = css`
  :where([popover]) { margin: 0; padding: 0; border: 0; color: inherit; background: none; overflow: visible; }
`;

export interface TopLayerOptions {
  /** `start` / `end`: aligned to the anchor's start or end edge. `stretch`: at least as wide as the anchor. */
  align?: 'start' | 'end' | 'stretch';
  /** Space between anchor and list (default 4). */
  gap?: number;
}

const MARGIN = 8;

export class TopLayer {
  #pop: HTMLElement | null = null;
  #anchor: HTMLElement | null = null;
  #opts: TopLayerOptions = {};
  #maxHeight = '';

  /** Whether the list is currently shown in the top layer. */
  get active() { return !!this.#pop; }

  /**
   * Shows `pop` in the top layer beside `anchor`. Returns false (and leaves the in-place layout) when the browser
   * has no popovers or the list is laid out statically.
   */
  open(pop: HTMLElement | null | undefined, anchor: HTMLElement | null | undefined, opts: TopLayerOptions = {}): boolean {
    if (!pop || !anchor || typeof pop.showPopover !== 'function') return false;
    if (this.#pop && this.#pop !== pop) this.close();
    if (!pop.hasAttribute('popover')) pop.setAttribute('popover', 'manual');
    const wasOpen = pop.matches(':popover-open');
    if (!wasOpen) {
      // A list laid out in place on purpose (position: static) stays where it is.
      if (getComputedStyle(pop).position === 'static') { pop.removeAttribute('popover'); return false; }
      try { pop.showPopover(); } catch { return false; }
    }
    if (!pop.matches(':popover-open')) return false;
    if (!this.#pop) this.#maxHeight = pop.style.maxHeight;
    this.#pop = pop; this.#anchor = anchor; this.#opts = opts;
    Object.assign(pop.style, { position: 'fixed', inset: 'auto', margin: '0' });
    this.place();
    if (!wasOpen) { window.addEventListener('scroll', this.#onMove, true); window.addEventListener('resize', this.#onMove); }
    return true;
  }

  /** Puts the list beside its anchor again (call after its content changes size). */
  place() {
    const pop = this.#pop, anchor = this.#anchor;
    if (!pop || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    const gap = this.#opts.gap ?? 4, align = this.#opts.align ?? 'start';
    pop.style.maxHeight = this.#maxHeight;
    if (align === 'stretch') pop.style.minWidth = `${Math.round(r.width)}px`;
    const pr = pop.getBoundingClientRect(), w = pr.width, natural = pr.height; // fractional: offsetWidth rounds
    const rtl = getComputedStyle(anchor).direction === 'rtl';
    const startEdge = rtl ? r.right - w : r.left, endEdge = rtl ? r.left : r.right - w;
    let left = align === 'end' ? endEdge : startEdge;
    if (left + w > vw - MARGIN) left = rtl ? startEdge : endEdge;
    // Keep 8px from the window's edges, except where the anchor itself is closer: then line up with the anchor.
    const lo = Math.max(0, Math.min(MARGIN, r.left)), hi = Math.min(vw, Math.max(vw - MARGIN, r.right)) - w;
    left = Math.max(lo, Math.min(left, hi));
    const below = vh - r.bottom - gap - MARGIN, above = r.top - gap - MARGIN;
    let top: number;
    if (natural <= below || below >= above) {
      top = r.bottom + gap;
      if (natural > below) pop.style.maxHeight = `${Math.max(80, Math.floor(below))}px`;
    } else {
      const h = Math.min(natural, Math.floor(above));
      if (natural > above) pop.style.maxHeight = `${Math.max(80, h)}px`;
      top = r.top - gap - h;
    }
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }

  /** Hides the list and puts back its in-place styles. */
  close() {
    const pop = this.#pop;
    window.removeEventListener('scroll', this.#onMove, true);
    window.removeEventListener('resize', this.#onMove);
    this.#pop = null; this.#anchor = null;
    if (!pop) return;
    try { if (pop.matches(':popover-open')) pop.hidePopover(); } catch { /* already hidden */ }
    for (const k of ['position', 'inset', 'margin', 'left', 'top', 'minWidth'] as const) pop.style[k] = '';
    pop.style.maxHeight = this.#maxHeight;
  }

  #onMove = () => this.place();
}
