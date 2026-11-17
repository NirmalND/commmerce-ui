import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { page } from '@vitest/browser/context';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import type { CmTimelineItem } from '../src/index.js';

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
const box = (el: Element) => el.getBoundingClientRect();
// WebKit applies a new viewport a few frames late: wait until the media queries see it.
async function viewport(w: number) {
  await page.viewport(w, 800);
  const end = Date.now() + 3000;
  while (window.innerWidth !== w && Date.now() < end) await nextFrame();
  await nextFrame();
}

beforeAll(async () => {
  const end = Date.now() + 10_000; // tokens.css waits for its font import in Firefox and WebKit
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-20') && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 20));
  }
});

describe('cm-timeline-item: the time stays on the first line (CRM E-sign "What happened")', () => {
  const LONG = 'Rahul sent "Partner Agreement MOU Individual: kumbh Digital" from template "Partner Agreement MOU Individual", valid till 26 Nov 2026; Commmerce not signing this one';
  afterAll(() => page.viewport(414, 896));
  for (const width of [900, 360]) {
    it(`at ${width}px (in a wide window) a long heading wraps beside the time instead of pushing it below`, async () => {
      await viewport(1100);
      document.body.innerHTML = `<div style="width:${width}px"><cm-timeline><cm-timeline-item icon="clock" heading='${LONG}' datetime="${new Date(Date.now() - 6 * 86_400_000).toISOString()}"></cm-timeline-item></cm-timeline></div>`;
      const it1 = document.querySelector('cm-timeline-item') as CmTimelineItem;
      await it1.updateComplete; await nextFrame();
      const title = it1.shadowRoot!.querySelector('.title')!;
      const time = it1.shadowRoot!.querySelector('time')!;
      expect(box(title).height).toBeGreaterThan(30); // the heading wraps...
      expect(Math.abs(box(time).top - box(title).top)).toBeLessThanOrEqual(4); // ...and the time is on its first line
      expect(box(time).left).toBeGreaterThan(box(title).right - 1); // at the end, after the heading column
      expect(box(time).right).toBeLessThanOrEqual(box(it1).right + 0.5);
    });
  }
  it('on phones the time sits under the heading, left-aligned', async () => {
    await viewport(390);
    document.body.innerHTML = `<cm-timeline><cm-timeline-item icon="clock" heading="${LONG.replace(/"/g, '&quot;')}" datetime="${new Date().toISOString()}"></cm-timeline-item></cm-timeline>`;
    const it1 = document.querySelector('cm-timeline-item') as CmTimelineItem;
    await it1.updateComplete; await nextFrame();
    const title = box(it1.shadowRoot!.querySelector('.title')!);
    const time = box(it1.shadowRoot!.querySelector('time')!);
    expect(time.top).toBeGreaterThanOrEqual(title.bottom - 1);
    expect(Math.abs(time.left - title.left)).toBeLessThanOrEqual(1);
  });
  it('a badge stays beside a short heading, with the time at the end', async () => {
    await viewport(1100);
    document.body.innerHTML = `<div style="width:600px"><cm-timeline><cm-timeline-item heading="Signed" datetime="${new Date().toISOString()}"><cm-badge slot="badge">Partner</cm-badge></cm-timeline-item></cm-timeline></div>`;
    const it1 = document.querySelector('cm-timeline-item') as CmTimelineItem;
    await it1.updateComplete; await nextFrame();
    const title = box(it1.shadowRoot!.querySelector('.title')!);
    const badge = box(document.querySelector('cm-badge')!);
    const time = box(it1.shadowRoot!.querySelector('time')!);
    expect(badge.left - title.right).toBeLessThanOrEqual(9);
    expect(time.right).toBeGreaterThan(box(it1).right - 2);
  });
});

describe('cm-resource-item: a cm-icon as media is centred in the square (CRM settings)', () => {
  it('centres the icon in the 40px square', async () => {
    document.body.innerHTML = `<cm-resource-list><cm-resource-item href="#a"><cm-icon slot="media" name="users" size="18"></cm-icon>Team</cm-resource-item></cm-resource-list>`;
    const icon = document.querySelector('cm-icon')!;
    await (document.querySelector('cm-resource-item') as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    await nextFrame();
    const sq = box(icon);
    const svg = box(icon.shadowRoot!.querySelector('svg')!);
    expect([32, 40]).toContain(Math.round(sq.width)); // 32 in phone-width test frames
    expect(Math.abs((svg.left + svg.width / 2) - (sq.left + sq.width / 2))).toBeLessThanOrEqual(1);
    expect(Math.abs((svg.top + svg.height / 2) - (sq.top + sq.height / 2))).toBeLessThanOrEqual(1);
  });
});

describe('1.8.1: header control sizes, buttons in narrow cards, board scrolling, menus near the edge', () => {
  it('select, text field and combobox size="medium" are 36px, the height of a standard button', async () => {
    await viewport(1100);
    document.body.innerHTML = `<cm-select size="medium" aria-label="Layout"><option value="a">Standard layout</option></cm-select>
      <cm-text-field size="medium" label="Name"></cm-text-field><cm-button>Board</cm-button>`;
    const sel = document.querySelector('cm-select') as HTMLElement & { updateComplete: Promise<unknown> };
    const tf = document.querySelector('cm-text-field') as HTMLElement & { updateComplete: Promise<unknown> };
    const btn = document.querySelector('cm-button') as HTMLElement & { updateComplete: Promise<unknown> };
    await Promise.all([sel.updateComplete, tf.updateComplete, btn.updateComplete]); await nextFrame();
    const h = (el: Element) => Math.round(box(el).height);
    expect(h(sel.shadowRoot!.querySelector('.box')!)).toBe(36);
    expect(h(tf.shadowRoot!.querySelector('input')!)).toBe(36);
    expect(h(btn.shadowRoot!.querySelector('.btn')!)).toBe(36);
  });

  it('a button with a long label stays inside a narrow card, ending with an ellipsis', async () => {
    document.body.innerHTML = `<div style="width:240px"><cm-button icon="external">Open this record in the current CRM</cm-button></div>`;
    const btn = document.querySelector('cm-button') as HTMLElement & { updateComplete: Promise<unknown> };
    await btn.updateComplete; await nextFrame();
    expect(box(btn).width).toBeLessThanOrEqual(240.5);
    const text = btn.shadowRoot!.querySelector('.text') as HTMLElement;
    expect(getComputedStyle(text).textOverflow).toBe('ellipsis');
    expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
  });

  it('board columns pass sideways scrolling on to the board (no horizontal overscroll containment)', async () => {
    document.body.innerHTML = `<cm-board><cm-board-column heading="New"><cm-board-card name="A"></cm-board-card></cm-board-column></cm-board>`;
    const col = document.querySelector('cm-board-column') as HTMLElement & { updateComplete: Promise<unknown> };
    await col.updateComplete; await nextFrame();
    const sc = getComputedStyle(col.shadowRoot!.querySelector('.scroll')!);
    const x = sc.getPropertyValue('overscroll-behavior-x'), y = sc.getPropertyValue('overscroll-behavior-y');
    if (!x && !y) return; // WebKit 18.2's computed style doesn't report overscroll-behavior
    expect(x).toBe('auto');
    expect(y).toBe('contain');
  });

  it('an action menu at the right edge opens toward the left instead of off the screen', async () => {
    await viewport(1100);
    document.body.innerHTML = `<div style="display:flex;justify-content:flex-end"><cm-action-menu icon-only icon="more" label="More">
      <cm-menu-item>Add note to this record</cm-menu-item><cm-menu-item>Open in the current CRM</cm-menu-item></cm-action-menu></div>`;
    const menu = document.querySelector('cm-action-menu') as HTMLElement & { open: boolean; updateComplete: Promise<unknown> };
    await menu.updateComplete;
    menu.open = true; await menu.updateComplete; await nextFrame();
    const pop = box(menu.shadowRoot!.querySelector('.pop')!);
    expect(pop.right).toBeLessThanOrEqual(document.documentElement.clientWidth);
    expect(pop.left).toBeGreaterThanOrEqual(0);
  });
});
