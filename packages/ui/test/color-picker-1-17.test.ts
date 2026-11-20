// 1.17: cm-color-picker (brand and recent colours, opacity, formats, gradients), colour sources, and the field's picker panel.
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { userEvent } from '@vitest/browser/context';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import {
  parseColor, formatColor, parseGradient, formatGradient, sameColor, rgbToHsv, hsvToRgb, rgbToHsl, hslToRgb,
  localColorSource, httpColorSource, pushRecent, getDefaultStrings,
} from '../src/index.js';
import type { CmColorPicker, CmColorField, ColorSource } from '../src/index.js';

const sh = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
const shAll = (el: Element, sel: string) => [...el.shadowRoot!.querySelectorAll(sel)] as HTMLElement[];
const settle = async (el: any) => { await el.updateComplete; await new Promise((r) => requestAnimationFrame(() => r(null))); await el.updateComplete; };
const mount = async <T extends HTMLElement>(markup: string): Promise<T> => {
  document.body.innerHTML = `<div id="away" style="height:40px"></div><div id="box" style="width:360px;padding:16px">${markup}</div>`;
  const el = document.getElementById('box')!.firstElementChild as T;
  await settle(el);
  return el;
};
const track = (el: Element, ...types: string[]) => {
  const log: string[] = [];
  for (const t of types) el.addEventListener(t, () => log.push(t));
  return log;
};

beforeAll(async () => {
  const end = Date.now() + 10_000;
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-20') && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 20));
  }
});
beforeEach(() => { document.body.innerHTML = ''; try { localStorage.clear(); } catch { /* */ } });

describe('colour maths', () => {
  it('parses hex (3/4/6/8), rgb(a) in both syntaxes, hsl(a) and transparent', () => {
    expect(parseColor('#ABC')).toEqual({ r: 170, g: 187, b: 204, a: 1 });
    expect(parseColor('2e6faf')).toEqual({ r: 46, g: 111, b: 175, a: 1 });
    expect(parseColor('#2e6faf80')!.a).toBeCloseTo(0.502, 2);
    expect(parseColor('rgba(46, 111, 175, 0.5)')).toEqual({ r: 46, g: 111, b: 175, a: 0.5 });
    expect(parseColor('rgb(46 111 175 / 50%)')).toEqual({ r: 46, g: 111, b: 175, a: 0.5 });
    expect(formatColor(parseColor('hsl(210, 58%, 43%)')!)).toBe(formatColor(hslToRgb({ h: 210, s: 58, l: 43, a: 1 })));
    expect(parseColor('transparent')!.a).toBe(0);
    for (const bad of ['', 'blue', '#12', 'rgb(1,2)', 'rgb(a,b,c)', 'url(x)']) expect(parseColor(bad), bad).toBeNull();
  });
  it('writes hex, rgb and hsl, adding alpha only when see-through', () => {
    const c = { r: 46, g: 111, b: 175, a: 1 };
    expect(formatColor(c)).toBe('#2e6faf');
    expect(formatColor({ ...c, a: 0.5 })).toBe('#2e6faf80');
    expect(formatColor(c, 'rgb')).toBe('rgb(46, 111, 175)');
    expect(formatColor({ ...c, a: 0.25 }, 'rgb')).toBe('rgba(46, 111, 175, 0.25)');
    expect(formatColor(c, 'hsl')).toBe('hsl(210, 58%, 43%)');
    expect(formatColor({ ...c, a: 0.4 }, 'hsl')).toBe('hsla(210, 58%, 43%, 0.4)');
  });
  it('round-trips RGB through HSV and HSL', () => {
    for (const hex of ['#000000', '#ffffff', '#2e6faf', '#de0000', '#81bb47', '#ffc107']) {
      const c = parseColor(hex)!;
      expect(formatColor(hsvToRgb(rgbToHsv(c)))).toBe(hex);
      expect(formatColor(hslToRgb(rgbToHsl(c)))).toBe(hex);
    }
  });
  it('parses and writes linear and radial gradients', () => {
    const g = parseGradient('linear-gradient(to right, #2e6faf, rgba(222, 0, 0, 0.5) 80%, #000)')!;
    expect(g.type).toBe('linear');
    expect(g.angle).toBe(90);
    expect(g.stops.map((s) => s.position)).toEqual([0, 80, 100]);
    expect(formatGradient(g)).toBe('linear-gradient(90deg, #2e6faf 0%, #de000080 80%, #000000 100%)');
    expect(formatGradient(g, 'rgb')).toContain('rgba(222, 0, 0, 0.5) 80%');
    const r = parseGradient('radial-gradient(circle, #fff 0%, #000 100%)')!;
    expect(r.type).toBe('radial');
    expect(formatGradient(r)).toBe('radial-gradient(circle, #ffffff 0%, #000000 100%)');
    expect(parseGradient('linear-gradient(45deg, #fff)')).toBeNull();
    expect(parseGradient('conic-gradient(#fff, #000)')).toBeNull();
  });
  it('compares colours by value, whatever the format', () => {
    expect(sameColor('#2E6FAF', 'rgb(46, 111, 175)')).toBe(true);
    expect(sameColor('#2e6faf', '#2e6fb0')).toBe(false);
    expect(sameColor('linear-gradient(to right, #fff, #000)', 'linear-gradient(90deg, #ffffff 0%, #000000 100%)')).toBe(true);
  });
});

describe('colour sources', () => {
  it('pushRecent puts the colour first, drops an earlier copy and caps the list', () => {
    expect(pushRecent(['#aaaaaa', '#2E6FAF', '#bbbbbb'], '#2e6faf')).toEqual(['#2e6faf', '#aaaaaa', '#bbbbbb']);
    expect(pushRecent(['#1', '#2', '#3'], '#0', 3)).toEqual(['#0', '#1', '#2']);
  });
  it('localColorSource keeps recents per key in localStorage', async () => {
    const a = localColorSource('test-a');
    await a.addRecentColor!('#2e6faf');
    await a.addRecentColor!('#de0000');
    expect(await localColorSource('test-a').recentColors!()).toEqual(['#de0000', '#2e6faf']);
    expect(await localColorSource('test-b').recentColors!()).toEqual([]);
  });
  it('httpColorSource speaks the Colour API', async () => {
    const calls: Array<{ url: string; method: string; body?: string; auth?: string }> = [];
    const fake = (async (url: string, init: RequestInit = {}) => {
      calls.push({ url, method: init.method ?? 'GET', body: init.body as string, auth: (init.headers as Record<string, string>).Authorization });
      const colors = url.endsWith('/brand-colors') ? [{ value: '#123456', name: 'Primary' }] : ['#2e6faf'];
      return new Response(JSON.stringify({ colors }), { status: 200 });
    }) as unknown as typeof fetch;
    const src = httpColorSource({ baseUrl: '/api/colors/', headers: () => ({ Authorization: 'Bearer t' }), fetch: fake });
    expect(await src.brandColors!()).toEqual([{ value: '#123456', name: 'Primary' }]);
    expect(await src.recentColors!()).toEqual(['#2e6faf']);
    await src.addRecentColor!('#de0000');
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['GET /api/colors/brand-colors', 'GET /api/colors/recent-colors', 'POST /api/colors/recent-colors']);
    expect(JSON.parse(calls[2].body!)).toEqual({ color: '#de0000' });
    expect(calls.every((c) => c.auth === 'Bearer t')).toBe(true);
    const failing = httpColorSource({ baseUrl: '/x', fetch: (async () => new Response('', { status: 500 })) as unknown as typeof fetch });
    await expect(failing.recentColors!()).rejects.toThrow(/500/);
  });
});

describe('cm-color-picker', () => {
  it('shows the colour in the square, hue slider and hex box; arrows change saturation and brightness', async () => {
    const el = await mount<CmColorPicker>('<cm-color-picker value="#2e6faf"></cm-color-picker>');
    const area = sh(el, '.area');
    expect(area.getAttribute('role')).toBe('slider');
    expect(area.getAttribute('aria-valuetext')).toBe('Saturation 74%, brightness 69%');
    expect((sh(el, 'input.hue') as HTMLInputElement).value).toBe('210');
    expect((sh(el, '.box') as HTMLInputElement).value).toBe('#2e6faf');
    const log = track(el, 'input', 'change');
    area.focus();
    await userEvent.keyboard('{ArrowUp}');
    await settle(el);
    expect(el.value).not.toBe('#2e6faf');
    expect(rgbToHsv(parseColor(el.value)!).v).toBeCloseTo(70, 0);
    expect(log).toEqual(['input', 'change']);
    await userEvent.keyboard('{End}');
    await settle(el);
    expect(Math.round(rgbToHsv(parseColor(el.value)!).s)).toBe(100);
  });
  it('dragging in the square picks a colour and commits on release', async () => {
    const el = await mount<CmColorPicker>('<cm-color-picker value="#ff0000"></cm-color-picker>');
    const log = track(el, 'input', 'change');
    const area = sh(el, '.area');
    const r = area.getBoundingClientRect();
    area.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1, clientX: r.left + 1, clientY: r.top + 1 }));
    area.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
    expect(log).not.toContain('change');
    area.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
    await settle(el);
    const hsv = rgbToHsv(parseColor(el.value)!);
    expect(Math.round(hsv.s)).toBeGreaterThan(45);
    expect(Math.round(hsv.s)).toBeLessThan(55);
    expect(log.at(-1)).toBe('change');
  });
  it('the format menu rewrites the value as RGB or HSL, with a box per channel', async () => {
    const el = await mount<CmColorPicker>('<cm-color-picker value="#2e6faf"></cm-color-picker>');
    const select = sh(el, 'select') as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(['Hex', 'RGB', 'HSL']);
    select.value = 'rgb'; select.dispatchEvent(new Event('change'));
    await settle(el);
    expect(el.value).toBe('rgb(46, 111, 175)');
    const boxes = shAll(el, '.box') as HTMLInputElement[];
    expect(boxes.map((b) => b.getAttribute('aria-label'))).toEqual(['Red', 'Green', 'Blue']);
    await userEvent.clear(boxes[0]); await userEvent.type(boxes[0], '200'); await userEvent.keyboard('{Enter}');
    await settle(el);
    expect(el.value).toBe('rgb(200, 111, 175)');
    select.value = 'hsl'; select.dispatchEvent(new Event('change'));
    await settle(el);
    expect(el.value).toMatch(/^hsl\(/);
  });
  it('formats="hex" hides the menu; a bad hex shows as invalid and changes nothing', async () => {
    const el = await mount<CmColorPicker>('<cm-color-picker value="#2e6faf" formats="hex"></cm-color-picker>');
    expect(sh(el, 'select')).toBeNull();
    const box = sh(el, '.box') as HTMLInputElement;
    await userEvent.clear(box); await userEvent.type(box, '#zz'); await userEvent.keyboard('{Enter}');
    await settle(el);
    expect(el.value).toBe('#2e6faf');
    expect(box.getAttribute('aria-invalid')).toBe('true');
  });
  it('alpha adds an opacity slider and box; see-through colours get #rrggbbaa / rgba()', async () => {
    const el = await mount<CmColorPicker>('<cm-color-picker value="#2e6faf" alpha></cm-color-picker>');
    const ranges = shAll(el, 'input[type=range]') as HTMLInputElement[];
    expect(ranges.map((r) => r.getAttribute('aria-label'))).toEqual(['Hue', 'Opacity']);
    ranges[1].value = '50'; ranges[1].dispatchEvent(new Event('input')); ranges[1].dispatchEvent(new Event('change'));
    await settle(el);
    expect(el.value).toBe('#2e6faf80');
    (sh(el, 'select') as HTMLSelectElement).value = 'rgb';
    sh(el, 'select').dispatchEvent(new Event('change'));
    await settle(el);
    expect(el.value).toBe('rgba(46, 111, 175, 0.5)');
    const opacityBox = shAll(el, '.box').find((b) => b.getAttribute('aria-label') === 'Opacity') as HTMLInputElement;
    expect(opacityBox.value).toBe('50');
  });
  it('without alpha, an rgba value is shown opaque', async () => {
    const el = await mount<CmColorPicker>('<cm-color-picker value="rgba(46, 111, 175, 0.5)"></cm-color-picker>');
    expect(shAll(el, 'input[type=range]').length).toBe(1);
    expect(el.format).toBe('rgb');
    expect((sh(el, 'select') as HTMLSelectElement).value).toBe('rgb');
  });
  it('gradient: tabs switch to a two-stop linear gradient; the bar adds stops, Delete removes them, type and angle change', async () => {
    const el = await mount<CmColorPicker>('<cm-color-picker value="#2e6faf" gradient></cm-color-picker>');
    const tabs = shAll(el, '.tabs [role=radio]');
    expect(tabs.map((t) => t.textContent!.trim())).toEqual(['Solid', 'Gradient']);
    tabs[1].click();
    await settle(el);
    expect(el.value).toMatch(/^linear-gradient\(90deg, #2e6faf 0%, #[0-9a-f]{6} 100%\)$/);
    expect(shAll(el, '.handle').length).toBe(2);
    const bar = sh(el, '.bar');
    const r = bar.getBoundingClientRect();
    bar.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: r.left + r.width / 2, clientY: r.top + 4 }));
    await settle(el);
    expect(parseGradient(el.value)!.stops.length).toBe(3);
    expect(el.shadowRoot!.activeElement).toBe(shAll(el, '.handle')[2]);
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
    await settle(el);
    expect(parseGradient(el.value)!.stops.map((s) => s.position)).toEqual([0, 60, 100]);
    await userEvent.keyboard('{Delete}');
    await settle(el);
    expect(parseGradient(el.value)!.stops.length).toBe(2);
    const type = sh(el, 'select') as HTMLSelectElement;
    type.value = 'radial'; type.dispatchEvent(new Event('change'));
    await settle(el);
    expect(el.value).toMatch(/^radial-gradient\(circle, /);
    type.value = 'linear'; type.dispatchEvent(new Event('change'));
    await settle(el);
    const angle = shAll(el, '.box').find((b) => b.getAttribute('aria-label') === 'Angle') as HTMLInputElement;
    await userEvent.clear(angle); await userEvent.type(angle, '45'); await userEvent.keyboard('{Tab}');
    await settle(el);
    expect(el.value).toMatch(/^linear-gradient\(45deg, /);
    shAll(el, '.tabs [role=radio]')[0].click();
    await settle(el);
    expect(el.value).toMatch(/^#[0-9a-f]{6}$/);
  });
  it('reads a gradient value and edits the selected stop with the square', async () => {
    const el = await mount<CmColorPicker>('<cm-color-picker gradient value="linear-gradient(to right, #ff0000, #0000ff)"></cm-color-picker>');
    expect(shAll(el, '.tabs [role=radio]')[1].getAttribute('aria-checked')).toBe('true');
    const typeSel = await mount<CmColorPicker>('<cm-color-picker gradient value="radial-gradient(circle, #fff 0%, #000 100%)"></cm-color-picker>');
    expect((sh(typeSel, 'select') as HTMLSelectElement).value).toBe('radial');
    document.body.append(el);
    await settle(el);
    const handles = shAll(el, '.handle');
    expect(handles[1].getAttribute('aria-label')).toBe('Stop 2, #0000ff at 100%');
    handles[1].focus();
    await settle(el);
    sh(el, '.area').focus();
    await userEvent.keyboard('{PageDown}');
    await settle(el);
    expect(el.value).toBe('linear-gradient(90deg, #ff0000 0%, #000000 100%)');
  });
  it('brand colours and recents come from the source; custom colours are added to recents, palette picks are not', async () => {
    const added: string[] = [];
    let recents = ['#111111'];
    const source: ColorSource = {
      brandColors: async () => [{ value: '#0a7cff', name: 'Primary' }, '#ff5a1f'],
      recentColors: async () => recents,
      addRecentColor: async (c) => { added.push(c); recents = pushRecent(recents, c); return recents; },
    };
    document.body.innerHTML = '<cm-color-picker value="#2e6faf"></cm-color-picker>';
    const el = document.querySelector('cm-color-picker') as CmColorPicker;
    el.source = source;
    await settle(el);
    await new Promise((r) => setTimeout(r, 0));
    await settle(el);
    const groups = shAll(el, '.group');
    expect(groups.map((g) => g.querySelector('h3')!.textContent)).toEqual(['Brand colours', 'Recent', 'Palette']);
    expect(groups[0].querySelectorAll('.sw')[0].getAttribute('aria-label')).toBe('Primary, #0a7cff');
    const recentEvents: string[][] = [];
    el.addEventListener('cm-recent-change', (e) => recentEvents.push((e as CustomEvent).detail.colors));
    // A palette colour: no recent.
    (groups[2].querySelectorAll('.sw')[3] as HTMLElement).click();
    await settle(el);
    expect(el.value).toBe('#de0000');
    expect(added).toEqual([]);
    expect(groups[2].querySelectorAll('.sw')[3].getAttribute('aria-pressed')).toBe('true');
    // A brand colour: no recent either.
    (shAll(el, '.group')[0].querySelector('.sw') as HTMLElement).click();
    await settle(el);
    expect(el.value).toBe('#0a7cff');
    expect(added).toEqual([]);
    // A custom colour: recent.
    sh(el, '.area').focus();
    await userEvent.keyboard('{ArrowDown}');
    await settle(el);
    expect(added).toEqual([el.value]);
    expect(recentEvents.at(-1)![0]).toBe(el.value);
    await new Promise((r) => setTimeout(r, 0));
    await settle(el);
    expect(shAll(el, '.group')[1].querySelectorAll('.sw').length).toBe(2);
  });
  it('brand-colors and recent-colors attributes win over the source; a failing source shows no lists', async () => {
    const source: ColorSource = { brandColors: async () => { throw new Error('offline'); }, recentColors: async () => { throw new Error('offline'); } };
    document.body.innerHTML = `<cm-color-picker brand-colors='[{"value":"#123456","name":"Ink"}]' swatches='[]'></cm-color-picker>`;
    const el = document.querySelector('cm-color-picker') as CmColorPicker;
    el.source = source;
    await settle(el);
    await new Promise((r) => setTimeout(r, 0));
    await settle(el);
    expect(shAll(el, '.group').map((g) => g.querySelector('h3')!.textContent)).toEqual(['Brand colours']);
  });
  it('recent-key keeps recents in this browser across pickers', async () => {
    const el = await mount<CmColorPicker>('<cm-color-picker value="#2e6faf" recent-key="tags"></cm-color-picker>');
    sh(el, '.area').focus();
    await userEvent.keyboard('{ArrowLeft}');
    await settle(el);
    const chosen = el.value;
    await new Promise((r) => setTimeout(r, 0));
    const again = await mount<CmColorPicker>('<cm-color-picker recent-key="tags"></cm-color-picker>');
    await new Promise((r) => setTimeout(r, 0));
    await settle(again);
    const recent = shAll(again, '.group').find((g) => g.querySelector('h3')!.textContent === 'Recent')!;
    expect(recent.querySelector('.sw')!.getAttribute('aria-label')).toBe(chosen);
  });
  it('recents with opacity or gradients are left out when the picker cannot show them', async () => {
    const el = await mount<CmColorPicker>(`<cm-color-picker recent-colors='["#2e6faf80","linear-gradient(to right, #fff, #000)","#2e6faf"]'></cm-color-picker>`);
    const recent = shAll(el, '.group').find((g) => g.querySelector('h3')!.textContent === 'Recent')!;
    expect([...recent.querySelectorAll('.sw')].map((s) => s.getAttribute('aria-label'))).toEqual(['#2e6faf']);
  });
  it('every built-in string is translatable', () => {
    const d = getDefaultStrings();
    expect(d.colorPicker.brand).toBe('Brand colours');
    expect(d.colorPicker.stop).toBe('Stop {n}, {color} at {position}%');
  });
  it('right to left: Right lowers saturation and the thumb sits from the right', async () => {
    document.body.innerHTML = '<div dir="rtl" style="width:320px"><cm-color-picker value="#2e6faf"></cm-color-picker></div>';
    const el = document.querySelector('cm-color-picker') as CmColorPicker;
    await settle(el);
    const before = rgbToHsv(parseColor(el.value)!).s;
    sh(el, '.area').focus();
    await userEvent.keyboard('{ArrowRight}');
    await settle(el);
    expect(rgbToHsv(parseColor(el.value)!).s).toBeLessThan(before);
    const area = sh(el, '.area').getBoundingClientRect(), thumb = sh(el, '.thumb').getBoundingClientRect();
    expect(thumb.left + thumb.width / 2 - area.left).toBeLessThan(area.width / 2);
  });
});

describe('cm-color-field with the picker panel', () => {
  it('picker opens the Commmerce picker in the top layer; Escape closes it and returns focus', async () => {
    const el = await mount<CmColorField>('<cm-color-field label="Tag colour" value="#2e6faf" picker></cm-color-field>');
    const btn = sh(el, 'button.pick');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.getAttribute('aria-label')).toBe('Choose a custom colour for Tag colour');
    btn.click();
    await settle(el);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    const pop = sh(el, '.pop');
    expect(pop.matches(':popover-open')).toBe(true);
    const picker = pop.querySelector('cm-color-picker') as CmColorPicker;
    await settle(picker);
    expect(picker.value).toBe('#2e6faf');
    expect(picker.allowedFormats).toEqual(['hex']);
    await new Promise((r) => setTimeout(r, 50));
    expect(picker.shadowRoot!.activeElement).toBe(sh(picker, '.area'));
    await userEvent.keyboard('{Escape}');
    await settle(el);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(el.shadowRoot!.activeElement).toBe(btn);
  });
  it('a colour picked in the panel becomes the field value and form value; events reach the page once', async () => {
    document.body.innerHTML = '<form><cm-color-field name="c" label="Colour" value="#2e6faf" picker></cm-color-field></form>';
    const el = document.querySelector('cm-color-field') as CmColorField;
    await settle(el);
    const log = track(el, 'input', 'change');
    sh(el, 'button.pick').click();
    await settle(el);
    const picker = sh(el, 'cm-color-picker') as unknown as CmColorPicker;
    await settle(picker);
    (picker.shadowRoot!.querySelectorAll('.group .sw')[3] as HTMLElement).click();
    await settle(el);
    expect(el.value).toBe('#de0000');
    expect(new FormData(document.querySelector('form')!).get('c')).toBe('#de0000');
    expect(log).toEqual(['input', 'change']);
    expect((sh(el, '.input') as HTMLInputElement).value).toBe('#de0000');
  });
  it('clicking outside closes the panel', async () => {
    const el = await mount<CmColorField>('<cm-color-field label="Colour" picker></cm-color-field>');
    sh(el, 'button.pick').click();
    await settle(el);
    await userEvent.click(document.getElementById('away')!);
    await settle(el);
    expect(sh(el, 'button.pick').getAttribute('aria-expanded')).toBe('false');
  });
  it('alpha and formats let the box take rgba and #rrggbbaa; a plain field still refuses them', async () => {
    const el = await mount<CmColorField>('<cm-color-field label="Colour" alpha formats="hex rgb hsl" picker></cm-color-field>');
    const box = sh(el, '.input') as HTMLInputElement;
    expect(box.getAttribute('aria-label')).toBe('Colour, colour value');
    await userEvent.type(box, 'rgba(46, 111, 175, 0.5)'); await userEvent.keyboard('{Enter}');
    await settle(el);
    expect(el.value).toBe('rgba(46, 111, 175, 0.5)');
    expect(el.checkValidity()).toBe(true);
    sh(el, 'button.pick').click();
    await settle(el);
    const picker = sh(el, 'cm-color-picker') as unknown as CmColorPicker;
    await settle(picker);
    expect(picker.format).toBe('rgb');
    expect((sh(picker, 'select') as HTMLSelectElement).value).toBe('rgb');
    expect(shAll(picker, 'input[type=range]').length).toBe(2);
    const plain = await mount<CmColorField>('<cm-color-field label="Colour"></cm-color-field>');
    const pbox = sh(plain, '.input') as HTMLInputElement;
    expect(pbox.getAttribute('maxlength')).toBe('7');
    plain.value = 'rgb(1, 2, 3)';
    await settle(plain);
    expect(plain.checkValidity()).toBe(false);
  });
  it('gradient fields keep a gradient value and show it in the preview', async () => {
    const el = await mount<CmColorField>('<cm-color-field label="Banner" gradient picker value="linear-gradient(90deg, #2e6faf 0%, #de0000 100%)"></cm-color-field>');
    expect(el.checkValidity()).toBe(true);
    expect(sh(el, '.pick .fill').style.background).toContain('linear-gradient');
  });
  it('brand colours and source pass through to the panel', async () => {
    const el = await mount<CmColorField>(`<cm-color-field label="Colour" picker brand-colors='[{"value":"#0a7cff","name":"Primary"}]'></cm-color-field>`);
    sh(el, 'button.pick').click();
    await settle(el);
    const picker = sh(el, 'cm-color-picker') as unknown as CmColorPicker;
    await settle(picker);
    expect(picker.shadowRoot!.querySelector('.group h3')!.textContent).toBe('Brand colours');
  });
});
