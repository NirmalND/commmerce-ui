import { describe, it, expect, beforeEach } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../src/index.js';
import { initials, type CmTooltip, type CmAvatar, type CmThumbnail } from '../src/index.js';

const mount = async <T extends HTMLElement>(markup: string): Promise<T> => {
  document.body.innerHTML = markup;
  const el = document.body.firstElementChild as T;
  await (el as any).updateComplete;
  return el;
};
const shadow = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BROKEN = 'data:image/png;base64,broken';
const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

beforeEach(() => { document.body.innerHTML = ''; });

describe('cm-tooltip', () => {
  it('describes a native trigger through aria-describedby, keeping existing ids', async () => {
    const el = await mount<CmTooltip>('<cm-tooltip content="Export as CSV"><button aria-describedby="x">Export</button></cm-tooltip>');
    await el.updateComplete;
    const btn = el.querySelector('button')!;
    const ids = btn.getAttribute('aria-describedby')!.split(' ');
    expect(ids[0]).toBe('x');
    const desc = document.getElementById(ids[1])!;
    expect(desc.textContent).toBe('Export as CSV');
    expect(desc.hidden).toBe(true);
    expect(shadow(el, '[role=tooltip]').getAttribute('aria-hidden')).toBe('true');
  });
  // Element references need ARIA reflection (Chromium 135+, Safari 17.4+); older browsers get the fallback test below.
  const reflects = 'ariaDescribedByElements' in Element.prototype;
  it.skipIf(!reflects)('describes the control inside a component trigger by element reference', async () => {
    const el = await mount<CmTooltip>('<cm-tooltip content="Duplicate this product"><cm-button>Duplicate</cm-button></cm-tooltip>');
    const cb = el.querySelector('cm-button') as HTMLElement & { updateComplete: Promise<unknown> };
    await cb.updateComplete; await el.updateComplete;
    await new Promise((r) => setTimeout(r));
    const inner = cb.shadowRoot!.querySelector('button') as any;
    expect(inner.ariaDescribedByElements?.[0]?.textContent).toBe('Duplicate this product');
    expect(cb.hasAttribute('aria-describedby')).toBe(false);
  });
  it.skipIf(reflects)('without reflection, describes the component trigger itself', async () => {
    const el = await mount<CmTooltip>('<cm-tooltip content="Duplicate this product"><cm-button>Duplicate</cm-button></cm-tooltip>');
    const cb = el.querySelector('cm-button') as HTMLElement & { updateComplete: Promise<unknown> };
    await cb.updateComplete; await el.updateComplete;
    await new Promise((r) => setTimeout(r));
    expect(document.getElementById(cb.getAttribute('aria-describedby')!)?.textContent).toBe('Duplicate this product');
  });
  it('shows on keyboard focus at once, stays while focused, and closes with Esc', async () => {
    const el = await mount<CmTooltip>('<cm-tooltip content="Last 30 days"><button>Range</button></cm-tooltip>');
    const shown: string[] = [];
    el.addEventListener('cm-show', () => shown.push('show'));
    el.addEventListener('cm-hide', () => shown.push('hide'));
    // Focus the button itself: in Firefox's automated runs the first Tab can land on the page, not the button.
    el.querySelector('button')!.focus();
    expect(el.open).toBe(true);
    await el.updateComplete;
    expect(getComputedStyle(shadow(el, '.tip')).visibility).toBe('visible');
    await userEvent.keyboard('{Escape}');
    expect(el.open).toBe(false);
    expect(shown).toEqual(['show', 'hide']);
    expect(document.activeElement).toBe(el.querySelector('button'));
  });
  it('shows after the hover delay and hides when the pointer leaves', async () => {
    // 400ms delay: Safari's WebDriver can take longer than a short delay just to deliver the hover.
    const el = await mount<CmTooltip>('<cm-tooltip content="Archived orders" delay="400"><button>Archive</button></cm-tooltip><p>elsewhere</p>');
    await userEvent.hover(el.querySelector('button')!);
    expect(el.open).toBe(false);
    await wait(550);
    expect(el.open).toBe(true);
    await userEvent.hover(document.querySelector('p')!);
    await wait(200);
    expect(el.open).toBe(false);
  });
  it('places the bubble inside the viewport, flipping below a trigger at the top', async () => {
    const el = await mount<CmTooltip>('<cm-tooltip content="Top of the page" style="position:fixed;top:2px;left:2px"><button>Top</button></cm-tooltip>');
    el.show(); await el.updateComplete; await wait(20);
    const tip = shadow(el, '.tip').getBoundingClientRect();
    const btn = el.querySelector('button')!.getBoundingClientRect();
    expect(tip.top).toBeGreaterThanOrEqual(btn.bottom);
    expect(tip.left).toBeGreaterThanOrEqual(0);
    expect(shadow(el, '.tip').dataset.side).toBe('bottom');
  });
  it('does not show without content, and removes its description when content clears', async () => {
    const el = await mount<CmTooltip>('<cm-tooltip content="Help"><button>?</button></cm-tooltip>');
    el.content = ''; await el.updateComplete;
    el.show();
    expect(el.open).toBe(false);
    expect(el.querySelector('button')!.hasAttribute('aria-describedby')).toBe(false);
  });
});

describe('cm-avatar', () => {
  it('derives initials', () => {
    expect(initials('Asha Rao')).toBe('AR');
    expect(initials('  priya  ')).toBe('P');
    expect(initials('Ravi Kumar Singh')).toBe('RS');
    expect(initials('preprod.commmerce.com')).toBe('P');
    expect(initials('')).toBe('');
  });
  it('is an image named after the person, showing initials', async () => {
    const el = await mount<CmAvatar>('<cm-avatar name="Asha Rao"></cm-avatar>');
    const box = shadow(el, '.avatar');
    expect(box.getAttribute('role')).toBe('img');
    expect(box.getAttribute('aria-label')).toBe('Asha Rao');
    expect(box.textContent!.trim()).toBe('AR');
  });
  it('shows the photo, and falls back to initials when it fails', async () => {
    const el = await mount<CmAvatar>(`<cm-avatar name="Asha Rao" src="${PIXEL}"></cm-avatar>`);
    expect(shadow(el, 'img')).toBeTruthy();
    el.src = BROKEN; await el.updateComplete;
    for (let i = 0; i < 50 && !el._failed; i++) await wait(10);
    await el.updateComplete;
    expect(shadow(el, 'img')).toBeNull();
    expect(shadow(el, '.avatar').textContent!.trim()).toBe('AR');
  });
  it('is hidden when decorative or nameless, with an icon for a nameless store', async () => {
    const dec = await mount<CmAvatar>('<cm-avatar name="Asha Rao" decorative></cm-avatar>');
    expect(shadow(dec, '.avatar').getAttribute('aria-hidden')).toBe('true');
    expect(shadow(dec, '.avatar').hasAttribute('role')).toBe(false);
    const store = await mount<CmAvatar>('<cm-avatar shape="square"></cm-avatar>');
    expect(shadow(store, 'cm-icon').getAttribute('name')).toBe('store');
    expect(shadow(store, '.avatar').getAttribute('aria-hidden')).toBe('true');
  });
  it('sizes from the size attribute or --cm-avatar-size', async () => {
    const el = await mount<CmAvatar>('<cm-avatar name="A" size="large"></cm-avatar>');
    expect(shadow(el, '.avatar').getBoundingClientRect().width).toBe(48);
    el.style.setProperty('--cm-avatar-size', '20px');
    expect(shadow(el, '.avatar').getBoundingClientRect().width).toBe(20);
  });
});

describe('cm-thumbnail', () => {
  it('shows the whole image with its alt text', async () => {
    const el = await mount<CmThumbnail>(`<cm-thumbnail src="${PIXEL}" alt="Blue mug" loading="lazy"></cm-thumbnail>`);
    const img = shadow(el, 'img') as HTMLImageElement;
    expect(img.alt).toBe('Blue mug');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(getComputedStyle(img).objectFit).toBe('contain');
  });
  it('is decorative with an empty alt', async () => {
    const el = await mount<CmThumbnail>(`<cm-thumbnail src="${PIXEL}"></cm-thumbnail>`);
    expect((shadow(el, 'img') as HTMLImageElement).getAttribute('alt')).toBe('');
  });
  it('shows a placeholder without an image or when the image fails', async () => {
    const none = await mount<CmThumbnail>('<cm-thumbnail alt="Blue mug" size="small"></cm-thumbnail>');
    expect(shadow(none, 'cm-icon')).toBeTruthy();
    expect(shadow(none, '.box').getAttribute('aria-label')).toBe('Blue mug (no image)');
    expect(shadow(none, '.box').getBoundingClientRect().width).toBe(40);
    const broken = await mount<CmThumbnail>(`<cm-thumbnail src="${BROKEN}"></cm-thumbnail>`);
    for (let i = 0; i < 50 && !broken._failed; i++) await wait(10);
    await broken.updateComplete;
    expect(shadow(broken, 'cm-icon')).toBeTruthy();
    expect(shadow(broken, '.box').getAttribute('aria-hidden')).toBe('true');
  });
});

describe('cm-tooltip around a component field', () => {
  const input = (field: Element) => field.shadowRoot!.querySelector('input, textarea') as HTMLInputElement & { ariaDescribedByElements: Element[] | null };
  const described = (field: Element) => (input(field).ariaDescribedByElements ?? []).map((e) => e.textContent!.trim());

  it.skipIf(!('ariaDescribedByElements' in Element.prototype))('keeps the field\'s own help and error text, and follows changes to them', async () => {
    const tip = await mount<CmTooltip>('<cm-tooltip content="Shown on receipts"><cm-text-field label="Store name" help-text="Up to 40 characters"></cm-text-field></cm-tooltip>');
    const field = tip.querySelector('cm-text-field') as HTMLElement & { error: string; updateComplete: Promise<unknown> };
    await field.updateComplete; await tip.updateComplete; await wait(0);
    expect(described(field)).toEqual(['Up to 40 characters', 'Shown on receipts']);
    field.error = 'Enter a store name';
    await field.updateComplete; await wait(0);
    expect(described(field)).toEqual(['Enter a store name', 'Up to 40 characters', 'Shown on receipts']);
    const ids = input(field).getAttribute('aria-describedby');
    tip.remove();
    expect(ids).toBe('');
    expect(input(field).getAttribute('aria-describedby')!.split(' ').length).toBe(2); // the field's own two ids are back
  });

  it('links again after being moved, and closes when removed', async () => {
    const tip = await mount<CmTooltip>('<cm-tooltip content="Export as CSV"><button>Export</button></cm-tooltip>');
    const button = tip.querySelector('button')!;
    expect(button.getAttribute('aria-describedby')).toBeTruthy();
    tip.show();
    expect(tip.open).toBe(true);
    const box = document.createElement('div');
    document.body.append(box);
    tip.remove();
    expect(tip.open).toBe(false);
    expect(button.getAttribute('aria-describedby')).toBeNull();
    box.append(tip);
    await tip.updateComplete;
    const id = button.getAttribute('aria-describedby')!;
    expect(document.getElementById(id)?.textContent).toBe('Export as CSV');
  });
});
