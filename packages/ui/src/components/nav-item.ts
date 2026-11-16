import { LitElement, css } from 'lit';
import { define } from '../base.js';
import type { IconName } from '@commmerce/icons';

/** One navigation destination, used by `cm-side-navigation`, `cm-mobile-menu` and `cm-bottom-navigation`. */
export interface NavItem {
  /** Visible text. */
  label: string;
  /** Icon from @commmerce/icons, shown before the label. */
  icon?: IconName | string;
  /** Where the item goes. Items with children and no `href` are buttons that show and hide the children. */
  href?: string;
  /** Identifies the item in `cm-navigate` handlers. Defaults to the `href`, then the label. */
  value?: string;
  /** Marks the page the merchant is on (`aria-current="page"`). */
  current?: boolean;
  /** Short text after the label, e.g. "New". */
  badge?: string;
  /** Children start open. A parent of the current item opens on its own. */
  expanded?: boolean;
  /** Bottom navigation only: draws the icon as a black square, for the one main action (Quick add). */
  primary?: boolean;
  /** Sub-items. Side navigation shows one level; deeper levels are flattened into it. */
  items?: NavItem[];
}

/**
 * A navigation destination described in markup. It renders nothing itself: the navigation that contains it
 * reads its attributes and children. Nest `cm-nav-item`s to make sub-items.
 * @element cm-nav-item
 * @slot - Child `cm-nav-item`s (sub-items).
 */
export class CmNavItem extends LitElement {
  static properties = {
    label: { reflect: true },
    icon: { reflect: true },
    href: { reflect: true },
    value: { reflect: true },
    current: { type: Boolean, reflect: true },
    badge: { reflect: true },
    expanded: { type: Boolean, reflect: true },
    primary: { type: Boolean, reflect: true },
  };

  /** Visible text. */
  label = '';
  /** Icon from @commmerce/icons. */
  icon = '';
  /** Where the item goes. Leave empty on a parent that only opens its sub-items. */
  href = '';
  /** Identifies the item in `cm-navigate` handlers. */
  value = '';
  /** The page the merchant is on. */
  current = false;
  /** Short text after the label, e.g. "New". */
  badge = '';
  /** Sub-items start open. */
  expanded = false;
  /** Bottom navigation only: the one main action, drawn as a black square (Quick add). */
  primary = false;

  static styles = css`:host { display: none !important; }`;

  render() { return null; }

  /** This item and its sub-items as plain data. */
  toItem(): NavItem { return itemFrom(this); }
}
define('cm-nav-item', CmNavItem);

// Reads attributes, so it works before the children are upgraded.
function itemFrom(el: Element): NavItem {
  const a = (n: string) => el.getAttribute(n);
  const it: NavItem = { label: a('label') || '' };
  if (a('icon')) it.icon = a('icon')!;
  if (a('href')) it.href = a('href')!;
  if (a('value')) it.value = a('value')!;
  if (el.hasAttribute('current')) it.current = true;
  if (a('badge')) it.badge = a('badge')!;
  if (el.hasAttribute('expanded')) it.expanded = true;
  if (el.hasAttribute('primary')) it.primary = true;
  const kids = readNavItems(el);
  if (kids.length) it.items = kids;
  return it;
}

/** Reads the direct `cm-nav-item` children of `host` as data. */
export const readNavItems = (host: Element): NavItem[] =>
  [...host.children].filter((c) => c.localName === 'cm-nav-item').map(itemFrom);

/** The value a `cm-navigate` handler sees for an item. */
export const navValue = (it: NavItem) => it.value || it.href || it.label;

/** True when the item or any descendant is current. */
export const hasCurrent = (it: NavItem): boolean => !!it.current || !!it.items?.some(hasCurrent);

/** Watches `cm-nav-item` children (attributes and structure) and calls `cb` when they change. */
export const watchNavItems = (host: Element, cb: () => void) => {
  const o = new MutationObserver(cb);
  o.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ['label', 'icon', 'href', 'value', 'current', 'badge', 'expanded', 'primary'] });
  return o;
};

/**
 * Fires the cancelable `cm-navigate` event. Returns false when a handler called `preventDefault()`
 * (the app routes itself), so the caller can stop the link.
 */
export const fireNavigate = (host: Element, item: NavItem) =>
  host.dispatchEvent(new CustomEvent('cm-navigate', { bubbles: true, composed: true, cancelable: true, detail: { item, value: navValue(item), href: item.href ?? '' } }));

declare global { interface HTMLElementTagNameMap { 'cm-nav-item': CmNavItem } }
