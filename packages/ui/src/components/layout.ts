import { LitElement, html, css } from 'lit';
import { base, define } from '../base.js';
import { spaceRules, type SpaceStep } from '../spacing.js';

/**
 * The body of an admin page: sections side by side, for example the main column and side column of a detail page.
 * Sections stack into one column, in source order, when the layout is narrower than 768px (a container query, so
 * it follows the space the layout gets, not the window). Put the main section first.
 *
 * `variant="record"` (since 1.7) is the standard record page: a lead, contact, deal, account or ticket, an order or a
 * product. Put in one main `cm-layout-section` and one `cm-layout-section variant="aside"`. From 880px of the layout's
 * own width the aside is a 320px column on the end side (on the left in right-to-left pages) and the main column takes
 * the rest, `space-24` apart. Narrower, they stack: the aside goes above the main content (the key facts first) or
 * below it with `aside-position="below"`, and the gap is `space-16` once the layout is 640px wide or less. The aside
 * is placed by its variant, not by where it is in the source. Cards in a record layout's sections are as far apart as
 * the columns.
 *
 * `variant="sidebar"` (since 1.8.2) puts a 240px `cm-layout-section variant="sidebar"` (views, folders or filters) on the
 * start side of the list it filters, from 768px of the layout's own width; narrower, it stacks above the list. Use it
 * for a ticket inbox or a mailbox instead of `one-third` / `two-thirds`, which give the views a third of the page.
 * @element cm-layout
 * @slot - `cm-layout-section` elements.
 * @cssprop --cm-layout-sticky-top - With `sticky-aside`: how far from the top of the window the aside stops. Default
 * `space-24` below the `cm-app-frame` header (just `space-24` outside an app frame). Since 1.7.
 */
export class CmLayout extends LitElement {
  static properties = {
    gap: { reflect: true },
    variant: { reflect: true },
    asidePosition: { attribute: 'aside-position', reflect: true },
    stickyAside: { type: Boolean, attribute: 'sticky-aside', reflect: true },
  };
  /**
   * Space between sections, across and down: a spacing step on the 4px grid (`0`, `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48`, `64`; the pre-1.5 steps `10`, `15`, `22` and `30` still work and draw as 8, 16, 24 and 32). Default `24` (owner standard, 1.6: 24px between page sections; was 20).
   * In a record layout the default `24` becomes `16` once the layout is 640px wide or less.
   */
  gap: SpaceStep = '24';
  /**
   * `default`: a six-track grid for `full`, `one-half`, `one-third` and `two-thirds` sections.
   * `record` (since 1.7): a main column and a 320px `aside` section on the end side from 880px (a 1280px laptop window with the side navigation gives about 950px); see the element description.
   */
  variant: 'default' | 'record' | 'sidebar' = 'default';
  /** Record layout: where the aside goes once the columns stack (below 880px), `above` the main content (default) or `below` it. Since 1.7. */
  asidePosition: 'above' | 'below' = 'above';
  /**
   * Record layout: the aside stays in view below the header while the main column scrolls, as long as the whole aside
   * fits in the window (a taller aside scrolls with the page, so nothing in it is out of reach). Only while the
   * columns are side by side. Since 1.7.
   */
  stickyAside = false;

  #internals = this.attachInternals();
  #observer?: ResizeObserver;
  #observed: Element[] = [];
  #onResize = () => this.#measure();

  static styles = [
    base,
    css`
      :host { display: block; container: cm-layout / inline-size; --_gap: var(--cm-space-24); }
      .layout { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: var(--_gap); align-items: start; }
      @container cm-layout (max-width: 767px) {
        .layout { grid-template-columns: minmax(0, 1fr); }
      }
      /* Section widths live here, not in cm-layout-section: a container name only reaches queries in its own
         shadow tree in current browsers, and rules on ::slotted from this scope win over the section's :host. */
      ::slotted(*) { grid-column: 1 / -1; min-inline-size: 0; }
      @container cm-layout (min-width: 768px) {
        ::slotted([variant='one-half']) { grid-column: span 3; }
        ::slotted([variant='one-third']), ::slotted([variant='aside']) { grid-column: span 2; }
        ::slotted([variant='two-thirds']) { grid-column: span 4; }
      }

      /* Record layout (1.7). The phone gap is set on .layout, so it also reaches the sections (inherited). */
      :host([variant='record']) .layout { grid-template-columns: minmax(0, 1fr); }
      :host([variant='record']) ::slotted(*) { grid-column: 1 / -1; order: 0; --_cm-section-gap: var(--_gap); }
      :host([variant='record']) ::slotted([variant='aside']) { order: -1; }
      :host([variant='record'][aside-position='below']) ::slotted([variant='aside']) { order: 1; }
      @container cm-layout (max-width: 640px) {
        :host([variant='record'][gap='24']) .layout { --_gap: var(--cm-space-16); }
      }
      @container cm-layout (min-width: 880px) {
        /* Dense placement puts the aside beside the main section whichever comes first in the source. */
        :host([variant='record']) .layout { grid-template-columns: minmax(0, 1fr) 320px; grid-auto-flow: dense; } /* scale-exempt: the record aside is a fixed 320px column */
        :host([variant='record']) ::slotted(*) { grid-column: 1; order: 0; }
        :host([variant='record']) ::slotted([variant='aside']) { grid-column: 2; }
        :host([variant='record'][sticky-aside]:state(aside-fits)) ::slotted([variant='aside']) { position: sticky; }
      }
      /* Sidebar layout (1.8.2): a 240px column of views, folders or filters beside the list it filters (a ticket inbox,
         a mailbox), from 768px of the layout's width; stacked above the list on phones. */
      :host([variant='sidebar']) .layout { grid-template-columns: minmax(0, 1fr); }
      :host([variant='sidebar']) ::slotted(*) { grid-column: 1 / -1; }
      :host([variant='sidebar']) ::slotted([variant='sidebar']) { order: -1; }
      @container cm-layout (min-width: 768px) {
        :host([variant='sidebar']) .layout { grid-template-columns: 240px minmax(0, 1fr); grid-auto-flow: dense; } /* scale-exempt: the sidebar is a fixed 240px column */
        :host([variant='sidebar']) ::slotted(*) { grid-column: 2; }
        :host([variant='sidebar']) ::slotted([variant='sidebar']) { grid-column: 1; }
      }
      :host([variant='record'][sticky-aside]) ::slotted([variant='aside']) {
        /* Read back by #measure(); only takes effect once the aside is sticky. --_header: cm-app-frame's header height. */
        inset-block-start: var(--cm-layout-sticky-top, calc(var(--_header, 0px) + var(--cm-space-24)));
      }
    `,
    spaceRules('gap', '--_gap'),
  ];

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#unwatch();
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) this.#watch();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('stickyAside') || changed.has('variant')) this.#watch();
  }

  #asides() {
    return [...this.children].filter((c) => c.getAttribute('variant') === 'aside');
  }

  #unwatch() {
    this.#observer?.disconnect();
    this.#observer = undefined;
    this.#observed = [];
    window.removeEventListener('resize', this.#onResize);
    this.#setFits(false);
  }

  /** Watches the aside's height (and the window's) while `sticky-aside` is on. */
  #watch() {
    this.#unwatch();
    if (!this.stickyAside || this.variant !== 'record' || !this.isConnected) return;
    this.#observer = new ResizeObserver(() => this.#measure());
    this.#observed = [this, ...this.#asides()];
    this.#observed.forEach((el) => this.#observer!.observe(el));
    window.addEventListener('resize', this.#onResize);
    this.#measure();
  }

  #measure() {
    const asides = this.#asides();
    if (asides.some((a) => !this.#observed.includes(a))) { this.#watch(); return; }
    const fits = asides.length > 0 && asides.every((a) => {
      const top = parseFloat(getComputedStyle(a).insetBlockStart) || 0;
      return a.getBoundingClientRect().height + top <= window.innerHeight;
    });
    this.#setFits(fits);
  }

  #setFits(on: boolean) {
    const states = (this.#internals as ElementInternals & { states?: Set<string> }).states;
    if (!states) return;
    try {
      if (on) states.add('aside-fits'); else states.delete('aside-fits');
    } catch { /* browsers without custom states: the aside scrolls with the page */ }
  }

  /** Whether the aside currently sticks (`sticky-aside` is on and the whole aside fits in the window). For tests and debugging. */
  get asideSticks() {
    const a = this.#asides()[0];
    return !!a && getComputedStyle(a).position === 'sticky';
  }

  render() {
    return html`<div class="layout" part="layout"><slot @slotchange=${() => { if (this.stickyAside) this.#watch(); }}></slot></div>`;
  }
}

/**
 * One column of a `cm-layout`. Its children are stacked `space-24` apart (cards on the page; since 1.6, was `space-20`).
 * In a record layout they are as far apart as the columns (`space-16` once the layout is 640px wide or less).
 * @element cm-layout-section
 * @slot - The section's content, usually cards.
 */
export class CmLayoutSection extends LitElement {
  static properties = { variant: { reflect: true } };
  /**
   * Width on wide layouts: `full` (default), `one-half`, `one-third` or `two-thirds`. A detail page is a
   * `two-thirds` main section and a `one-third` side section. Every section is full width once the layout stacks.
   * `aside` (since 1.7) is the 320px side column of a `cm-layout variant="record"`; in other layouts it is `one-third`.
   * `sidebar` (since 1.8.2) is the 240px start column of a `cm-layout variant="sidebar"`.
   */
  variant: 'full' | 'one-half' | 'one-third' | 'two-thirds' | 'aside' | 'sidebar' = 'full';

  static styles = [
    base,
    css`
      :host { display: flex; flex-direction: column; gap: var(--_cm-section-gap, var(--cm-space-24)); min-inline-size: 0; }
    `,
  ];

  render() {
    return html`<slot></slot>`;
  }
}
define('cm-layout', CmLayout);
define('cm-layout-section', CmLayoutSection);

declare global { interface HTMLElementTagNameMap { 'cm-layout': CmLayout; 'cm-layout-section': CmLayoutSection } }
