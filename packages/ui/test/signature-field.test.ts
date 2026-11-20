// 1.4: cm-signature-field (GitHub #26, CRM e-sign "Sign now").
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { userEvent } from 'vitest/browser';
import '@commmerce/tokens/tokens.css';
import '@commmerce/tokens/fonts.css';
import '../src/index.js';
import type { CmSignatureField } from '../src/index.js';

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sh = <T extends Element = HTMLElement>(el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as T;

const mount = async (markup: string, width = 480, attrs = ''): Promise<CmSignatureField> => {
  document.body.innerHTML = `<div id="box" ${attrs} style="width:${width}px;background:var(--cm-bg-surface)">${markup}</div>`;
  const el = document.querySelector('cm-signature-field') as CmSignatureField;
  await el.updateComplete;
  await nextFrame(); await nextFrame();
  return el;
};

/** Draws a stroke with synthetic pointer events; points are fractions of the canvas's width and height. */
const stroke = async (el: CmSignatureField, pts: Array<[number, number]>, opts: { pointerType?: string; pressure?: number } = {}) => {
  const canvas = sh<HTMLCanvasElement>(el, 'canvas');
  const r = canvas.getBoundingClientRect();
  const fire = (type: string, [x, y]: [number, number]) => canvas.dispatchEvent(new PointerEvent(type, {
    pointerId: 7, pointerType: opts.pointerType ?? 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1,
    pressure: type === 'pointerup' ? 0 : opts.pressure ?? 0.5, clientX: r.left + x * r.width, clientY: r.top + y * r.height,
    bubbles: true, cancelable: true, composed: true,
  }));
  fire('pointerdown', pts[0]);
  for (const p of pts.slice(1)) fire('pointermove', p);
  fire('pointerup', pts[pts.length - 1]);
  await nextFrame(); await nextFrame();
  await el.updateComplete;
};

const line = (x0: number, y0: number, x1: number, y1: number, n = 12): Array<[number, number]> =>
  Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);

/** Ink on a canvas: count of non-transparent pixels and their bounding box as fractions of the canvas. */
const ink = (c: HTMLCanvasElement) => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  let n = 0, l = 1, t = 1, r = 0, b = 0, dark = 0, light = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4;
    if (d[i + 3] > 128) {
      n++;
      l = Math.min(l, x / c.width); r = Math.max(r, x / c.width); t = Math.min(t, y / c.height); b = Math.max(b, y / c.height);
      const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
      if (lum < 60) dark++; else if (lum > 195) light++;
    }
  }
  return { n, l, t, r, b, dark, light };
};

const decode = async (url: string) => {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d')!.drawImage(img, 0, 0);
  return c;
};

beforeAll(async () => {
  const end = Date.now() + 10_000;
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-20') && Date.now() < end) await sleep(20);
});
beforeEach(() => { document.body.innerHTML = ''; });

describe('cm-signature-field: drawing', () => {
  it('renders a labelled tablist, a 3:1 pad, a baseline and the Sign here hint, empty', async () => {
    const el = await mount('<cm-signature-field label="Your signature" name="sig"></cm-signature-field>');
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(2);
    expect([...tabs].map((t) => t.textContent!.trim())).toEqual(['Draw', 'Type']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    const list = sh(el, '[role="tablist"]');
    expect(sh(el, `#${list.getAttribute('aria-labelledby')}`).textContent).toContain('Your signature');
    const pad = sh(el, '.panel-draw .pad').getBoundingClientRect();
    expect(pad.width).toBeGreaterThan(470);
    expect(pad.width / pad.height).toBeCloseTo(3, 1);
    expect(sh(el, '.line')).toBeTruthy();
    expect(sh(el, '.here').textContent).toBe('Sign here');
    const canvas = sh<HTMLCanvasElement>(el, 'canvas');
    expect(getComputedStyle(canvas).touchAction).toBe('none');
    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toBe('Signature drawing area');
    const described = canvas.getAttribute('aria-describedby')!.split(' ').map((id) => sh(el, `#${id}`)?.textContent).join(' ');
    expect(described).toContain('To sign with the keyboard, choose Type.');
    expect(el.empty).toBe(true);
    expect(el.value).toBe('');
    expect(el.toDataURL()).toBe('');
    expect(await el.toBlob()).toBeNull();
  });

  it('a pointer stroke puts ink on the canvas, fires cm-change and change once, and gives a cropped 2x PNG', async () => {
    const el = await mount('<cm-signature-field label="Signature"></cm-signature-field>', 600);
    const events: string[] = [];
    let detail: any;
    el.addEventListener('cm-change', (e) => { events.push('cm-change'); detail = (e as CustomEvent).detail; });
    el.addEventListener('change', () => events.push('change'));
    await stroke(el, line(0.2, 0.4, 0.4, 0.6));
    const canvas = sh<HTMLCanvasElement>(el, 'canvas');
    const onScreen = ink(canvas);
    expect(onScreen.n).toBeGreaterThan(50);
    expect(onScreen.l).toBeGreaterThan(0.15);
    expect(onScreen.r).toBeLessThan(0.45);
    expect(events).toEqual(['cm-change', 'change']);
    expect(detail).toMatchObject({ empty: false, mode: 'draw' });
    expect(detail.value).toBe(el.value);
    expect(el.empty).toBe(false);
    expect(el.value.startsWith('data:image/png;base64,')).toBe(true);
    expect(sh(el, '.here')).toBeNull();
    expect(canvas.getAttribute('aria-label')).toBe('Signature drawing area, signed');

    // Cropped to the ink: the stroke spans 20% of the width and 0.2/3 of the height... plus padding, at 2x.
    const png = await decode(el.value);
    const padW = canvas.clientWidth;
    expect(png.width).toBeGreaterThan(padW * 2 * 0.2);
    expect(png.width).toBeLessThan(padW * 2 * 0.3);
    expect(png.height).toBeLessThan((padW / 3) * 2 * 0.45);
    const p = ink(png);
    // Transparent padding all round, ink inside.
    expect(p.l).toBeGreaterThan(0);
    expect(p.t).toBeGreaterThan(0);
    expect(p.r).toBeLessThan(1);
    expect(p.b).toBeLessThan(1);
    const corner = png.getContext('2d')!.getImageData(0, 0, 1, 1).data;
    expect(corner[3]).toBe(0);
    const blob = await el.toBlob();
    expect(blob?.type).toBe('image/png');
    expect(blob!.size).toBeGreaterThan(100);
  });

  it('a single tap leaves a dot; a pen stroke with more pressure is thicker', async () => {
    const el = await mount('<cm-signature-field></cm-signature-field>', 600);
    await stroke(el, [[0.5, 0.5]]);
    expect(ink(sh<HTMLCanvasElement>(el, 'canvas')).n).toBeGreaterThan(4);
    el.clear(); await nextFrame(); await nextFrame();
    await stroke(el, line(0.1, 0.5, 0.9, 0.5), { pointerType: 'pen', pressure: 0.1 });
    const light = ink(sh<HTMLCanvasElement>(el, 'canvas')).n;
    el.clear(); await nextFrame(); await nextFrame();
    await stroke(el, line(0.1, 0.5, 0.9, 0.5), { pointerType: 'pen', pressure: 1 });
    const heavy = ink(sh<HTMLCanvasElement>(el, 'canvas')).n;
    expect(heavy).toBeGreaterThan(light * 1.5);
  });

  it('ignores secondary mouse buttons and a second finger while a stroke is in progress', async () => {
    const el = await mount('<cm-signature-field></cm-signature-field>');
    const canvas = sh<HTMLCanvasElement>(el, 'canvas');
    const r = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 2, clientX: r.left + 20, clientY: r.top + 20, bubbles: true }));
    canvas.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 2, clientX: r.left + 20, clientY: r.top + 20, bubbles: true }));
    await nextFrame(); await el.updateComplete;
    expect(el.empty).toBe(true);
    canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, pointerType: 'touch', isPrimary: false, clientX: r.left + 20, clientY: r.top + 20, bubbles: true }));
    await nextFrame(); await el.updateComplete;
    expect(el.empty).toBe(true);
  });

  it('Undo removes the last stroke, Clear removes all; both announce and fire events; buttons follow the state', async () => {
    const el = await mount('<cm-signature-field label="Signature"></cm-signature-field>', 600);
    const undoBtn = () => el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.act')[0];
    const clearBtn = () => el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.act')[1];
    expect(undoBtn().disabled).toBe(true);
    expect(clearBtn().disabled).toBe(true);
    expect(undoBtn().getAttribute('aria-label')).toBe('Undo last stroke');
    expect(clearBtn().getAttribute('aria-label')).toBe('Clear signature');
    await stroke(el, line(0.1, 0.5, 0.3, 0.5));
    const one = el.value;
    await stroke(el, line(0.5, 0.3, 0.8, 0.6));
    const two = el.value;
    expect(two).not.toBe(one);
    expect(undoBtn().disabled).toBe(false);
    let changes = 0;
    el.addEventListener('cm-change', () => changes++);

    undoBtn().click();
    await el.updateComplete; await el.updateComplete; await nextFrame(); await nextFrame();
    expect(el.value).toBe(one);
    expect(changes).toBe(1);
    expect(sh(el, '[role="status"]').textContent).toBe('Last stroke removed');
    const r = ink(sh<HTMLCanvasElement>(el, 'canvas'));
    expect(r.r).toBeLessThan(0.35); // the second stroke is gone from the screen

    await stroke(el, line(0.5, 0.3, 0.8, 0.6));
    clearBtn().focus();
    clearBtn().click();
    await el.updateComplete; await el.updateComplete; await nextFrame(); await nextFrame();
    expect(el.empty).toBe(true);
    expect(el.value).toBe('');
    expect(changes).toBe(3);
    expect(ink(sh<HTMLCanvasElement>(el, 'canvas')).n).toBe(0);
    expect(sh(el, '[role="status"]').textContent).toBe('Signature cleared');
    expect(clearBtn().disabled).toBe(true);
    // Focus doesn't fall to the page when the pressed button turns disabled.
    expect(el.shadowRoot!.activeElement?.getAttribute('role')).toBe('tab');
  });

  it('exports dark ink on transparent in the dark theme, while the screen ink is light', async () => {
    const el = await mount('<cm-signature-field></cm-signature-field>', 600, 'data-cm-theme="dark"');
    await stroke(el, line(0.1, 0.5, 0.9, 0.5));
    await stroke(el, line(0.1, 0.55, 0.9, 0.55));
    const screen = ink(sh<HTMLCanvasElement>(el, 'canvas'));
    expect(screen.light).toBeGreaterThan(screen.dark);
    const png = ink(await decode(el.toDataURL()));
    expect(png.dark).toBeGreaterThan(png.light * 10);
  });

  it('resizing re-draws the strokes at the new size, in the same place (not a stretched bitmap)', async () => {
    const el = await mount('<cm-signature-field></cm-signature-field>', 600);
    await stroke(el, line(0.2, 0.3, 0.6, 0.7));
    const canvas = sh<HTMLCanvasElement>(el, 'canvas');
    const before = ink(canvas);
    const w1 = canvas.width;
    (document.getElementById('box') as HTMLElement).style.width = '320px';
    await sleep(50); await nextFrame(); await nextFrame();
    expect(canvas.width).toBeLessThan(w1);
    expect(canvas.width).toBe(Math.round(canvas.clientWidth * devicePixelRatio));
    const after = ink(canvas);
    expect(after.n).toBeGreaterThan(20);
    for (const k of ['l', 't', 'r', 'b'] as const) expect(Math.abs(after[k] - before[k]), k).toBeLessThan(0.03);
    expect(el.empty).toBe(false);
  });

  it('keeps drawing and resizing after being moved to another place in the page', async () => {
    const el = await mount('<cm-signature-field></cm-signature-field>', 600);
    await stroke(el, line(0.2, 0.4, 0.6, 0.6));
    const other = document.createElement('div');
    other.style.width = '400px';
    document.body.append(other);
    other.append(el);
    await sleep(50); await nextFrame(); await nextFrame();
    const canvas = sh<HTMLCanvasElement>(el, 'canvas');
    expect(canvas.clientWidth).toBeLessThan(401);
    expect(canvas.width).toBe(Math.round(canvas.clientWidth * devicePixelRatio));
    expect(ink(canvas).n).toBeGreaterThan(20);
  });

  it('fits a 320px screen without sideways scrolling', async () => {
    const el = await mount('<cm-signature-field label="Signature" help-text="By signing you accept the quote."></cm-signature-field>', 288);
    expect(el.scrollWidth).toBeLessThanOrEqual(288);
    expect(sh(el, '.field').scrollWidth).toBeLessThanOrEqual(288);
    const pad = sh(el, '.panel-draw .pad').getBoundingClientRect();
    expect(Math.round(pad.width)).toBe(288);
    for (const b of el.shadowRoot!.querySelectorAll('button.act, [role="tab"]')) {
      expect(b.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
    }
  });

  it('a value set from outside shows the saved signature in Draw; empty string clears', async () => {
    const src = await mount('<cm-signature-field></cm-signature-field>', 600);
    await stroke(src, line(0.2, 0.4, 0.7, 0.5));
    const saved = src.value;
    const el = await mount('<cm-signature-field></cm-signature-field>', 600);
    el.mode = 'type';
    el.value = saved;
    await el.updateComplete; await sleep(30); await nextFrame(); await nextFrame();
    expect(el.mode).toBe('draw');
    expect(el.empty).toBe(false);
    expect(el.value).toBe(saved);
    expect(ink(sh<HTMLCanvasElement>(el, 'canvas')).n).toBeGreaterThan(20);
    el.value = '';
    await el.updateComplete; await nextFrame(); await nextFrame();
    expect(el.empty).toBe(true);
    expect(ink(sh<HTMLCanvasElement>(el, 'canvas')).n).toBe(0);
  });
});

describe('cm-signature-field: typing', () => {
  it('the Type tab shows a named text box in the signature font; typing gives a PNG and a debounced change', async () => {
    const el = await mount('<cm-signature-field label="Signature"></cm-signature-field>', 600);
    const typeTab = el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"]')[1];
    typeTab.click();
    await el.updateComplete; await nextFrame();
    expect(el.mode).toBe('type');
    expect(typeTab.getAttribute('aria-selected')).toBe('true');
    expect(sh(el, '.panel-draw').hidden).toBe(true);
    expect(sh(el, '.panel-type').hidden).toBe(false);
    expect(sh(el, '.panel-type').getAttribute('aria-labelledby')).toBe(typeTab.id);
    expect(el.shadowRoot!.querySelectorAll('button.act')).toHaveLength(1); // no Undo while typing
    const input = sh<HTMLInputElement>(el, 'input.typed');
    expect(input.getAttribute('aria-label')).toBe('Signature: Type your full name');
    expect(getComputedStyle(input).fontFamily).toContain('Dancing Script');
    await document.fonts.load('40px "Dancing Script"', 'Asha');
    expect(document.fonts.check('40px "Dancing Script"', 'Asha')).toBe(true);

    let changes = 0;
    el.addEventListener('change', () => changes++);
    await userEvent.type(input, 'Asha Rao');
    expect(el.typedName).toBe('Asha Rao');
    expect(el.empty).toBe(false);
    expect(el.value.startsWith('data:image/png;base64,')).toBe(true); // the form value never lags
    expect(changes).toBe(0);
    await sleep(500);
    expect(changes).toBe(1);
    const png = await decode(el.value);
    const p = ink(png);
    expect(p.n).toBeGreaterThan(100);
    expect(p.dark).toBeGreaterThan(p.light);
    expect(png.width).toBeGreaterThan(png.height);
  });

  it('switching tabs keeps each mode\'s signature and changes the value', async () => {
    const el = await mount('<cm-signature-field typed-name="Asha Rao"></cm-signature-field>', 600);
    expect(el.value).toBe(''); // Draw is selected and empty
    await stroke(el, line(0.2, 0.4, 0.6, 0.6));
    const drawn = el.value;
    let changes = 0;
    el.addEventListener('cm-change', () => changes++);
    el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"]')[1].click();
    await el.updateComplete; await el.updateComplete; await nextFrame();
    expect(el.value).not.toBe(drawn);
    expect(el.value).not.toBe('');
    expect(changes).toBe(1);
    el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"]')[0].click();
    await el.updateComplete; await el.updateComplete; await nextFrame(); await nextFrame();
    expect(el.value).toBe(drawn);
    expect(ink(sh<HTMLCanvasElement>(el, 'canvas')).n).toBeGreaterThan(20);
  });

  it('tabs: arrow keys, Home and End move and select; one tab stop', async () => {
    const el = await mount('<cm-signature-field label="Signature"></cm-signature-field>');
    const tabs = () => [...el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"]')];
    expect(tabs().map((t) => t.tabIndex)).toEqual([0, -1]);
    tabs()[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    await el.updateComplete; await el.updateComplete;
    expect(el.mode).toBe('type');
    expect(el.shadowRoot!.activeElement).toBe(tabs()[1]);
    expect(tabs().map((t) => t.tabIndex)).toEqual([-1, 0]);
    await userEvent.keyboard('{Home}');
    await el.updateComplete; await el.updateComplete;
    expect(el.mode).toBe('draw');
    await userEvent.keyboard('{End}');
    await el.updateComplete; await el.updateComplete;
    expect(el.mode).toBe('type');
    expect(tabs()[1].getAttribute('aria-controls')).toBe(sh(el, '.panel-type').id);
  });
});

describe('cm-signature-field: forms', () => {
  it('required blocks submission until signed; submits the data URL under name; reset clears', async () => {
    document.body.innerHTML = `<form style="width:500px"><cm-signature-field name="signature" label="Signature" required></cm-signature-field></form>`;
    const form = document.querySelector('form')!;
    const el = document.querySelector('cm-signature-field') as CmSignatureField;
    await el.updateComplete; await nextFrame(); await nextFrame();
    expect(form.checkValidity()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validationMessage).toBe('Please sign here.');
    expect(new FormData(form).get('signature')).toBeNull();
    expect(sh(el, '.req')).toBeTruthy();
    await stroke(el, line(0.2, 0.4, 0.6, 0.6));
    expect(form.checkValidity()).toBe(true);
    expect(String(new FormData(form).get('signature'))).toMatch(/^data:image\/png;base64,/);
    form.reset();
    await el.updateComplete; await nextFrame(); await nextFrame();
    expect(el.empty).toBe(true);
    expect(el.value).toBe('');
    expect(form.checkValidity()).toBe(false);
    expect(ink(sh<HTMLCanvasElement>(el, 'canvas')).n).toBe(0);
  });

  it('required in Type mode: valid once a name is typed; error sets a custom error', async () => {
    const el = await mount('<cm-signature-field name="s" required mode="type"></cm-signature-field>');
    expect(el.checkValidity()).toBe(false);
    el.typedName = 'R K';
    sh<HTMLInputElement>(el, 'input.typed').value = 'R K';
    sh<HTMLInputElement>(el, 'input.typed').dispatchEvent(new Event('input', { bubbles: true }));
    await el.updateComplete;
    expect(el.checkValidity()).toBe(true);
    el.error = 'Sign with your legal name';
    await el.updateComplete;
    expect(el.validity.customError).toBe(true);
    expect(sh(el, '[role="alert"]').textContent).toBe('Sign with your legal name');
    expect(sh(el, 'input.typed').getAttribute('aria-invalid')).toBe('true');
  });

  it('a disabled fieldset disables the tabs, buttons, box and drawing', async () => {
    document.body.innerHTML = `<form style="width:500px"><fieldset disabled><cm-signature-field name="s"></cm-signature-field></fieldset></form>`;
    const el = document.querySelector('cm-signature-field') as CmSignatureField;
    await el.updateComplete; await nextFrame(); await nextFrame();
    expect(el.disabled).toBe(true);
    await el.updateComplete;
    for (const t of el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[role="tab"]')) expect(t.disabled).toBe(true);
    expect(sh<HTMLInputElement>(el, 'input.typed').disabled).toBe(true);
    await stroke(el, line(0.2, 0.4, 0.6, 0.6));
    expect(el.empty).toBe(true);
  });
});
