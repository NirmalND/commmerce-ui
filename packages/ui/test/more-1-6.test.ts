// Owner standard (1.6, commmerce-ui#33), "Other components": multi-select tags, the compact upload with its uploading
// and per-file error states, menu and option rows, the tooltip, and the states of each. Sizes are read from px the
// components set (heights, paddings, font sizes), never from text widths, so results don't depend on installed fonts.
import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { page, userEvent, server } from 'vitest/browser';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import type { CmCombobox, CmActionMenu, CmTooltip, CmFileUpload, CmSelect } from '../src/index.js';

const frames = (n = 2) => new Promise((r) => { const f = () => (--n ? requestAnimationFrame(f) : r(null)); requestAnimationFrame(f); });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const shadow = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
const all = (el: Element, sel: string) => [...el.shadowRoot!.querySelectorAll(sel)] as HTMLElement[];
const px = (el: Element, prop: string) => parseFloat(getComputedStyle(el).getPropertyValue(prop));
const h = (el: Element) => el.getBoundingClientRect().height;
const touch = () => matchMedia('(pointer: coarse)').matches;
const mount = async <T extends HTMLElement>(markup: string, dir = 'ltr'): Promise<T> => {
  document.body.innerHTML = `<div id="box" dir="${dir}" style="width:480px">${markup}</div>`;
  const root = document.getElementById('box')!;
  const done = () => Promise.all([...root.querySelectorAll('*')].map((c) => (c as any).updateComplete));
  await done(); await frames(); await done();
  return root.firstElementChild as T;
};
/** The element that has focus, looking inside shadow roots. */
const deepActive = () => { let a = document.activeElement; while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement; return a; };
const key = async (k: string) => { await userEvent.keyboard(k); await frames(); };

beforeAll(async () => {
  const end = Date.now() + 10_000;
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-24') && Date.now() < end) await wait(20);
  document.body.style.margin = '0';
  await page.viewport(1280, 800);
});
beforeEach(() => { document.body.innerHTML = ''; });
afterAll(async () => { document.body.style.margin = ''; await page.viewport(414, 896); });

const OPTIONS = ['Groceries', 'Dairy', 'Bakery', 'Snacks', 'Beverages', 'Personal care', 'Household', 'Frozen foods', 'Stationery', 'Pet supplies'];
const multi = async (values: string[], attrs = '', dir = 'ltr') => {
  const el = await mount<CmCombobox>(`<cm-combobox label="What they sell" multiple ${attrs}></cm-combobox><input id="after" aria-label="After">`, dir);
  el.options = OPTIONS; el.values = values;
  await el.updateComplete; await frames();
  return el;
};
const tags = (el: CmCombobox) => all(el, 'cm-tag[data-i]');

describe('cm-combobox multiple: tags', () => {
  it('tags are cm-tags, 24px tall with 12px text, each with a "Remove …" button', async () => {
    const el = await multi(['Dairy', 'Bakery']);
    const [t] = tags(el);
    expect(t.localName).toBe('cm-tag');
    expect(h(shadow(t, '.tag'))).toBe(24);
    expect(px(shadow(t, '.tag'), 'font-size')).toBe(12);
    expect(shadow(t, 'button').getAttribute('aria-label')).toBe('Remove Dairy');
  });
  it('the box is 40px with one row of tags and grows by 28px per wrapped row (32px small, 44px on touch)', async () => {
    const one = await multi(['Dairy']);
    const box = shadow(one, '.box');
    expect(h(box)).toBe(touch() ? 44 : 40);
    // One row of tags sits centred: equal space above and below the 24px tag.
    const b = box.getBoundingClientRect(), t = tags(one)[0].getBoundingClientRect();
    expect(Math.round(t.top - b.top)).toBe(Math.round(b.bottom - t.bottom));
    one.maxTags = 0; one.values = OPTIONS; one.focus(); await one.updateComplete; await frames();
    const rows = new Set(tags(one).map((x) => Math.round(x.getBoundingClientRect().top))).size;
    const input = shadow(one, 'input').getBoundingClientRect();
    const lines = rows + (tags(one).some((x) => Math.round(x.getBoundingClientRect().top) === Math.round(input.top)) ? 0 : 1);
    expect(lines).toBeGreaterThan(1);
    expect(h(box)).toBe((touch() ? 44 : 40) + (lines - 1) * 28);
    const small = await multi(['Dairy'], 'size="small"');
    expect(h(shadow(small, '.box'))).toBe(touch() ? 44 : 32);
  });
  it('shows max-tags (3) tags and "+N more" while not focused; every tag while focused', async () => {
    const el = await multi(OPTIONS.slice(0, 7));
    expect(tags(el).length).toBe(3);
    expect(shadow(el, 'cm-tag.more').textContent).toBe('+4 more');
    expect(h(shadow(el, '.box'))).toBe(touch() ? 44 : 40); // three short tags and "+4 more" fit one row at 480px
    el.focus(); await el.updateComplete; await frames();
    expect(tags(el).length).toBe(7);
    expect(shadow(el, 'cm-tag.more')).toBeNull();
    (document.getElementById('after') as HTMLElement).focus(); await wait(10); await el.updateComplete;
    expect(tags(el).length).toBe(3);
    el.maxTags = 0; await el.updateComplete;
    expect(tags(el).length).toBe(7);
  });
  it('tags are not Tab stops: Tab from the text box leaves the field', async () => {
    const el = await multi(['Dairy', 'Bakery']);
    expect(tags(el).every((t) => t.getAttribute('tabindex') === '-1')).toBe(true);
    el.focus();
    await key('{Tab}');
    expect(document.activeElement?.id).toBe('after');
    await key('{Shift>}{Tab}{/Shift}');
    expect(deepActive()).toBe(shadow(el, 'input'));
  });
  it('keyboard: ← from the start of the box to the last tag, ←/→ between tags, → past the last back to the box', async () => {
    const el = await multi(['Dairy', 'Bakery', 'Snacks']);
    el.focus(); await el.updateComplete;
    await key('{ArrowLeft}');
    expect(deepActive()).toBe(shadow(tags(el)[2], 'button'));
    await key('{ArrowLeft}');
    expect(deepActive()).toBe(shadow(tags(el)[1], 'button'));
    await key('{Home}');
    expect(deepActive()).toBe(shadow(tags(el)[0], 'button'));
    await key('{ArrowLeft}'); // stays on the first
    expect(deepActive()).toBe(shadow(tags(el)[0], 'button'));
    await key('{End}{ArrowRight}');
    expect(deepActive()).toBe(shadow(el, 'input'));
    // With text typed, ← moves the caret, not to the tags.
    await userEvent.keyboard('ba'); await key('{ArrowLeft}');
    expect(deepActive()).toBe(shadow(el, 'input'));
  });
  it('keyboard: Backspace in the empty box removes the last tag; Backspace/Delete on a tag removes it and keeps focus nearby', async () => {
    const el = await multi(['Dairy', 'Bakery', 'Snacks', 'Household']);
    const change = vi.fn(); el.addEventListener('change', change);
    el.focus(); await el.updateComplete;
    await key('{Backspace}');
    expect(el.values).toEqual(['Dairy', 'Bakery', 'Snacks']);
    await key('{ArrowLeft}{ArrowLeft}'); // on Bakery
    await key('{Backspace}'); await el.updateComplete; await frames();
    expect(el.values).toEqual(['Dairy', 'Snacks']);
    expect(deepActive()).toBe(shadow(tags(el)[0], 'button')); // Dairy, the tag before
    await key('{Delete}'); await el.updateComplete; await frames();
    expect(el.values).toEqual(['Snacks']);
    expect(deepActive()).toBe(shadow(tags(el)[0], 'button')); // Snacks moved into its place
    await key('{Delete}'); await el.updateComplete; await frames();
    expect(el.values).toEqual([]);
    expect(deepActive()).toBe(shadow(el, 'input'));
    expect(change).toHaveBeenCalledTimes(4);
  });
  it('Escape on a tag goes back to the text box; clicking a tag\'s remove button removes it', async () => {
    const el = await multi(['Dairy', 'Bakery']);
    el.focus(); await el.updateComplete;
    await key('{ArrowLeft}{Escape}');
    expect(deepActive()).toBe(shadow(el, 'input'));
    shadow(tags(el)[0], 'button').click(); await el.updateComplete;
    expect(el.values).toEqual(['Bakery']);
  });
  it('right-to-left: → (the start side) moves to the tags, which sit on the right', async () => {
    const el = await multi(['Dairy', 'Bakery'], '', 'rtl');
    el.focus(); await el.updateComplete;
    const [a, b] = tags(el).map((t) => t.getBoundingClientRect());
    expect(a.left).toBeGreaterThan(b.left);
    await key('{ArrowRight}');
    expect(deepActive()).toBe(shadow(tags(el)[1], 'button'));
    await key('{ArrowRight}');
    expect(deepActive()).toBe(shadow(tags(el)[0], 'button'));
    await key('{ArrowLeft}{ArrowLeft}');
    expect(deepActive()).toBe(shadow(el, 'input'));
  });
  // Skipped in Firefox 157 until issue #2 is fixed (focus return / hover differ there; passes in Chromium and WebKit).
  it.skipIf(server.browser === 'firefox')('states: hover darkens the outline, focus adds the ring, disabled greys the box and its tags', async () => {
    const el = await multi(['Dairy']);
    const box = shadow(el, '.box');
    const rest = getComputedStyle(box).borderTopColor;
    await userEvent.hover(box);
    expect(getComputedStyle(box).borderTopColor).not.toBe(rest);
    el.focus(); await frames();
    expect(getComputedStyle(box).boxShadow).not.toBe('none');
    const off = await multi(['Dairy'], 'disabled');
    expect(getComputedStyle(shadow(off, '.box')).cursor).toBe('not-allowed');
    expect(tags(off)[0].hasAttribute('disabled')).toBe(true);
  });
});

describe('option and menu rows (one standard)', () => {
  it('select and combobox options: 36px rows, 12px side padding, 14px text; 32px with size="small"; headings 12px', async () => {
    const sel = await mount<CmSelect>('<cm-select label="Status"><option>Open</option><optgroup label="Closed"><option>Done</option></optgroup></cm-select>');
    sel.open = true; await sel.updateComplete;
    const opt = shadow(sel, '[role=option]');
    expect(h(opt)).toBe(touch() ? 44 : 36);
    expect(px(opt, 'padding-inline-start')).toBe(12);
    expect(px(opt, 'font-size')).toBe(14);
    const gh = shadow(sel, '.gh');
    expect(px(gh, 'font-size')).toBe(12);
    expect(px(gh, 'padding-inline-start')).toBe(12);
    const small = await mount<CmCombobox>('<cm-combobox label="Tag" size="small"><option>Cotton</option></cm-combobox>');
    small.open = true; await small.updateComplete;
    expect(h(shadow(small, '[role=option]'))).toBe(touch() ? 44 : 32);
    expect(px(shadow(small, '[role=option]'), 'padding-inline-start')).toBe(12);
  });
  const menu = `<cm-action-menu label="Order actions">
    <cm-menu-item heading>Order</cm-menu-item>
    <cm-menu-item icon="edit" shortcut="E">Edit order</cm-menu-item>
    <cm-menu-item disabled>Refund</cm-menu-item>
    <hr>
    <cm-menu-item icon="trash" critical shortcut="Del">Delete order</cm-menu-item>
  </cm-action-menu>`;
  it('menu items: 36px rows (32 compact), 12px side padding, 14px text, 16px icons, 12px shortcut hint', async () => {
    const el = await mount<CmActionMenu>(menu);
    el.show(); await el.updateComplete;
    const item = all(el, '.item')[0];
    expect(h(item)).toBe(touch() ? 44 : 36);
    expect(px(item, 'padding-inline-start')).toBe(12);
    expect(px(item, 'padding-inline-end')).toBe(12);
    expect(px(item, 'font-size')).toBe(14);
    expect(h(item.querySelector('cm-icon')!)).toBe(16);
    const sc = item.querySelector('.shortcut') as HTMLElement;
    expect(px(sc, 'font-size')).toBe(12);
    expect(sc.getAttribute('aria-hidden')).toBe('true');
    expect(item.getAttribute('aria-keyshortcuts')).toBe('E');
    el.density = 'compact'; await el.updateComplete;
    expect(h(item)).toBe(touch() ? 44 : 32);
  });
  it('a heading names a group of the items after it, is 12px and is skipped by the arrow keys', async () => {
    const el = await mount<CmActionMenu>(menu);
    el.show(); await el.updateComplete;
    const group = shadow(el, '[role=menu] > [role=group]');
    const heading = shadow(el, '.section');
    expect(group.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(heading.textContent).toBe('Order');
    expect(px(heading, 'font-size')).toBe(12);
    expect(group.querySelectorAll('[role=menuitem]').length).toBe(2); // up to the divider
    expect(all(el, '[role=menuitem]').map((m) => m.textContent!.trim())).toEqual(['Edit orderE', 'Refund', 'Delete orderDel']);
    await frames();
    expect(deepActive()?.textContent).toContain('Edit order');
    await key('{ArrowDown}'); // Refund is disabled
    expect(deepActive()?.textContent).toContain('Delete order');
    await key('{ArrowDown}');
    expect(deepActive()?.textContent).toContain('Edit order');
  });
  it('states: highlighted black, destructive highlighted red on red, disabled grey with not-allowed, pressed darker', async () => {
    const el = await mount<CmActionMenu>(menu);
    el.show(); await el.updateComplete; await frames();
    const [edit, refund, del] = all(el, '.item');
    const surface = getComputedStyle(refund).backgroundColor;
    expect(getComputedStyle(edit).backgroundColor).not.toBe(surface);
    expect(getComputedStyle(refund).cursor).toBe('not-allowed');
    expect(refund.getAttribute('aria-disabled')).toBe('true');
    const rest = getComputedStyle(del).color;
    await userEvent.hover(del);
    const cs = getComputedStyle(del);
    expect(cs.color).toBe(rest); // stays critical red
    const probe = document.createElement('div'); probe.style.background = 'var(--cm-bg-critical)'; document.body.append(probe);
    expect(cs.backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
  });
  it('loading shows a spinner row instead of the choices (aria-busy); disabled keeps the menu shut', async () => {
    const el = await mount<CmActionMenu>(menu.replace('<cm-action-menu', '<cm-action-menu loading'));
    el.show(); await el.updateComplete;
    expect(shadow(el, '[role=menu]').getAttribute('aria-busy')).toBe('true');
    expect(shadow(el, '.loading cm-spinner')).toBeTruthy();
    expect(all(el, '[role=menuitem]').length).toBe(0);
    el.loading = false; await el.updateComplete; await el.updateComplete; await frames();
    expect(all(el, '[role=menuitem]').length).toBe(3);
    expect(deepActive()?.textContent).toContain('Edit order');
    const off = await mount<CmActionMenu>(menu.replace('<cm-action-menu', '<cm-action-menu disabled'));
    const trig = shadow(off, '.trigger') as HTMLButtonElement;
    expect(trig.disabled).toBe(true);
    trig.click(); await off.updateComplete;
    expect(off.open).toBe(false);
  });
  it('bottom sheet leaves headings out of its rows', async () => {
    const el = await mount<any>('<cm-bottom-sheet heading="More"><cm-menu-item heading>Order</cm-menu-item><cm-menu-item>Edit</cm-menu-item></cm-bottom-sheet>');
    el.open = true; await el.updateComplete;
    expect(all(el, '.row').map((r) => r.textContent!.trim())).toEqual(['Edit']);
  });
  it('right-to-left: the shortcut hint sits at the left end of the row', async () => {
    const el = await mount<CmActionMenu>(menu, 'rtl');
    el.show(); await el.updateComplete;
    const item = all(el, '.item')[0];
    const label = item.querySelector('.label')!.getBoundingClientRect(), sc = item.querySelector('.shortcut')!.getBoundingClientRect();
    expect(sc.right).toBeLessThanOrEqual(label.left + 1);
  });
});

describe('cm-select loading', () => {
  it('shows a spinner for the chevron, is aria-busy and does not open', async () => {
    const el = await mount<CmSelect>('<cm-select label="Customer" loading></cm-select>');
    const box = shadow(el, '.box');
    expect(box.getAttribute('aria-busy')).toBe('true');
    expect(shadow(el, 'cm-spinner')).toBeTruthy();
    box.click(); await el.updateComplete;
    expect(el.open).toBe(false);
    el.loading = false; await el.updateComplete;
    expect(shadow(el, '.chev')).toBeTruthy();
  });
});

describe('cm-tooltip (1.6)', () => {
  it('12px text on the dark surface, 8 x 12px padding, 6px corners, at most 240px wide, 400ms delay', async () => {
    const el = await mount<CmTooltip>('<cm-tooltip content="Orders paid more than 30 days ago are archived automatically, with their invoices and notes."><button>Archive</button></cm-tooltip>');
    expect(el.delay).toBe(400);
    el.show(); await el.updateComplete; await frames();
    const tip = shadow(el, '.tip');
    expect(px(tip, 'font-size')).toBe(12);
    expect(px(tip, 'padding-top')).toBe(8);
    expect(px(tip, 'padding-inline-start')).toBe(12);
    expect(px(tip, 'border-top-left-radius')).toBe(6);
    expect(tip.getBoundingClientRect().width).toBe(240);
    const probe = document.createElement('div'); probe.style.background = 'var(--cm-bg-panel-header)'; document.body.append(probe);
    expect(getComputedStyle(tip).backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
  });
  it('hover shows it after the delay and leaving hides it at once; keyboard focus shows it, Escape hides it', async () => {
    const el = await mount<CmTooltip>('<cm-tooltip content="Archive the order" delay="200"><button>Archive</button></cm-tooltip><p id="away" style="margin-top:200px">away</p>');
    await userEvent.hover(el.querySelector('button')!);
    await wait(80);
    expect(el.open).toBe(false);
    await wait(250);
    expect(el.open).toBe(true);
    await userEvent.hover(document.getElementById('away')!);
    expect(el.open).toBe(false);
    el.querySelector('button')!.focus(); await el.updateComplete;
    expect(el.open).toBe(true);
    await key('{Escape}');
    expect(el.open).toBe(false);
  });
  it('the pointer can move from the control onto the bubble without it closing (WCAG 1.4.13)', async () => {
    const el = await mount<CmTooltip>('<div style="padding:80px"><cm-tooltip content="Archive the order" delay="0"><button>Archive</button></cm-tooltip></div>');
    const tt = el.querySelector('cm-tooltip') as CmTooltip;
    await userEvent.hover(tt.querySelector('button')!); await wait(50);
    expect(tt.open).toBe(true);
    await userEvent.hover(shadow(tt, '.tip')); await wait(20);
    expect(tt.open).toBe(true);
  });
});

describe('cm-file-upload (1.6): compact empty state, hover and drag, uploading, per-file errors', () => {
  const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });
  it('empty: one 72px row with a 40px icon tile, the prompt with Browse, and the hint at 12px inside it', async () => {
    const el = await mount<CmFileUpload>('<cm-file-upload label="Attachments" hint="PNG or PDF, up to 5 MB"></cm-file-upload>');
    const zone = shadow(el, '.zone');
    expect(h(zone)).toBe(72);
    expect(h(shadow(el, '.ico'))).toBe(40);
    expect(shadow(el, '.browse').textContent).toBe('Browse');
    const hint = zone.querySelector('.hint') as HTMLElement;
    expect(hint.textContent).toBe('PNG or PDF, up to 5 MB');
    expect(px(hint, 'font-size')).toBe(12);
    expect(shadow(el, 'input').getAttribute('aria-describedby')).toBe(hint.id);
    // Side by side: the icon tile and the words share a row.
    const a = shadow(el, '.ico').getBoundingClientRect(), b = shadow(el, '.words').getBoundingClientRect();
    expect(b.left).toBeGreaterThanOrEqual(a.right);
  });
  it('states: hover and drag-over change the border and background; drag-over says "Drop files to upload"; disabled', async () => {
    const el = await mount<CmFileUpload>('<cm-file-upload hint="CSV"></cm-file-upload>');
    const zone = shadow(el, '.zone');
    const rest = getComputedStyle(zone);
    const [b0, bg0] = [rest.borderTopColor, rest.backgroundColor];
    await userEvent.hover(zone);
    expect(getComputedStyle(zone).borderTopColor).not.toBe(b0);
    expect(getComputedStyle(zone).backgroundColor).not.toBe(bg0);
    zone.dispatchEvent(new DragEvent('dragenter', { bubbles: true })); await el.updateComplete;
    expect(el.hasAttribute('data-over')).toBe(true);
    expect(getComputedStyle(zone).borderTopStyle).toBe('solid');
    expect(shadow(el, `#${shadow(el, 'input').getAttribute('aria-labelledby')}`).textContent).toBe('Drop files to upload');
    zone.dispatchEvent(new DragEvent('dragleave', { bubbles: true })); await el.updateComplete;
    expect(el.hasAttribute('data-over')).toBe(false);
    el.disabled = true; await el.updateComplete;
    expect(getComputedStyle(zone).cursor).toBe('not-allowed');
    expect((shadow(el, 'input') as HTMLInputElement).disabled).toBe(true);
  });
  it('uploading: setProgress shows a named progress bar and a Cancel button; Cancel fires cm-cancel and removes the file', async () => {
    const el = await mount<CmFileUpload>('<cm-file-upload multiple></cm-file-upload>');
    const a = file('a.pdf', 'application/pdf'), b = file('b.pdf', 'application/pdf');
    el.addFiles([a, b]); el.setProgress(a, 40); await el.updateComplete;
    const bar = shadow(el, '[role=progressbar]');
    expect(bar.getAttribute('aria-label')).toBe('Uploading a.pdf');
    expect(bar.getAttribute('aria-valuenow')).toBe('40');
    expect(h(bar)).toBe(4);
    const [cancel, remove] = all(el, '.remove');
    expect(cancel.getAttribute('aria-label')).toBe('Cancel uploading a.pdf');
    expect(remove.getAttribute('aria-label')).toBe('Remove b.pdf');
    el.setProgress(a, 75); await el.updateComplete;
    expect(shadow(el, '[role=progressbar]').getAttribute('aria-valuenow')).toBe('75');
    const keep = (e: Event) => e.preventDefault();
    el.addEventListener('cm-cancel', keep, { once: true });
    cancel.click(); await el.updateComplete;
    expect(el.files).toEqual([a, b]); // kept, upload stopped
    expect(shadow(el, '[role=progressbar]')).toBeNull();
    el.setProgress(a, 10); await el.updateComplete;
    const fired = vi.fn(); el.addEventListener('cm-cancel', fired);
    all(el, '.remove')[0].click(); await el.updateComplete;
    expect(fired.mock.calls[0][0].detail.file).toBe(a);
    expect(el.files).toEqual([b]);
    el.setProgress(b, 100); el.setProgress(b, null); await el.updateComplete;
    expect(shadow(el, '[role=progressbar]')).toBeNull();
  });
  it('per-file error: the tile turns red with the message under it (role alert, describes Remove)', async () => {
    const el = await mount<CmFileUpload>('<cm-file-upload multiple></cm-file-upload>');
    const a = file('a.pdf', 'application/pdf');
    el.addFiles([a]); el.setFileError(a, 'Upload failed. Try again.'); await el.updateComplete;
    const msg = shadow(el, '.ferr');
    expect(msg.getAttribute('role')).toBe('alert');
    expect(px(msg, 'font-size')).toBe(12);
    expect(shadow(el, '.file').classList.contains('invalid')).toBe(true);
    expect(shadow(el, '.remove').getAttribute('aria-describedby')).toBe(msg.id);
    el.setFileError(a, ''); await el.updateComplete;
    expect(shadow(el, '.ferr')).toBeNull();
    el.setFileError(a, 'Again'); el.removeFile(a); await el.updateComplete;
    el.addFiles([a]); await el.updateComplete;
    expect(shadow(el, '.ferr')).toBeNull(); // removing forgets the error
  });
  it('photo: the empty tile is at most 120px tall (4:3 at 160px wide); uploading shows a bar and a Cancel button', async () => {
    const el = await mount<CmFileUpload>('<cm-file-upload variant="photo" label="Shop front" style="width:300px"></cm-file-upload>');
    const z = shadow(el, '.zone').getBoundingClientRect();
    expect(z.height).toBe(120);
    expect(z.width).toBe(160);
    const narrow = await mount<CmFileUpload>('<cm-file-upload variant="photo" label="Shelf" style="width:120px"></cm-file-upload>');
    expect(h(shadow(narrow, '.zone'))).toBe(90);
    const f = file('p.jpg', 'image/jpeg');
    el.addFiles([f]); el.setProgress(f, 20); await el.updateComplete;
    expect(shadow(el, '.shot [role=progressbar]')).toBeTruthy();
    const btns = all(el, '.actions button');
    expect(btns.map((b) => b.getAttribute('aria-label'))).toEqual(['Cancel uploading Shop front']);
    btns[0].click(); await el.updateComplete;
    expect(el.files).toEqual([]);
  });
  it('right-to-left: the icon tile is on the right of the words', async () => {
    const el = await mount<CmFileUpload>('<cm-file-upload hint="CSV"></cm-file-upload>', 'rtl');
    const a = shadow(el, '.ico').getBoundingClientRect(), b = shadow(el, '.words').getBoundingClientRect();
    expect(a.left).toBeGreaterThanOrEqual(b.right);
  });
});
