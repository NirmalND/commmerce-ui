// 1.5.0 size scale (issue #29), updated to the owner standard in 1.6 (issue #33): fields 40 (44 on touch), buttons 36
// (40 on touch), labels 13/500, supporting text 12/16, badges 24px. Control heights, type, badges in sentence case, the segmented control.
// Heights are border-box sizes set in px, so they don't depend on the font; text checks use computed font sizes only.
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { userEvent } from '@vitest/browser/context';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import type { CmSegmentedControl, CmSelect, CmButton } from '../src/index.js';

const touch = () => matchMedia('(pointer: coarse)').matches;
const mount = async <T extends HTMLElement>(markup: string, attrs = ''): Promise<T> => {
  document.body.innerHTML = `<div id="box" ${attrs} style="width:640px;padding:16px">${markup}</div>`;
  const el = document.getElementById('box')!.firstElementChild as T;
  await (el as any).updateComplete;
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  return el;
};
const part = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
const px = (el: Element, prop: string) => parseFloat(getComputedStyle(el).getPropertyValue(prop));

beforeAll(async () => {
  const end = Date.now() + 10_000;
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-control-height-md') && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 20));
  }
});
beforeEach(() => { document.body.innerHTML = ''; });

describe('tokens: the 1.5 scale', () => {
  it('control heights, type, radius and motion tokens have the documented values', () => {
    const v = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(`--cm-${n}`).trim();
    expect([v('control-height-sm'), v('control-height-md'), v('control-height-lg'), v('control-height-touch')]).toEqual(['32px', '36px', '40px', '44px']);
    expect([v('type-body-md-size'), v('type-body-md-line-height'), v('type-label-size'), v('type-label-weight')]).toEqual(['14px', '20px', '13px', '500']);
    expect([v('type-heading-section-size'), v('type-heading-section-line-height'), v('type-heading-section-weight')]).toEqual(['18px', '26px', '600']);
    expect([v('type-body-xs-size'), v('type-body-xs-line-height')]).toEqual(['12px', '16px']);
    expect([v('type-heading-sm-size'), v('type-heading-sm-weight'), v('type-heading-lg-size')]).toEqual(['16px', '600', '24px']);
    expect([v('radius-sm'), v('radius-md'), v('radius-lg')]).toEqual(['6px', '8px', '12px']);
    expect([v('space-4'), v('space-8'), v('space-12'), v('space-16'), v('space-24'), v('space-32')]).toEqual(['4px', '8px', '12px', '16px', '24px', '32px']);
    expect(v('duration-fast')).toBe('120ms');
  });
});

describe('cm-button sizes', () => {
  it('large 40, medium (default) 36, slim 32; text 14px (13px slim), never below 13px', async () => {
    const want = { large: 40, medium: 36, slim: 32 } as const;
    for (const [size, h] of Object.entries(want)) {
      const el = await mount<CmButton>(`<cm-button size="${size}" icon="plus">Add order</cm-button>`);
      const b = part(el, 'button');
      expect(b.getBoundingClientRect().height, size).toBe(touch() ? Math.max(40, h) : h);
      expect(px(b, 'font-size'), size).toBe(size === 'slim' ? 13 : 14);
      expect(px(b, 'padding-inline-start'), size).toBeGreaterThanOrEqual(12);
      expect(px(b, 'border-top-left-radius'), size).toBe(6);
    }
    const def = await mount<CmButton>('<cm-button>Save</cm-button>');
    expect(part(def, 'button').getBoundingClientRect().height).toBe(touch() ? 40 : 36);
  });
});

describe('fields: 40px by default, size="small" 32px, label 13px medium, help 12px (owner standard, 1.6)', () => {
  const fields: Array<[string, string, string]> = [
    ['cm-text-field', '<cm-text-field label="Name" help-text="As on invoices" SIZE></cm-text-field>', '.input'],
    ['cm-select', '<cm-select label="Status" help-text="Pick one" SIZE><option>Open</option><option>Done</option></cm-select>', '.box'],
    ['cm-combobox', '<cm-combobox label="City" help-text="Type to search" SIZE><option>Pune</option></cm-combobox>', '.box'],
    ['cm-date-picker', '<cm-date-picker label="Due" help-text="Any day" SIZE></cm-date-picker>', '.box'],
    ['cm-date-range-picker', '<cm-date-range-picker label="Dates" help-text="Up to a year" SIZE></cm-date-range-picker>', '.box'],
  ];
  for (const [tag, markup, box] of fields) {
    it(tag, async () => {
      const el = await mount<HTMLElement>(markup.replace('SIZE', ''));
      expect(part(el, box).getBoundingClientRect().height, 'default').toBe(touch() ? 44 : 40);
      const label = part(el, '.label');
      expect(px(label, 'font-size')).toBe(13);
      expect(getComputedStyle(label).fontWeight).toBe('500');
      expect(px(part(el, '.help'), 'font-size')).toBe(12);
      expect(px(part(el, '.help'), 'line-height')).toBe(16);
      expect(px(part(el, box).querySelector('input') ?? part(el, box), 'font-size')).toBe(touch() ? 16 : 14);
      const small = await mount<HTMLElement>(markup.replace('SIZE', 'size="small"'));
      expect(small.getAttribute('size')).toBe('small');
      expect(part(small, box).getBoundingClientRect().height, 'small').toBe(touch() ? 44 : 32);
      expect(px(part(small, '.label'), 'font-size')).toBe(13);
    });
  }
  it('cm-search: small 32, default 40, large 40', async () => {
    for (const [size, h] of [['small', 32], ['', 40], ['large', 40]] as const) {
      const el = await mount<HTMLElement>(`<cm-search ${size ? `size="${size}"` : ''} filter filter-count="2"></cm-search>`);
      expect(part(el, '.box').getBoundingClientRect().height, size || 'default').toBe(touch() ? 44 : h);
      expect(px(part(el, '.count'), 'font-size')).toBeGreaterThanOrEqual(12);
    }
  });
  it('cm-color-field: the swatch preview and hex box follow the field height', async () => {
    const el = await mount<HTMLElement>('<cm-color-field label="Brand colour" value="#3366ff"></cm-color-field>');
    const hex = part(el, '.input');
    expect(hex.getBoundingClientRect().height).toBe(touch() ? 44 : 40);
    const pick = part(el, '.pick, .preview');
    expect(pick.getBoundingClientRect().height).toBe(touch() ? 44 : 40);
  });
  it('a toolbar row lines up: small fields, slim buttons and a small segmented control are all 32px', async () => {
    document.body.innerHTML = `<div id="row" style="display:flex;gap:8px;align-items:center;width:900px">
      <cm-search size="small" style="flex:1"></cm-search>
      <cm-select size="small" aria-label="Status"><option>Open</option></cm-select>
      <cm-text-field size="small" aria-label="Owner"></cm-text-field>
      <cm-button size="slim">Clear</cm-button>
      <cm-segmented-control size="small" aria-label="View"><option>Board</option><option>List</option></cm-segmented-control>
    </div>`;
    const els = [...document.querySelectorAll('#row > *')] as any[];
    await Promise.all(els.map((e) => e.updateComplete));
    const boxes = els.map((e) => part(e, '.box, .input, button.btn, .options').getBoundingClientRect());
    // On touch screens fields grow to 44px and buttons to 40px (with a 44px hit area).
    boxes.forEach((r, i) => expect(r.height).toBe(touch() ? (els[i].localName === 'cm-button' ? 40 : 44) : 32));
    if (!touch()) for (const r of boxes) expect(r.top).toBe(boxes[0].top);
  });
  it('every field has a 44px touch rule (pointer: coarse) that covers every size', async () => {
    const el = await mount<HTMLElement>('<cm-select size="small" aria-label="Status"></cm-select>');
    const rules = [...el.shadowRoot!.adoptedStyleSheets].flatMap((s) => [...s.cssRules]);
    const coarse = rules.filter((r) => r instanceof CSSMediaRule && r.conditionText.includes('pointer: coarse')).map((r) => r.cssText).join('\n');
    expect(coarse).toMatch(/:host\(\[size="?'?small'?"?\]\)[^{]*\{[^}]*--_cm-field-h: var\(--cm-control-height-touch, 44px\)/);
  });
});

describe('cm-select options', () => {
  it('rows are 36px (1.6; 32px small) of 14px text in a list with 8px corners', async () => {
    const el = await mount<CmSelect>('<cm-select label="Status"><option>Open</option><option>Done</option></cm-select>');
    el.open = true; await el.updateComplete;
    const opt = part(el, '[role=option]');
    expect(opt.getBoundingClientRect().height).toBe(touch() ? 44 : 36);
    expect(px(opt, 'font-size')).toBe(14);
    expect(px(part(el, '[role=listbox]'), 'border-top-left-radius')).toBe(8);
  });
});

describe('checkbox, radio, toggle: 16px marks (checkbox 18px on touch), 14px labels, 12px descriptions', () => {
  it('sizes', async () => {
    const cb = await mount<HTMLElement>('<cm-checkbox label="Send email" description="Once a week"></cm-checkbox>');
    expect(part(cb, '.box').getBoundingClientRect().height).toBe(touch() ? 18 : 16);
    expect(px(part(cb, '.label'), 'font-size')).toBe(14);
    expect(px(part(cb, '.desc'), 'font-size')).toBe(12);
    const input = part(cb, 'input').getBoundingClientRect();
    expect(Math.min(input.width, input.height)).toBeGreaterThanOrEqual(24);
    const rg = await mount<HTMLElement>('<cm-radio-group label="Billing"><cm-radio value="m" label="Monthly"></cm-radio></cm-radio-group>');
    const radio = rg.querySelector('cm-radio')!;
    await (radio as any).updateComplete;
    expect(part(radio, '.dot').getBoundingClientRect().height).toBe(16);
    expect(part(radio, '.radio').getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
    expect(px(part(radio, '.label'), 'font-size')).toBe(14);
    const tg = await mount<HTMLElement>('<cm-toggle label="Active"></cm-toggle>');
    const track = part(tg, '.track').getBoundingClientRect();
    expect([track.width, track.height]).toEqual([36, 20]);
    expect(part(tg, '.thumb').getBoundingClientRect().height).toBe(16);
  });
});

describe('cm-badge in sentence case', () => {
  it('shows text as written: 12px medium, no uppercase or letter-spacing, 24px tall (owner standard, 1.6)', async () => {
    const el = await mount<HTMLElement>('<cm-badge tone="critical">2 h late</cm-badge>');
    const s = getComputedStyle(part(el, 'span'));
    expect(s.textTransform).toBe('none');
    expect(s.letterSpacing).toBe('normal');
    expect(s.fontSize).toBe('12px');
    expect(s.fontWeight).toBe('500');
    expect(s.fontVariantNumeric).toBe('tabular-nums');
    expect(part(el, 'span').getBoundingClientRect().height).toBe(24);
  });
});

describe('cm-page-header', () => {
  it('title uses heading-lg (24px semibold), breadcrumbs 13px', async () => {
    const el = await mount<any>('<cm-page-header heading="Tasks"></cm-page-header>');
    el.breadcrumbs = [{ label: 'Home', href: '#' }]; await el.updateComplete;
    expect(px(part(el, 'h1'), 'font-size')).toBe(innerWidth <= 640 ? 20 : 24); // heading-lg-resp on phones
    expect(getComputedStyle(part(el, 'h1')).fontWeight).toBe('600');
    expect(px(part(el, 'nav ol'), 'font-size')).toBe(13);
    // Lines up with cm-page's content: 24px at the sides, 16px on phones.
    expect(px(part(el, 'header'), 'padding-inline-start')).toBe(innerWidth <= 640 ? 16 : 24);
  });
});

describe('cm-segmented-control', () => {
  const markup = `<form><cm-segmented-control name="view" aria-label="View">
    <option value="board" selected>Board</option><option value="list">List</option><option value="calendar" disabled>Calendar</option>
  </cm-segmented-control></form>`;
  const radios = (el: Element) => [...el.shadowRoot!.querySelectorAll('[role=radio]')] as HTMLButtonElement[];

  it('is a radio group with one tab stop, named by aria-label, value from the selected option', async () => {
    const form = await mount<HTMLFormElement>(markup);
    const el = form.querySelector('cm-segmented-control') as CmSegmentedControl;
    await el.updateComplete;
    const group = part(el, '[role=radiogroup]');
    expect(group.getAttribute('aria-label')).toBe('View');
    expect(radios(el).map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
    expect(radios(el).map((r) => r.tabIndex)).toEqual([0, -1, -1]);
    expect(radios(el)[2].disabled).toBe(true);
    expect(el.value).toBe('board');
    expect(new FormData(form).get('view')).toBe('board');
  });
  it('arrow keys move and select (skipping disabled), firing input and change; the form gets the value', async () => {
    const form = await mount<HTMLFormElement>(markup);
    const el = form.querySelector('cm-segmented-control') as CmSegmentedControl;
    await el.updateComplete;
    const changes: string[] = [];
    el.addEventListener('change', () => changes.push(el.value));
    let inputs = 0;
    el.addEventListener('input', () => inputs++);
    el.focus();
    await userEvent.keyboard('{ArrowRight}');
    await el.updateComplete;
    expect(el.value).toBe('list');
    expect(el.shadowRoot!.activeElement).toBe(radios(el)[1]);
    await userEvent.keyboard('{ArrowRight}'); // wraps past the disabled one
    await el.updateComplete;
    expect(el.value).toBe('board');
    await userEvent.keyboard('{End}');
    await el.updateComplete;
    expect(el.value).toBe('list');
    expect(changes).toEqual(['list', 'board', 'list']);
    expect(inputs).toBe(3);
    expect(new FormData(form).get('view')).toBe('list');
    form.reset(); await el.updateComplete;
    expect(el.value).toBe('board');
  });
  it('click selects; one track of 36px (32px small); the selected segment is outlined (border-input)', async () => {
    const el = await mount<CmSegmentedControl>('<cm-segmented-control aria-label="Status"><option value="open" selected>Open</option><option value="done">Done</option></cm-segmented-control>');
    expect(part(el, '.options').getBoundingClientRect().height).toBe(touch() ? 44 : 36);
    await userEvent.click(radios(el)[1]);
    expect(el.value).toBe('done');
    const sel = getComputedStyle(radios(el)[1]);
    const token = (n: string) => { const p = document.createElement('i'); p.style.color = `var(--cm-${n})`; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    expect(sel.borderTopColor).toBe(token('border-input'));
    expect(sel.color).toBe(token('text-default'));
    expect(getComputedStyle(radios(el)[0]).color).toBe(token('text-tertiary'));
    expect(px(radios(el)[0], 'font-size')).toBe(14);
    el.size = 'small'; await el.updateComplete;
    expect(part(el, '.options').getBoundingClientRect().height).toBe(touch() ? 44 : 32);
    expect(px(radios(el)[0], 'font-size')).toBe(13);
  });
  it('required: invalid until a value is chosen, with its own message', async () => {
    const el = await mount<CmSegmentedControl>('<cm-segmented-control aria-label="View" required><option>Board</option><option>List</option></cm-segmented-control>');
    expect(el.checkValidity()).toBe(false);
    expect(el.validationMessage).toBe('Please select one of these options.');
    await userEvent.click(radios(el)[0]);
    expect(el.checkValidity()).toBe(true);
  });
  it('works in dark: selected text keeps AA contrast on the selected segment', async () => {
    const el = await mount<CmSegmentedControl>('<cm-segmented-control aria-label="View" value="b"><option value="a">A</option><option value="b">B</option></cm-segmented-control>', 'data-cm-theme="dark"');
    const s = getComputedStyle(radios(el)[1]);
    const lum = (c: string) => { const [r, g, b] = c.match(/\d+/g)!.slice(0, 3).map((n) => { const x = +n / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const [a, b] = [lum(s.color), lum(s.backgroundColor)].sort((x, y) => y - x);
    expect((a + 0.05) / (b + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
});
