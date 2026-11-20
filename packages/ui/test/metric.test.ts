// 1.2 addition for the CRM rebuild (#19): cm-metric, a number / KPI tile.
import { describe, it, expect, beforeEach, beforeAll, afterEach } from 'vitest';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import { resetStrings } from '../src/index.js';
import type { CmMetric } from '../src/index.js';

const settle = async (root: ParentNode) => {
  const all = [...root.querySelectorAll('*')] as any[];
  for (let i = 0; i < 2; i++) {
    await Promise.all(all.map((e) => e.updateComplete));
    for (const e of all) if (e.shadowRoot) await Promise.all([...e.shadowRoot.querySelectorAll('*')].map((c: any) => c.updateComplete));
  }
  await new Promise((r) => requestAnimationFrame(() => r(null)));
};
const mount = async (markup: string, attrs = 'lang="en-IN"'): Promise<CmMetric> => {
  document.body.innerHTML = `<div id="box" ${attrs} style="width:360px;padding:16px;background:var(--cm-bg-page)">${markup}</div>`;
  const box = document.getElementById('box')!;
  await settle(box);
  return box.querySelector('cm-metric') as CmMetric;
};
const shadow = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
/** Text a screen reader gets from a node: skips aria-hidden subtrees, follows slots. */
const spoken = (n: Node): string => {
  if (n.nodeType === Node.TEXT_NODE) return n.textContent ?? '';
  if (!(n instanceof Element)) return '';
  if (n.getAttribute('aria-hidden') === 'true') return '';
  if (n instanceof HTMLSlotElement) {
    const assigned = n.assignedNodes();
    return (assigned.length ? assigned : [...n.childNodes]).map(spoken).join('');
  }
  const kids = n.shadowRoot ? [...n.shadowRoot.childNodes] : [...n.childNodes];
  return kids.map(spoken).join('');
};
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const token = (name: string, scope: Element = document.getElementById('box')!) => {
  const probe = document.createElement('span');
  probe.style.color = `var(--cm-${name})`;
  scope.append(probe);
  const v = getComputedStyle(probe).color;
  probe.remove();
  return v;
};

beforeAll(async () => {
  const end = Date.now() + 10_000;
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-20') && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 20));
  }
});
beforeEach(() => { document.body.innerHTML = ''; resetStrings(); });
afterEach(() => resetStrings());

describe('cm-metric: the figure', () => {
  it('formats a number for the locale, with lakh grouping in en-IN', async () => {
    const el = await mount('<cm-metric label="SMB leads" value="1240"></cm-metric>');
    expect(el.value).toBe(1240);
    expect(shadow(el, '.value').textContent!.trim()).toBe('1,240');
    el.value = 1240000;
    await el.updateComplete;
    expect(shadow(el, '.value').textContent!.trim()).toBe('12,40,000');
    const us = await mount('<cm-metric label="Leads" value="1240000"></cm-metric>', 'lang="en-US"');
    expect(shadow(us, '.value').textContent!.trim()).toBe('1,240,000');
  });

  it('shows any other text as given', async () => {
    const el = await mount('<cm-metric label="Sales" value="Rs. 2.4 L"></cm-metric>');
    expect(el.value).toBe('Rs. 2.4 L');
    expect(shadow(el, '.value').textContent!.trim()).toBe('Rs. 2.4 L');
    el.value = '3 of 5';
    await el.updateComplete;
    expect(shadow(el, '.value').textContent!.trim()).toBe('3 of 5');
  });

  it('is a large figure in tabular numerals, sized by the type tokens', async () => {
    const el = await mount('<cm-metric label="SMB leads" value="1240"></cm-metric>');
    const cs = getComputedStyle(shadow(el, '.value'));
    expect(cs.fontVariantNumeric).toBe('tabular-nums');
    const root = getComputedStyle(document.documentElement);
    const size = window.innerWidth <= 640 ? '--cm-type-heading-lg-resp-size' : '--cm-type-heading-lg-size'; // 24px on phones, 26px wider
    expect(cs.fontSize).toBe(root.getPropertyValue(size).trim());
    expect(cs.fontWeight).toBe(root.getPropertyValue('--cm-type-heading-lg-weight').trim());
  });
});

describe('cm-metric: hint and change', () => {
  it('hint from the attribute or the slot; no empty footer without either', async () => {
    const plain = await mount('<cm-metric label="SMB leads" value="1240"></cm-metric>');
    expect(getComputedStyle(shadow(plain, '.foot')).display).toBe('none');
    const attr = await mount('<cm-metric label="Demos in the next 7 days" value="3" hint="2 past demos need a result"></cm-metric>');
    expect(shadow(attr, '.hint').textContent!.trim()).toBe('2 past demos need a result');
    expect(getComputedStyle(shadow(attr, '.hint')).display).not.toBe('none');
    const slotted = await mount('<cm-metric label="Demos" value="3"><span slot="hint"><b>2</b> past demos need a result</span></cm-metric>');
    expect(getComputedStyle(shadow(slotted, '.hint')).display).not.toBe('none');
    expect(clean(spoken(shadow(slotted, '.hint')))).toBe('2 past demos need a result');
  });

  it('trend up is good by default: arrow, green, and said in words', async () => {
    const el = await mount('<cm-metric label="Won deals" value="48" change="+12%" trend="up"></cm-metric>');
    const c = shadow(el, '.change');
    expect(c.querySelector('cm-icon')!.getAttribute('name')).toBe('arrow-up-right');
    expect(getComputedStyle(c).color).toBe(token('text-success'));
    expect(clean(spoken(c))).toBe('Up +12%, good');
    expect(c.querySelector('[aria-hidden="true"]')!.textContent).toBe('+12%');
  });

  it('trend-sentiment="negative" makes up bad (red); down is bad by default; flat is neutral', async () => {
    const up = await mount('<cm-metric label="Overdue tasks" value="9" change="+3" trend="up" trend-sentiment="negative"></cm-metric>');
    expect(getComputedStyle(shadow(up, '.change')).color).toBe(token('text-critical'));
    expect(clean(spoken(shadow(up, '.change')))).toBe('Up +3, bad');
    const down = await mount('<cm-metric label="Leads" value="90" change="-5%" trend="down"></cm-metric>');
    expect(getComputedStyle(shadow(down, '.change')).color).toBe(token('text-critical'));
    expect(clean(spoken(shadow(down, '.change')))).toBe('Down -5%, bad');
    const good = await mount('<cm-metric label="Refunds" value="2" change="-1" trend="down" trend-sentiment="positive"></cm-metric>');
    expect(getComputedStyle(shadow(good, '.change')).color).toBe(token('text-success'));
    const flat = await mount('<cm-metric label="Leads" value="90" change="0%" trend="flat"></cm-metric>');
    expect(getComputedStyle(shadow(flat, '.change')).color).toBe(token('text-tertiary'));
    expect(clean(spoken(shadow(flat, '.change')))).toBe('No change 0%');
  });

  it('arrows point up-forward, down-forward and forward', async () => {
    const angle = (el: CmMetric) => {
      const icon = shadow(el, '.change cm-icon');
      const t = getComputedStyle(icon).transform;
      const m = new DOMMatrixReadOnly(t === 'none' ? undefined : t);
      return Math.round((Math.atan2(m.b, m.a) * 180) / Math.PI);
    };
    expect(angle(await mount('<cm-metric label="A" value="1" change="+1" trend="up"></cm-metric>'))).toBe(0);
    expect(angle(await mount('<cm-metric label="A" value="1" change="-1" trend="down"></cm-metric>'))).toBe(90);
    const flat = await mount('<cm-metric label="A" value="1" change="0" trend="flat"></cm-metric>');
    expect(Math.abs(angle(flat))).toBe(180);
    expect(shadow(flat, '.change cm-icon').getAttribute('name')).toBe('arrow-left');
  });

  it('a change without a trend is plain quiet text; an unknown trend is ignored', async () => {
    const el = await mount('<cm-metric label="Leads" value="90" change="vs 84 last week"></cm-metric>');
    const c = shadow(el, '.change');
    expect(c.querySelector('cm-icon')).toBeNull();
    expect(clean(spoken(c))).toBe('vs 84 last week');
    expect(getComputedStyle(c).color).toBe(token('text-tertiary'));
    const odd = await mount('<cm-metric label="Leads" value="90" change="+1" trend="sideways"></cm-metric>');
    expect(shadow(odd, '.change cm-icon')).toBeNull();
  });

  it('dark theme: colours come from the tokens', async () => {
    const el = await mount('<cm-metric label="Won" value="4" change="+1" trend="up" hint="This week"></cm-metric>', 'lang="en-IN" data-cm-theme="dark"');
    const box = document.getElementById('box')!;
    expect(getComputedStyle(shadow(el, '.tile')).backgroundColor).toBe(token('bg-surface', box));
    expect(getComputedStyle(shadow(el, '.value')).color).toBe(token('text-default', box));
    expect(getComputedStyle(shadow(el, '.hint')).color).toBe(token('text-tertiary', box));
    expect(getComputedStyle(shadow(el, '.change')).color).toBe(token('text-success', box));
    expect(token('bg-surface', box)).not.toBe(token('bg-surface', document.body));
  });
});

describe('cm-metric: as a link', () => {
  it('is one link named by the label and the figure, described by the change and hint', async () => {
    const el = await mount('<cm-metric label="SMB leads" value="1240" href="#leads" change="+12%" trend="up" hint="Since Monday"></cm-metric>');
    const links = el.shadowRoot!.querySelectorAll('a');
    expect(links.length).toBe(1);
    const a = links[0];
    expect(a.getAttribute('href')).toBe('#leads');
    const name = a.getAttribute('aria-labelledby')!.split(' ').map((id) => clean(spoken(el.shadowRoot!.getElementById(id)!))).join(' ');
    expect(name).toBe('SMB leads 1,240');
    expect(clean(spoken(el.shadowRoot!.getElementById(a.getAttribute('aria-describedby')!)!))).toBe('Up +12%, good Since Monday');
    // One tab stop (WebKit's Tab skips links unless the Safari setting is on, so this checks focusability directly).
    expect(el.shadowRoot!.querySelectorAll('a, button, input, [tabindex]').length).toBe(1);
    a.focus();
    expect(el.shadowRoot!.activeElement).toBe(a);
  });

  it('without href there is no link and nothing to focus', async () => {
    const el = await mount('<cm-metric label="SMB leads" value="1240"></cm-metric>');
    expect(el.shadowRoot!.querySelector('a')).toBeNull();
    expect(el.shadowRoot!.querySelectorAll('a, button, input, [tabindex]').length).toBe(0);
  });
});

describe('cm-metric: loading', () => {
  it('shows a skeleton instead of the figure, sets aria-busy and announces politely', async () => {
    const el = await mount('<cm-metric label="SMB leads" value="1240" href="#leads" loading></cm-metric>');
    const v = shadow(el, '.value');
    expect(v.querySelector('cm-skeleton')).not.toBeNull();
    expect(v.textContent!.trim()).toBe('');
    expect(shadow(el, '.tile').getAttribute('aria-busy')).toBe('true');
    const status = shadow(el, '[role="status"]');
    expect(status.textContent).toBe('Loading SMB leads');
    expect(shadow(el, '.tile').contains(status)).toBe(false); // the live region sits outside the link
    expect(shadow(el, '.value cm-skeleton').getBoundingClientRect().height).toBeLessThan(40);
    el.loading = false;
    await el.updateComplete;
    expect(shadow(el, '.value').textContent!.trim()).toBe('1,240');
    expect(shadow(el, '.tile').hasAttribute('aria-busy')).toBe(false);
    expect(shadow(el, '[role="status"]').textContent).toBe('');
  });
});

describe('cm-metric: layout', () => {
  it('a row in cm-grid: tiles share the row height; one column in a 320px window-wide column with nothing sideways', async () => {
    const row = `<cm-grid min-column-width="200px">
      <cm-metric label="SMB leads" value="1240"></cm-metric>
      <cm-metric label="Demos in the next 7 days" value="3" hint="2 past demos need a result"></cm-metric>
      <cm-metric label="Pipeline value" value="Rs. 12,40,00,000" change="+12%" trend="up"></cm-metric>
    </cm-grid>`;
    document.body.innerHTML = `<div id="box" lang="en-IN" style="width:900px">${row}</div>`;
    await settle(document.body);
    const tiles = [...document.querySelectorAll('cm-metric')].map((m) => shadow(m, '.tile').getBoundingClientRect());
    expect(new Set(tiles.map((r) => Math.round(r.height))).size).toBe(1);
    expect(new Set(tiles.map((r) => Math.round(r.top))).size).toBe(1);

    // The suite's window is 414px wide (phone styles apply); the column is a 320px phone's, gutters included.
    document.body.innerHTML = `<div id="box" lang="en-IN" style="width:320px;padding:0 16px;overflow:auto">${row}</div>`;
    await settle(document.body);
    const box = document.getElementById('box')!;
    expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth);
    for (const m of document.querySelectorAll('cm-metric')) {
      const r = shadow(m, '.tile').getBoundingClientRect();
      expect(r.width).toBeLessThanOrEqual(box.clientWidth - 32 + 0.5);
      expect(shadow(m, '.value').scrollWidth).toBeLessThanOrEqual(shadow(m, '.value').clientWidth + 1);
    }
  });
});

