import { LitElement, html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import './icon.js';

/**
 * A card for one app in the Commmerce app marketplace: logo tile, name, developer, rating, pricing,
 * an optional offer, and actions (Sign Up, Contact, View Details).
 * @element cm-app-card
 * @slot logo - The app's logo, an `<img>` with `alt` set to the app name. Shown in a 130×54 tile.
 * @slot actions - Buttons, e.g. `<cm-button variant="primary">Sign Up</cm-button>` and `<cm-button>Contact</cm-button>`.
 * @slot status - Top-right corner, e.g. a `cm-toggle` that turns an installed app on and off.
 */
export class CmAppCard extends LitElement {
  static properties = {
    name: {},
    developer: {},
    rating: { type: Number },
    reviews: { type: Number },
    reviewsHref: { attribute: 'reviews-href' },
    pricing: {},
    offer: {},
    href: {},
    headingLevel: { type: Number, attribute: 'heading-level' },
  };

  /** App name, the card's heading. */
  name = '';
  /** Who made the app, shown as "By …". */
  developer = '';
  /** Average rating out of 5. Leave unset for apps without reviews. */
  rating?: number;
  /** Number of reviews. */
  reviews?: number;
  /** Link for the reviews count. */
  reviewsHref = '';
  /** Pricing summary: "Free plan available. 7-day free trial." */
  pricing = '';
  /** Optional offer, shown on a pale blue line with a percent icon. */
  offer = '';
  /** App details page. Shows a "View Details" link. */
  href = '';
  /** Heading level of the app name (2–6), to fit the page outline. */
  headingLevel = 3;

  static styles = [
    base,
    css`
      :host { display: block; container-type: inline-size; }
      article {
        position: relative; display: flex; flex-direction: column; gap: 10px; height: 100%; padding: var(--cm-space-20);
        background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-default); border-radius: var(--cm-radius-md);
        font-size: 12px;
      }
      .logo {
        display: grid; place-items: center; width: 130px; height: 54px; margin-bottom: 10px; padding: 8px; overflow: hidden;
        background: var(--cm-bg-inset); border-radius: var(--cm-radius-xs);
      }
      ::slotted([slot='logo']) { max-width: 100%; max-height: 100%; object-fit: contain; }
      .status { position: absolute; top: var(--cm-space-20); right: var(--cm-space-20); }
      .name { margin: 0; font-size: 16px; font-weight: 500; line-height: 1.3; overflow-wrap: anywhere; }
      .by { margin: -6px 0 0; }
      .rating { display: flex; align-items: center; gap: 5px; margin: 0; }
      .star { color: var(--cm-icon-rating); }
      .star::part(svg) { fill: currentColor; }
      .rating a, .details { color: var(--cm-text-default); text-decoration: underline; text-underline-offset: 2px; }
      .rating a:focus-visible, .details:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; border-radius: 2px; }
      .pricing { margin: 4px 0 0; }
      .offer {
        display: flex; align-items: center; gap: 5px; margin: 0; padding: 4px 6px; font-size: 11px; line-height: 1.3;
        background: var(--cm-bg-offer-card); border-radius: var(--cm-radius-xs);
      }
      .actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--cm-space-20); margin-top: auto; padding-top: 6px; }
      .actions slot { display: contents; }
      .details { font-weight: 500; }
      .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      @container (max-width: 380px) {
        article { padding: var(--cm-space-10); }
        .logo { width: 100px; height: 40px; padding: 6px; }
        .status { top: var(--cm-space-10); right: var(--cm-space-10); }
        .actions { gap: var(--cm-space-10); }
        .details { margin-left: auto; }
      }
    `,
  ];

  render() {
    const lvl = Math.min(6, Math.max(2, Math.round(this.headingLevel) || 3));
    const hasRating = typeof this.rating === 'number' && !Number.isNaN(this.rating);
    const reviews = typeof this.reviews === 'number' ? `${this.reviews.toLocaleString()} ${this.reviews === 1 ? 'Review' : 'Reviews'}` : '';
    return html`<article part="card" aria-labelledby="name">
      <div class="logo" part="logo"><slot name="logo"></slot></div>
      <div class="status"><slot name="status"></slot></div>
      <div class="name" id="name" role="heading" aria-level=${lvl}>${this.name}</div>
      ${this.developer ? html`<p class="by">By ${this.developer}</p>` : nothing}
      ${hasRating ? html`<p class="rating"><cm-icon class="star" name="star" size="12"></cm-icon>
          <span aria-hidden="true">${this.rating!.toFixed(1)}</span><span class="sr">Rated ${this.rating!.toFixed(1)} out of 5</span>
          ${reviews ? (this.reviewsHref ? html`<a href=${this.reviewsHref}>${reviews}</a>` : html`<span>${reviews}</span>`) : nothing}</p>` : nothing}
      ${this.pricing ? html`<p class="pricing">${this.pricing}</p>` : nothing}
      ${this.offer ? html`<p class="offer"><cm-icon name="percent" size="12"></cm-icon><span><span class="sr">Offer: </span>${this.offer}</span></p>` : nothing}
      <div class="actions"><slot name="actions"></slot>${this.href ? html`<a class="details" part="details" href=${this.href}
          aria-label=${`View details of ${this.name}`}>View Details</a>` : nothing}</div>
    </article>`;
  }
}
define('cm-app-card', CmAppCard);

declare global { interface HTMLElementTagNameMap { 'cm-app-card': CmAppCard } }
