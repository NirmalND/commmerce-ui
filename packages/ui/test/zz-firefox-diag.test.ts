// TEMPORARY (issue #2): records focus and hover behaviour per browser. Removed before merge.
import { describe, it, beforeAll } from 'vitest';
import { page, userEvent, server } from 'vitest/browser';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';

const B = server.browser;
const log = (...a: unknown[]) => console.log(`[diag ${B}]`, ...a);
const frames = (n = 2) => new Promise((r) => { const f = () => (--n ? requestAnimationFrame(f) : r(null)); requestAnimationFrame(f); });
const deep = () => { let a: Element | null = document.activeElement; while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement; return a; };
const name = (e: Element | null | undefined) => !e ? String(e) : `${e.localName}${e.id ? '#' + e.id : ''}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().replace(/\s+/g, '.') : ''}`;
const state = (label: string) => log(label, 'active=', name(document.activeElement), 'deep=', name(deep()), 'hasFocus=', document.hasFocus());

beforeAll(async () => {
  const end = Date.now() + 10_000;
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-24') && Date.now() < end) await new Promise((r) => setTimeout(r, 20));
  await page.viewport(1280, 800);
});

describe('diag', () => {
  it('palette close', async () => {
    document.body.innerHTML = '<button id="opener">Open</button><cm-command-palette></cm-command-palette>';
    const el = document.querySelector('cm-command-palette') as any;
    el.actions = [{ label: 'A', items: [{ title: 'x', value: 'x' }] }];
    await el.updateComplete;
    const events: string[] = [];
    const t0 = performance.now();
    for (const t of ['focusin', 'focusout', 'blur', 'focus']) {
      document.addEventListener(t, (e) => events.push(`${Math.round(performance.now() - t0)}ms ${t} ${name(e.composedPath()[0] as Element)} rel=${name((e as FocusEvent).relatedTarget as Element)}`), true);
    }
    const opener = document.getElementById('opener')!;
    opener.focus(); state('before show');
    el.show(); await el.updateComplete; state('after show');
    el.close(); state('sync after close()');
    await el.updateComplete; state('after updateComplete');
    await new Promise((r) => setTimeout(r)); state('after setTimeout');
    await frames(); state('after 2 frames');
    await new Promise((r) => setTimeout(r, 100)); state('after 100ms');
    log('events', JSON.stringify(events));
    log('opener inert?', (opener as any).inert, 'matches :focus', opener.matches(':focus'));
  });

  it('palette close (modal for comparison)', async () => {
    document.body.innerHTML = '<button id="opener">Open</button><cm-modal heading="M"><p>x</p></cm-modal>';
    const el = document.querySelector('cm-modal') as any;
    await el.updateComplete;
    document.getElementById('opener')!.focus();
    el.show(); await el.updateComplete; state('modal after show');
    el.close(); await el.updateComplete; state('modal after close');
    await new Promise((r) => setTimeout(r)); await frames(); state('modal after settle');
  });

  it('palette: what moves focus', async () => {
    document.body.innerHTML = '<button id="opener">Open</button><cm-command-palette></cm-command-palette>';
    const el = document.querySelector('cm-command-palette') as any;
    el.actions = [{ label: 'A', items: [{ title: 'x', value: 'x' }] }];
    await el.updateComplete;
    const opener = document.getElementById('opener')!;
    opener.focus();
    el.show(); await el.updateComplete;
    const input = el.shadowRoot.querySelector('input');
    // Variant 1: blur the input before closing.
    input.blur(); state('after input.blur()');
    el.close(); await el.updateComplete; await new Promise((r) => setTimeout(r)); await frames(); state('variant blur-first settled');
    // Variant 2: no select().
    opener.focus(); el.show(); await el.updateComplete;
    input.setSelectionRange(0, 0);
    el.close(); await el.updateComplete; await new Promise((r) => setTimeout(r)); await frames(); state('variant no-selection settled');
    // Variant 3: focus the opener again after a frame.
    opener.focus(); el.show(); await el.updateComplete;
    el.close(); await el.updateComplete; await frames(1); opener.focus(); await new Promise((r) => setTimeout(r)); await frames(); state('variant refocus-after-frame settled');
  });

  it('photo remove', async () => {
    document.body.innerHTML = '<cm-file-upload variant="photo" label="Shop front photo"></cm-file-upload>';
    const el = document.querySelector('cm-file-upload') as any;
    el.addFiles([new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg' })]);
    await new Promise((r) => setTimeout(r)); await el.updateComplete; await frames();
    const events: string[] = [];
    for (const t of ['focusin', 'focusout']) el.shadowRoot.addEventListener(t, (e: Event) => events.push(`${t} ${name(e.composedPath()[0] as Element)}`), true);
    (el.shadowRoot.querySelectorAll('.actions button')[1] as HTMLButtonElement).click();
    await el.updateComplete; log('photo after updateComplete sr.active=', name(el.shadowRoot.activeElement), 'deep=', name(deep()));
    await new Promise((r) => setTimeout(r)); await frames();
    const input = el.shadowRoot.querySelector('.zone.photo input') as HTMLInputElement;
    log('photo settled sr.active=', name(el.shadowRoot.activeElement), 'deep=', name(deep()), 'input=', name(input), 'rects=', input?.getClientRects().length, 'tabIndex=', input?.tabIndex, 'disabled=', input?.disabled);
    log('photo events', JSON.stringify(events));
    input.focus(); log('photo manual focus sr.active=', name(el.shadowRoot.activeElement));
    await frames(); log('photo manual focus after frames sr.active=', name(el.shadowRoot.activeElement));
  });

  it('combobox hover', async () => {
    document.body.innerHTML = '<cm-combobox label="Tags" multiple><option selected>Dairy</option><option>Fruit</option></cm-combobox>';
    const el = document.querySelector('cm-combobox') as any;
    await el.updateComplete; await frames();
    const box = el.shadowRoot.querySelector('.box') as HTMLElement;
    const r = box.getBoundingClientRect();
    log('box rect', JSON.stringify(r), 'rest', getComputedStyle(box).borderTopColor);
    const hit = (x: number, y: number) => { let e: Element | null = document.elementFromPoint(x, y); while (e?.shadowRoot?.elementFromPoint(x, y) && e.shadowRoot.elementFromPoint(x, y) !== e) e = e.shadowRoot.elementFromPoint(x, y); return name(e); };
    log('hit centre', hit(r.x + r.width / 2, r.y + r.height / 2));
    const moves: string[] = [];
    document.addEventListener('pointermove', (e) => moves.push(`${e.clientX},${e.clientY} ${name(e.composedPath()[0] as Element)}`), { capture: true });
    await userEvent.hover(box);
    log('after hover :hover=', box.matches(':hover'), 'host :hover=', el.matches(':hover'), 'border', getComputedStyle(box).borderTopColor);
    await frames(); log('after hover+frames :hover=', box.matches(':hover'), 'border', getComputedStyle(box).borderTopColor);
    log('moves', JSON.stringify(moves.slice(-5)));
    await userEvent.hover(document.body);
  });
});
