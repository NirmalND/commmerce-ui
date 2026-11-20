// 1.3 additions for the CRM rebuild: option groups in select and combobox (#27), moving rows between nested
// lists (#21), and card actions without a heading.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { userEvent } from 'vitest/browser';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import { setStrings, resetStrings } from '../src/index.js';
import type { CmSelect, CmCombobox, CmNestedList, CmNestedItem, CmCard } from '../src/index.js';

const mount = async <T extends HTMLElement>(markup: string, dir = 'ltr'): Promise<T> => {
  document.body.innerHTML = `<div id="box" dir="${dir}" style="width:480px;padding:16px">${markup}</div>`;
  const el = document.getElementById('box')!.firstElementChild as T;
  await (el as any).updateComplete;
  await Promise.all([...el.querySelectorAll('*')].map((c) => (c as any).updateComplete));
  return el;
};
const shadow = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
const all = (el: Element, sel: string) => [...el.shadowRoot!.querySelectorAll(sel)] as HTMLElement[];
const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const activeText = (el: Element, input: HTMLElement) => {
  const id = input.getAttribute('aria-activedescendant');
  return id ? el.shadowRoot!.getElementById(id)!.textContent!.trim() : null;
};

beforeEach(() => { document.body.innerHTML = ''; });
afterEach(() => resetStrings());

const fieldsMarkup = `
  <option value="owner">Record owner</option>
  <optgroup label="Lead"><option value="lead.company">Company</option><option value="lead.email">Email</option></optgroup>
  <optgroup label="Contact"><option value="contact.email">Email</option><option value="contact.phone" disabled>Phone</option><option value="contact.city">City</option></optgroup>
  <optgroup label="Deal" disabled><option value="deal.amount">Amount</option></optgroup>`;

describe('cm-select option groups', () => {
  it('renders <optgroup> children as labelled groups inside the listbox; headings are not options', async () => {
    const el = await mount<CmSelect>(`<cm-select label="CRM field">${fieldsMarkup}</cm-select>`);
    const listbox = shadow(el, '[role="listbox"]');
    const groups = all(el, '[role="listbox"] [role="group"]');
    expect(groups.map((g) => el.shadowRoot!.getElementById(g.getAttribute('aria-labelledby')!)!.textContent)).toEqual(['Lead', 'Contact', 'Deal']);
    expect(groups[0].querySelectorAll('[role="option"]').length).toBe(2);
    expect(all(el, '[role="option"]').map((o) => o.textContent!.trim())).toEqual(['Record owner', 'Company', 'Email', 'Email', 'Phone', 'City', 'Amount']);
    // The ungrouped option comes first, directly in the listbox; headings are presentation, not options.
    expect(listbox.firstElementChild!.getAttribute('role')).toBe('option');
    for (const h of all(el, '.gh')) expect(h.getAttribute('role')).toBe('presentation');
    // A disabled optgroup disables its options.
    expect(all(el, '[role="option"]')[6].getAttribute('aria-disabled')).toBe('true');
    expect(el.items.map((o) => o.group)).toEqual([undefined, 'Lead', 'Lead', 'Contact', 'Contact', 'Contact', 'Deal']);
  });

  it('arrow keys skip headings and disabled options; Enter chooses; the box shows the label', async () => {
    const el = await mount<CmSelect>(`<cm-select label="CRM field">${fieldsMarkup}</cm-select>`);
    const box = shadow(el, '.box');
    box.focus();
    await userEvent.keyboard('{ArrowDown}');
    await el.updateComplete;
    expect(activeText(el, box)).toBe('Record owner');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
    await el.updateComplete;
    expect(activeText(el, box)).toBe('City'); // skipped the Contact heading and the disabled Phone
    await userEvent.keyboard('{ArrowDown}');
    await el.updateComplete;
    expect(activeText(el, box)).toBe('City'); // Deal's only option is disabled
    await userEvent.keyboard('{Enter}');
    await el.updateComplete;
    expect(el.value).toBe('contact.city');
    expect(shadow(el, '.text').textContent).toBe('City');
  });

  it('a group field in the options data; show-group puts the group in the box', async () => {
    const el = await mount<CmSelect>('<cm-select label="CRM field" show-group></cm-select>');
    el.options = [
      { value: 'lead.email', label: 'Email', group: 'Lead' },
      { value: 'contact.email', label: 'Email', group: 'Contact' },
      { value: 'lead.company', label: 'Company', group: 'Lead' },
    ];
    el.value = 'contact.email';
    await el.updateComplete;
    // Options of a group are shown together, in the order the groups first appear.
    expect(el.items.map((o) => o.value)).toEqual(['lead.email', 'lead.company', 'contact.email']);
    expect(all(el, '.gh').map((h) => h.textContent)).toEqual(['Lead', 'Contact']);
    expect(shadow(el, '.text').textContent).toBe('Contact: Email');
    setStrings({ select: { grouped: '{label} ({group})' } });
    await el.updateComplete;
    expect(shadow(el, '.text').textContent).toBe('Email (Contact)');
    el.showGroup = false;
    await el.updateComplete;
    expect(shadow(el, '.text').textContent).toBe('Email');
  });

  it('without groups the list renders as before: options straight in the listbox', async () => {
    const el = await mount<CmSelect>('<cm-select label="Status"><option value="a">Active</option><option value="b">Draft</option></cm-select>');
    expect(all(el, '[role="group"], .gh').length).toBe(0);
    expect([...shadow(el, '[role="listbox"]').children].map((c) => c.getAttribute('role'))).toEqual(['option', 'option']);
  });
});

describe('cm-combobox option groups', () => {
  it('groups <optgroup> children; filtering keeps only headings of groups with matches', async () => {
    const el = await mount<CmCombobox>(`<cm-combobox label="CRM field">${fieldsMarkup}</cm-combobox>`);
    const input = shadow(el, 'input');
    input.focus();
    await userEvent.keyboard('{ArrowDown}');
    await el.updateComplete;
    expect(all(el, '.gh').map((h) => h.textContent)).toEqual(['Lead', 'Contact', 'Deal']);
    await userEvent.type(input, 'em');
    await el.updateComplete;
    expect(all(el, '.gh').map((h) => h.textContent)).toEqual(['Lead', 'Contact']);
    const groups = all(el, '[role="listbox"] [role="group"]');
    expect(groups.map((g) => g.querySelector('[role="option"]')!.textContent!.trim())).toEqual(['Email', 'Email']);
    expect(shadow(el, '[role="status"]').textContent).toBe('2 results');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await el.updateComplete;
    expect(el.shadowRoot!.getElementById(input.getAttribute('aria-activedescendant')!)!.closest('[role="group"]')).toBe(groups[1]);
    await userEvent.keyboard('{Enter}');
    await el.updateComplete;
    expect(el.value).toBe('contact.email');
    expect((input as HTMLInputElement).value).toBe('Email');
  });

  it('arrow keys skip headings and disabled options and wrap', async () => {
    const el = await mount<CmCombobox>(`<cm-combobox label="CRM field">${fieldsMarkup}</cm-combobox>`);
    const input = shadow(el, 'input');
    input.focus();
    await userEvent.keyboard('{ArrowUp}');
    await el.updateComplete;
    expect(activeText(el, input)).toBe('City');
    await userEvent.keyboard('{ArrowDown}');
    await el.updateComplete;
    expect(activeText(el, input)).toBe('Record owner');
  });

  it('show-group in the box and in tags; group data on the options property', async () => {
    const el = await mount<CmCombobox>('<cm-combobox label="Fields" show-group multiple></cm-combobox>');
    el.options = [
      { value: 'lead.email', label: 'Email', group: 'Lead' },
      { value: 'contact.email', label: 'Email', group: 'Contact' },
    ];
    el.values = ['contact.email'];
    await el.updateComplete;
    const tag = shadow(el, 'cm-tag');
    expect(tag.textContent).toBe('Contact: Email');
    expect(tag.getAttribute('remove-label')).toBe('Remove Contact: Email');

    const one = await mount<CmCombobox>('<cm-combobox label="Field" show-group></cm-combobox>');
    one.options = [{ value: 'lead.company', label: 'Company', group: 'Lead' }];
    one.value = 'lead.company';
    await one.updateComplete;
    expect((shadow(one, 'input') as HTMLInputElement).value).toBe('Lead: Company');
  });

  it('the "Add" row of allow-custom sits outside the groups', async () => {
    const el = await mount<CmCombobox>(`<cm-combobox label="CRM field" allow-custom>${fieldsMarkup}</cm-combobox>`);
    const input = shadow(el, 'input');
    await userEvent.type(input, 'Comp');
    await el.updateComplete;
    const listbox = shadow(el, '[role="listbox"]');
    expect(listbox.lastElementChild!.getAttribute('role')).toBe('option');
    expect(listbox.lastElementChild!.textContent).toContain('Add');
    expect(all(el, '.gh').map((h) => h.textContent)).toEqual(['Lead']);
  });

  it('right to left: headings start at the right like the options', async () => {
    const el = await mount<CmCombobox>(`<cm-combobox label="CRM field" style="width:300px">${fieldsMarkup}</cm-combobox>`, 'rtl');
    shadow(el, 'input').focus();
    await userEvent.keyboard('{ArrowDown}');
    await el.updateComplete;
    const list = shadow(el, '[role="listbox"]').getBoundingClientRect();
    const h = shadow(el, '.gh');
    const range = document.createRange();
    range.selectNodeContents(h);
    const text = range.getBoundingClientRect();
    expect(list.right - text.right).toBeLessThan(list.width / 4);
    expect(text.left - list.left).toBeGreaterThan(list.width / 2);
  });
});

describe('cm-nested-list: moving rows between lists', () => {
  const layout = `<div>
    <cm-nested-list heading="Lead details" group="layout" sortable>
      <cm-nested-item label="Name" value="name"></cm-nested-item>
      <cm-nested-item label="Phone" value="phone"></cm-nested-item>
    </cm-nested-list>
    <cm-nested-list heading="Contact details" group="layout" sortable>
      <cm-nested-item label="Email" value="email"></cm-nested-item>
      <cm-nested-item label="City" value="city"></cm-nested-item>
    </cm-nested-list>
    <cm-nested-list heading="Other" group="other" sortable>
      <cm-nested-item label="Notes" value="notes"></cm-nested-item>
    </cm-nested-list>
    <cm-nested-list heading="Empty" group="layout" sortable></cm-nested-list>
  </div>`;
  const setup = async () => {
    const root = await mount<HTMLElement>(layout);
    const lists = [...root.querySelectorAll('cm-nested-list')] as CmNestedList[];
    await Promise.all(lists.map((l) => l.updateComplete));
    const item = (v: string) => root.querySelector(`[value="${v}"]`) as CmNestedItem;
    await Promise.all([...root.querySelectorAll('cm-nested-item')].map((i) => (i as CmNestedItem).updateComplete));
    const values = (l: CmNestedList) => l.items.map((i) => i.value);
    return { root, lists, item, values };
  };

  it('↓ on the last row moves it into the next list of the group, fires cm-move and announces it', async () => {
    const { root, lists, item, values } = await setup();
    const moves: any[] = [];
    root.addEventListener('cm-move', (e) => moves.push((e as CustomEvent).detail));
    expect(shadow(item('phone'), '#hint').textContent).toContain('list before or after');
    shadow(item('phone'), '.handle').focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(values(lists[0])).toEqual(['name']);
    expect(values(lists[1])).toEqual(['phone', 'email', 'city']);
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({ item: item('phone'), from: 1, to: 0, fromList: lists[0], toList: lists[1] });
    await frames(); await lists[1].updateComplete;
    expect(shadow(lists[1], '[role="status"]').textContent).toBe('Phone moved to Contact details, position 1 of 3.');
    // Focus stays on the handle, so the next keys keep moving it: within the new list, then on into the empty list (skipping group "other").
    expect(item('phone').shadowRoot!.activeElement).toBe(shadow(item('phone'), '.handle'));
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(values(lists[1])).toEqual(['email', 'city', 'phone']);
    await userEvent.keyboard('{ArrowDown}');
    expect(values(lists[3])).toEqual(['phone']);
    expect(values(lists[2])).toEqual(['notes']);
    await frames(); await lists[3].updateComplete;
    expect(shadow(lists[3], '[role="status"]').textContent).toBe('Phone moved to Empty, position 1 of 1.');
    // The end of the last list: nothing further.
    await userEvent.keyboard('{ArrowDown}');
    expect(values(lists[3])).toEqual(['phone']);
  });

  it('↑ on the first row moves it to the end of the list before; reordering inside a list still fires cm-reorder', async () => {
    const { root, lists, item, values } = await setup();
    const events: string[] = [];
    root.addEventListener('cm-move', () => events.push('move'));
    root.addEventListener('cm-reorder', () => events.push('reorder'));
    shadow(item('email'), '.handle').focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(values(lists[0])).toEqual(['name', 'phone', 'email']);
    await userEvent.keyboard('{ArrowUp}');
    expect(values(lists[0])).toEqual(['name', 'email', 'phone']);
    expect(events).toEqual(['move', 'reorder']);
    // ↑ on the first row of the first list does nothing. Wait a frame first: the list puts focus back on the moved row.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
    shadow(item('name'), '.handle').focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(values(lists[0])).toEqual(['name', 'email', 'phone']);
  });

  it('a cancelled cm-move leaves the row where it was; moveToList refuses lists of another group', async () => {
    const { root, lists, item, values } = await setup();
    const cancel = (e: Event) => e.preventDefault();
    root.addEventListener('cm-move', cancel);
    expect(item('name').moveToList(lists[1], 1)).toBe(false);
    expect(values(lists[0])).toEqual(['name', 'phone']);
    root.removeEventListener('cm-move', cancel);
    expect(item('name').moveToList(lists[2])).toBe(false); // group "other"
    expect(item('name').moveToList(lists[1], 1)).toBe(true);
    expect(values(lists[1])).toEqual(['email', 'name', 'city']);
    expect(item('city').moveToList(lists[3])).toBe(true);
    expect(values(lists[3])).toEqual(['city']);
  });

  it('lists without a group keep the old behaviour: the arrows stop at the ends', async () => {
    const root = await mount<CmNestedList>(`<cm-nested-list heading="A" sortable><cm-nested-item label="One" value="1"></cm-nested-item></cm-nested-list>`);
    const one = root.querySelector('cm-nested-item') as CmNestedItem;
    await one.updateComplete;
    expect(shadow(one, '#hint').textContent).toBe('Press up or down arrow to move.');
    expect(shadow(root, '.rows').classList.contains('empty')).toBe(false);
    let moved = false;
    root.addEventListener('cm-move', () => (moved = true));
    shadow(one, '.handle').focus();
    await userEvent.keyboard('{ArrowDown}{ArrowUp}');
    expect(moved).toBe(false);
  });

  it('an empty list in a group shows a drop area', async () => {
    const { lists } = await setup();
    const rows = shadow(lists[3], '.rows');
    expect(rows.classList.contains('empty')).toBe(true);
    expect(rows.getBoundingClientRect().height).toBeGreaterThan(40);
    expect(shadow(lists[0], '.rows').classList.contains('empty')).toBe(false);
  });

  it('mouse: drag and drop onto another list of the group', async () => {
    const { lists, item, values } = await setup();
    const dt = new DataTransfer();
    const handle = shadow(item('name'), '.handle');
    handle.dispatchEvent(new DragEvent('dragstart', { bubbles: true, composed: true, dataTransfer: dt }));
    const city = item('city').getBoundingClientRect();
    const row = shadow(item('city'), '.row');
    // Over the top half of City: lands before it.
    row.dispatchEvent(new DragEvent('dragover', { bubbles: true, composed: true, cancelable: true, dataTransfer: dt, clientX: city.left + 20, clientY: city.top + 5 }));
    expect(item('city').classList.contains('drop-before')).toBe(true);
    row.dispatchEvent(new DragEvent('drop', { bubbles: true, composed: true, cancelable: true, dataTransfer: dt, clientX: city.left + 20, clientY: city.top + 5 }));
    handle.dispatchEvent(new DragEvent('dragend', { bubbles: true, composed: true }));
    expect(values(lists[1])).toEqual(['email', 'name', 'city']);
    expect(document.querySelectorAll('.drop-before, .drop-after, .drop-target').length).toBe(0);
  });

  it('touch: dragging the handle with pointer events moves the row into another list', async () => {
    const { root, lists, item, values } = await setup();
    const moves: any[] = [];
    root.addEventListener('cm-move', (e) => moves.push((e as CustomEvent).detail));
    const handle = shadow(item('name'), '.handle');
    expect(getComputedStyle(handle).touchAction).toBe('none');
    const h = handle.getBoundingClientRect();
    const opts = { bubbles: true, composed: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true };
    handle.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: h.left + 5, clientY: h.top + 5 }));
    const target = shadow(lists[3], '.rows').getBoundingClientRect();
    const at = { clientX: target.left + 20, clientY: target.top + 20 };
    handle.dispatchEvent(new PointerEvent('pointermove', { ...opts, ...at }));
    expect(item('name').classList.contains('dragging')).toBe(true);
    expect(lists[3].classList.contains('drop-target')).toBe(true);
    handle.dispatchEvent(new PointerEvent('pointerup', { ...opts, ...at }));
    expect(values(lists[3])).toEqual(['name']);
    expect(values(lists[0])).toEqual(['phone']);
    expect(moves[0]).toMatchObject({ from: 0, to: 0, fromList: lists[0], toList: lists[3] });
    expect(item('name').classList.contains('dragging')).toBe(false);
    expect(lists[3].classList.contains('drop-target')).toBe(false);
  });

  it('touch: dragging within the list reorders it (cm-reorder); a cancelled pointer does nothing', async () => {
    const { root, lists, item, values } = await setup();
    const handle = shadow(item('email'), '.handle');
    const opts = { bubbles: true, composed: true, cancelable: true, pointerId: 3, pointerType: 'touch', isPrimary: true };
    const h = handle.getBoundingClientRect();
    const below = item('city').getBoundingClientRect();
    handle.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: h.left + 5, clientY: h.top + 5 }));
    handle.dispatchEvent(new PointerEvent('pointermove', { ...opts, clientX: h.left + 5, clientY: below.bottom - 2 }));
    handle.dispatchEvent(new PointerEvent('pointercancel', { ...opts, clientX: h.left + 5, clientY: below.bottom - 2 }));
    expect(values(lists[1])).toEqual(['email', 'city']);
    let reorder: any;
    root.addEventListener('cm-reorder', (e) => (reorder = (e as CustomEvent).detail));
    handle.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: h.left + 5, clientY: h.top + 5 }));
    handle.dispatchEvent(new PointerEvent('pointermove', { ...opts, clientX: h.left + 5, clientY: below.bottom - 2 }));
    expect(item('city').classList.contains('drop-after')).toBe(true);
    handle.dispatchEvent(new PointerEvent('pointerup', { ...opts, clientX: h.left + 5, clientY: below.bottom - 2 }));
    expect(values(lists[1])).toEqual(['city', 'email']);
    expect(reorder).toMatchObject({ from: 0, to: 1 });
  });

  it('right to left: the keyboard path and announcement work the same', async () => {
    document.documentElement.setAttribute('dir', 'rtl');
    try {
      const { lists, item, values } = await setup();
      shadow(item('phone'), '.handle').focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(values(lists[1])[0]).toBe('phone');
      await frames(); await lists[1].updateComplete;
      expect(shadow(lists[1], '[role="status"]').textContent).toBe('Phone moved to Contact details, position 1 of 3.');
    } finally { document.documentElement.removeAttribute('dir'); }
  });
});

describe('cm-card actions without a heading', () => {
  it('shows the actions slot in its own row at the end of the card', async () => {
    const el = await mount<CmCard>('<cm-card><cm-button slot="actions" size="slim">Edit</cm-button><p style="margin:0">Body</p></cm-card>');
    await new Promise((r) => setTimeout(r));
    await el.updateComplete;
    const bare = shadow(el, '.bare');
    expect(bare.hidden).toBe(false);
    const btn = el.querySelector('cm-button')!.getBoundingClientRect();
    const card = shadow(el, 'section').getBoundingClientRect();
    expect(card.right - btn.right).toBeLessThan(card.width / 4);
    expect(btn.bottom).toBeLessThanOrEqual(el.querySelector('p')!.getBoundingClientRect().top);
  });
  it('without actions or heading nothing extra shows; with a heading the header is as before', async () => {
    const el = await mount<CmCard>('<cm-card><p>Body</p></cm-card>');
    await new Promise((r) => setTimeout(r));
    expect(shadow(el, '.bare').hidden).toBe(true);
    expect(shadow(el, '.bare').getBoundingClientRect().height).toBe(0);
    const h = await mount<CmCard>('<cm-card heading="Shipping"><cm-button slot="actions">Edit</cm-button></cm-card>');
    expect(shadow(h, '.bare')).toBeNull();
    expect(shadow(h, 'header .actions slot[name="actions"]')).toBeTruthy();
  });
});

describe('cm-option-group tones (#28)', () => {
  const rgb = (c: string): number[] => {
    const m = c.match(/^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)/);
    if (m) return [m[1], m[2], m[3]].map(Number);
    return c.match(/[\d.]+/g)!.slice(0, 3).map((v) => Number(v) / 255);
  };
  const lum = (c: number[]) => c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const contrast = (a: string, b: string) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const token = (name: string) => {
    const probe = document.createElement('span');
    probe.style.color = `var(--cm-${name})`;
    document.getElementById('box')!.append(probe);
    const v = getComputedStyle(probe).color;
    probe.remove();
    return v;
  };
  const outcome = `<cm-option-group name="outcome" label="Visit outcome">
    <option value="pitched">Pitched</option>
    <option value="signed_up" tone="success">Signed up</option>
    <option value="not_interested" tone="critical">Not interested</option>
    <option value="closed" tone="critical" disabled>Shop closed for good</option>
  </cm-option-group>`;
  const mountThemed = async (markup: string, theme: string) => {
    document.body.innerHTML = `<div id="away" style="height:20px"></div><div id="box" data-cm-theme="${theme}" style="padding:16px;background:var(--cm-bg-surface)">${markup}</div>`;
    await userEvent.hover(document.getElementById('away')!);
    const el = document.getElementById('box')!.firstElementChild as HTMLElement & { value: string; updateComplete: Promise<unknown> };
    await el.updateComplete;
    return el;
  };
  const btn = (el: Element, i: number) => all(el, 'button')[i];
  // Wait for tokens.css (imported above) to apply.
  const ready = async () => {
    const end = Date.now() + 10_000;
    while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-20') && Date.now() < end) await new Promise((r) => setTimeout(r, 20));
  };

  it('reads tone from <option tone> and from the options data; untoned options render as before', async () => {
    await ready();
    const el = await mountThemed(outcome, 'light');
    expect(btn(el, 0).hasAttribute('class')).toBe(false);
    expect(btn(el, 1).className).toBe('tone-success');
    expect(btn(el, 2).className).toBe('tone-critical');
    (el as any).options = [{ value: 'a', label: 'A', tone: 'success' }, { value: 'b', label: 'B', tone: 'nonsense' }, 'C'];
    await el.updateComplete;
    expect(btn(el, 0).className).toBe('tone-success');
    expect(btn(el, 1).hasAttribute('class')).toBe(false);
    expect(btn(el, 2).hasAttribute('class')).toBe(false);
    // The role, name and checked state carry the meaning, not the colour.
    expect(btn(el, 0).getAttribute('role')).toBe('radio');
  });

  for (const theme of ['light', 'dark']) {
    it(`unselected and selected tones (${theme}): the button tone token pairs, AA contrast, fill marks the selection`, async () => {
      await ready();
      const el = await mountThemed(outcome, theme);
      for (const [i, text, border] of [[1, 'text-success', 'text-success'], [2, 'text-critical', 'border-critical']] as const) {
        const cs = getComputedStyle(btn(el, i));
        expect(cs.backgroundColor).toBe(token('bg-surface'));
        expect(cs.color).toBe(token(text));
        expect(cs.borderTopColor).toBe(token(border));
        expect(contrast(cs.color, cs.backgroundColor)).toBeGreaterThanOrEqual(4.5);
        for (const s of ['bg-surface', 'bg-page']) expect(contrast(cs.borderTopColor, token(s))).toBeGreaterThanOrEqual(3);
        await userEvent.hover(btn(el, i));
        const hover = getComputedStyle(btn(el, i));
        expect(hover.backgroundImage === 'none' ? hover.backgroundColor : hover.backgroundImage).not.toBe(token('bg-surface'));
        // The tint is a checked pair (text-critical on bg-critical, text-success on bg-success-soft: contrast.mjs).
        expect(hover.color).toBe(token(text));
        await userEvent.hover(document.getElementById('away')!);
      }
      for (const [i, fill] of [[1, 'text-success'], [2, 'text-critical']] as const) {
        btn(el, i).click();
        await el.updateComplete;
        const cs = getComputedStyle(btn(el, i));
        expect(btn(el, i).getAttribute('aria-checked')).toBe('true');
        expect(cs.backgroundColor).toBe(token(fill));
        expect(cs.color).toBe(token('action-primary-text'));
        const restBg = cs.backgroundColor;
        const rest = contrast(cs.color, restBg);
        expect(rest).toBeGreaterThanOrEqual(4.5);
        await userEvent.hover(btn(el, i));
        const hover = getComputedStyle(btn(el, i));
        expect(hover.backgroundColor).not.toBe(restBg);
        expect(contrast(hover.color, hover.backgroundColor)).toBeGreaterThanOrEqual(rest);
        await userEvent.hover(document.getElementById('away')!);
      }
    });
  }

  it('disabled toned options look like any disabled option; focus ring as usual; keyboard skips disabled', async () => {
    await ready();
    const el = await mountThemed(outcome, 'light');
    expect(getComputedStyle(btn(el, 3)).backgroundColor).toBe(token('bg-input-filled'));
    expect(getComputedStyle(btn(el, 3)).color).toBe(token('text-secondary'));
    btn(el, 0).click();
    await el.updateComplete;
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    await el.updateComplete;
    expect(el.value).toBe('not_interested');
    expect(el.shadowRoot!.activeElement).toBe(btn(el, 2));
    expect(getComputedStyle(btn(el, 2)).outlineColor).toBe(token('border-strong'));
    await userEvent.keyboard('{ArrowRight}');
    await el.updateComplete;
    expect(el.value).toBe('pitched'); // wrapped past the disabled option
  });
});
