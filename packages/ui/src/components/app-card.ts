import { html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import './icon.js';

const strings = defineStrings('appCard', {
  /** The developer line. */
  developer: 'By {developer}',
  /** The rating for screen readers. `{rating}` has one decimal. */
  rating: 'Rated {rating} out of 5',
  /** The reviews count, in plural forms. */
  reviews: { one: '{count} Review', other: '{count} Reviews' },
  /** Read before the offer. */
  offer: 'Offer: ',
  /** The details link, and its accessible name. */
  details: 'View Details',
  detailsLabel: 'View details of {name}',
});
declare module '../localize.js' { interface CmStrings { appCard: typeof strings } }

/**
 * A card for one app in the Commmerce app marketplace: logo tile, name, developer, rating, pricing,
 * an optional offer, and actions (Sign Up, Contact, View Details).
 * @element cm-app-card
 * @slot logo - The app's logo, an `<img>` with `alt` set to the app name. Shown in a 130×54 tile.
 * @slot actions - Buttons, e.g. `<cm-button variant="primary">Sign Up</cm-button>` and `<cm-button>Contact</cm-button>`.
 * @slot status - Top-right corner, e.g. a `cm-toggle` that turns an installed app on and off.
 */
export class CmAppCard extends CmLocalizedElement {
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
        position: relative; display: flex; flex-direction: column; gap: var(--cm-space-8); height: 100%; padding: var(--cm-space-20);
        background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-subtle); border-radius: var(--cm-radius-md);
        font-size: var(--cm-font-size-13); line-height: var(--cm-line-height-13);
      }
      .logo {
        display: grid; place-items: center; width: 128px; height: 56px; margin-bottom: var(--cm-space-8); padding: var(--cm-space-8); overflow: hidden;
        background: var(--cm-bg-inset); border-radius: var(--cm-radius-xs);
      }
      ::slotted([slot='logo']) { max-width: 100%; max-height: 100%; object-fit: contain; }
      .status { position: absolute; top: var(--cm-space-20); inset-inline-end: var(--cm-space-20); }
      .name { margin: 0; font-size: var(--cm-type-heading-sm-size); line-height: var(--cm-type-heading-sm-line-height); font-weight: 600; overflow-wrap: anywhere; }
      .by { margin: -4px 0 0; color: var(--cm-text-tertiary); }
      .rating { display: flex; align-items: center; gap: var(--cm-space-4); margin: 0; }
      .star { color: var(--cm-icon-rating); }
      .star::part(svg) { fill: currentColor; }
      .rating a, .details { color: var(--cm-text-default); text-decoration: underline; text-underline-offset: 2px; }
      .rating a:focus-visible, .details:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; border-radius: var(--cm-radius-xs); }
      .pricing { margin: 4px 0 0; }
      .offer {
        display: flex; align-items: center; gap: var(--cm-space-4); margin: 0; padding: var(--cm-space-4) var(--cm-space-8); font-size: var(--cm-font-size-12); line-height: var(--cm-line-height-12);
        background: var(--cm-bg-offer-card); border-radius: var(--cm-radius-xs);
      }
      .actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--cm-space-16); margin-top: auto; padding-top: var(--cm-space-8); }
      .actions slot { display: contents; }
      .details { font-weight: 500; }
      .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      @container (max-width: 380px) {
        article { padding: var(--cm-space-8); }
        .logo { width: 100px; height: 40px; padding: var(--cm-space-4); }

        .status { top: var(--cm-space-8); inset-inline-end: var(--cm-space-8); }
        .actions { gap: var(--cm-space-8); }
        .details { margin-inline-start: auto; }
      }
    `,
  ];

  render() {
    const lvl = Math.min(6, Math.max(2, Math.round(this.headingLevel) || 3));
    const hasRating = typeof this.rating === 'number' && !Number.isNaN(this.rating);
    const reviews = typeof this.reviews === 'number' ? this.t('reviews', { count: this.reviews }) : '';
    const rating = hasRating ? this.formatNumber(this.rating!, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '';
    return html`<article part="card" aria-labelledby="name">
      <div class="logo" part="logo"><slot name="logo"></slot></div>
      <div class="status"><slot name="status"></slot></div>
      <div class="name" id="name" role="heading" aria-level=${lvl}>${this.name}</div>
      ${this.developer ? html`<p class="by">${this.t('developer', { developer: this.developer })}</p>` : nothing}
      ${hasRating ? html`<p class="rating"><cm-icon class="star" name="star" size="12"></cm-icon>
          <span aria-hidden="true">${rating}</span><span class="sr">${this.t('rating', { rating })}</span>
          ${reviews ? (this.reviewsHref ? html`<a href=${this.reviewsHref}>${reviews}</a>` : html`<span>${reviews}</span>`) : nothing}</p>` : nothing}
      ${this.pricing ? html`<p class="pricing">${this.pricing}</p>` : nothing}
      ${this.offer ? html`<p class="offer"><cm-icon name="percent" size="12"></cm-icon><span><span class="sr">${this.t('offer')}</span>${this.offer}</span></p>` : nothing}
      <div class="actions"><slot name="actions"></slot>${this.href ? html`<a class="details" part="details" href=${this.href}
          aria-label=${this.t('detailsLabel', { name: this.name })}>${this.t('details')}</a>` : nothing}</div>
    </article>`;
  }
}
define('cm-app-card', CmAppCard);

declare global { interface HTMLElementTagNameMap { 'cm-app-card': CmAppCard } }
