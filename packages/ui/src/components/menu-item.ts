import { LitElement, css } from 'lit';
import { define } from '../base.js';
import type { IconName } from '@commmerce/icons';

/** One choice in a `cm-action-menu` or `cm-bottom-sheet`. `{ divider: true }` draws a line between groups. */
export interface MenuItem {
  /** Visible text. */
  label?: string;
  /** Identifies the choice in `cm-select`. Defaults to the label. */
  value?: string;
  /** Icon from @commmerce/icons, before the label. */
  icon?: IconName | string;
  /** Makes the choice a link. */
  href?: string;
  /** Can't be chosen right now. */
  disabled?: boolean;
  /** A destructive choice, e.g. "Delete store". Shown in the critical colour. */
  critical?: boolean;
  /** A separator line instead of a choice. */
  divider?: boolean;
  /**
   * A section heading instead of a choice (12px, not focusable): the choices after it, up to the next heading or
   * divider, form a group named by it. Since 1.6.
   */
  heading?: boolean;
  /** Keyboard shortcut shown at the end of the row in 12px grey ("Ctrl+E"), and set as `aria-keyshortcuts`. Since 1.6. */
  shortcut?: string;
}

/**
 * A choice described in markup, read by `cm-action-menu` and `cm-bottom-sheet`. It renders nothing itself.
 * Its text is the label. An `<hr>` between items draws a separator.
 * @element cm-menu-item
 */
export class CmMenuItem extends LitElement {
  static properties = {
    value: { reflect: true },
    icon: { reflect: true },
    href: { reflect: true },
    disabled: { type: Boolean, reflect: true },
    critical: { type: Boolean, reflect: true },
    heading: { type: Boolean, reflect: true },
    shortcut: { reflect: true },
  };
  /** Identifies the choice in `cm-select`. Defaults to the text. */
  value = '';
  /** Icon from @commmerce/icons, before the label. */
  icon = '';
  /** Makes the choice a link. */
  href = '';
  /** Can't be chosen right now. */
  disabled = false;
  /** A destructive choice, shown in the critical colour. */
  critical = false;
  /** Makes this a section heading (its text, 12px) instead of a choice. Since 1.6. */
  heading = false;
  /** Keyboard shortcut shown at the end of the row ("Ctrl+E"). Since 1.6. */
  shortcut = '';
  static styles = css`:host { display: none; }`;
  render() { return null; }

  /** The item as data. */
  toItem(): MenuItem {
    const label = (this.textContent ?? '').trim();
    return {
      label, value: this.value || label, icon: this.icon || undefined, href: this.href || undefined,
      disabled: this.disabled || undefined, critical: this.critical || undefined,
      heading: this.heading || undefined, shortcut: this.shortcut || undefined,
    };
  }
}
define('cm-menu-item', CmMenuItem);

/** Reads `cm-menu-item` and `hr` children of a host into data. */
export function readMenuItems(host: Element): MenuItem[] {
  const out: MenuItem[] = [];
  for (const c of Array.from(host.children)) {
    // Attributes, not properties: children may not be upgraded yet when the parent first reads them.
    if (c.localName === 'cm-menu-item') {
      const label = (c.textContent ?? '').trim();
      const a = (n: string) => c.getAttribute(n) || undefined;
      out.push({
        label, value: a('value') ?? label, icon: a('icon'), href: a('href'),
        disabled: c.hasAttribute('disabled') || undefined, critical: c.hasAttribute('critical') || undefined,
        heading: c.hasAttribute('heading') || undefined, shortcut: a('shortcut'),
      });
    }
    else if (c.localName === 'hr') out.push({ divider: true });
  }
  return out;
}

/** Calls back when `cm-menu-item` children or their attributes and text change. */
export function watchMenuItems(host: Element, cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(host, { childList: true, subtree: true, attributes: true, characterData: true });
  return mo;
}

declare global { interface HTMLElementTagNameMap { 'cm-menu-item': CmMenuItem } }
