import { describe, it, expect, beforeAll } from 'vitest';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import type { CmSparkline } from '../src/index.js';

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
async function mount(markup: string) {
  document.body.innerHTML = `<div style="width:200px">${markup}</div>`;
  const el = document.querySelector('cm-sparkline') as CmSparkline;
  await el.updateComplete; await nextFrame();
  return el;
}
const svgOf = (el: CmSparkline) => el.shadowRoot!.querySelector('svg')!;

beforeAll(async () => {
  const end = Date.now() + 10_000;
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-20') && Date.now() < end) await new Promise((r) => setTimeout(r, 20));
});

describe('cm-sparkline', () => {
  it('draws one bar per value, scaled to the largest, the last one emphasised, filling the width at 32px tall', async () => {
    const el = await mount(`<cm-sparkline label="Visits, last 7 days" values="[0,2,1,4,0,3,2]"></cm-sparkline>`);
    const bars = [...el.shadowRoot!.querySelectorAll('rect.bar')];
    expect(bars.length).toBe(7);
    const hs = bars.map((b) => b.getBoundingClientRect().height);
    expect(hs[0]).toBe(0);
    expect(hs[3]).toBeGreaterThan(hs[1]);
    expect(Math.abs(hs[1] * 2 - hs[3])).toBeLessThan(1.5);
    expect(bars[6].classList.contains('last')).toBe(true);
    const r = el.getBoundingClientRect();
    expect(Math.round(r.width)).toBe(200);
    expect(Math.round(r.height)).toBe(32);
  });
  it('is one image for screen readers: total, peak (and when, with labels) and latest', async () => {
    const el = await mount(`<cm-sparkline label="Visits" values="1, 4, 2" labels='["10 Nov","11 Nov","12 Nov"]'></cm-sparkline>`);
    expect(svgOf(el).getAttribute('role')).toBe('img');
    expect(svgOf(el).getAttribute('aria-label')).toBe('Visits: 7 in all, peak 4 on 11 Nov, latest 2');
    expect(el.shadowRoot!.querySelectorAll('rect.bar')[1].querySelector('title')!.textContent).toBe('11 Nov: 4');
    el.labels = []; await el.updateComplete;
    expect(svgOf(el).getAttribute('aria-label')).toBe('Visits: 7 in all, peak 4, latest 2');
  });
  it('says "no data" with no values and still draws its baseline', async () => {
    const el = await mount(`<cm-sparkline label="Visits"></cm-sparkline>`);
    expect(svgOf(el).getAttribute('aria-label')).toBe('Visits: no data');
    expect(el.shadowRoot!.querySelector('line.base')).not.toBeNull();
    expect(el.shadowRoot!.querySelectorAll('rect').length).toBe(0);
  });
  it('type="line" draws a polyline through every point with a dot on the last', async () => {
    const el = await mount(`<cm-sparkline type="line" label="Score" values="[3,5,4,8]"></cm-sparkline>`);
    const pts = el.shadowRoot!.querySelector('polyline')!.getAttribute('points')!.split(' ');
    expect(pts.length).toBe(4);
    const dot = el.shadowRoot!.querySelector('.dot')!.getBoundingClientRect();
    expect(Math.abs(dot.width - dot.height)).toBeLessThanOrEqual(0.5); // round, not stretched with the chart
  });
  it('keeps time left to right in right-to-left pages, and formats numbers for the locale', async () => {
    document.documentElement.dir = 'rtl';
    try {
      const el = await mount(`<cm-sparkline label="Visits" values="[1,5]"></cm-sparkline>`);
      const [a, b] = [...el.shadowRoot!.querySelectorAll('rect.bar')].map((r) => r.getBoundingClientRect());
      expect(a.left).toBeLessThan(b.left);
    } finally { document.documentElement.dir = ''; }
    const el2 = await mount(`<cm-sparkline label="Visits" values="[1200000,0]" lang="en-IN"></cm-sparkline>`);
    expect(svgOf(el2).getAttribute('aria-label')).toContain('12,00,000');
  });
});
