import { describe, it, expect, beforeAll } from 'vitest';
import { page } from '@vitest/browser/context';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import type { CmInfoItem } from '../src/index.js';

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
const box = (el: Element) => el.getBoundingClientRect();

beforeAll(async () => {
  const end = Date.now() + 10_000; // tokens.css waits for its font import in Firefox and WebKit
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-20') && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 20));
  }
  await page.viewport(1100, 800);
});

describe('cm-info-item editable (CRM record "About the company")', () => {
  async function mount(markup: string) {
    document.body.innerHTML = `<div style="width:700px"><cm-info-panel heading="Address information">${markup}</cm-info-panel></div>`;
    const items = [...document.querySelectorAll('cm-info-item')] as CmInfoItem[];
    await Promise.all(items.map((i) => i.updateComplete)); await nextFrame();
    return items;
  }
  it('puts a 28px pencil after the value, centred on its first line, named "Edit {label}"', async () => {
    const [it1] = await mount(`<cm-info-item half label="City" editable>Bengaluru</cm-info-item>`);
    const btn = it1.shadowRoot!.querySelector('.edit') as HTMLButtonElement;
    const value = it1.shadowRoot!.querySelector('.value')!;
    expect(btn.getAttribute('aria-label')).toBe('Edit City');
    expect(Math.round(box(btn).height)).toBe(28);
    const firstLineMid = box(value).top + 10;
    expect(Math.abs(box(btn).top + 14 - firstLineMid)).toBeLessThanOrEqual(1);
    expect(box(btn).left).toBeGreaterThanOrEqual(box(value).right);
    expect(getComputedStyle(btn).borderTopWidth).toBe('0px');
  });
  it('a long value wraps and the pencil stays on its first line', async () => {
    const [it1] = await mount(`<cm-info-item half label="Street" editable>5, 4th Main Rd, NS Palya, BTM 2nd Stage, BTM Layout, Bengaluru, Karnataka</cm-info-item>`);
    const btn = it1.shadowRoot!.querySelector('.edit')!;
    const value = it1.shadowRoot!.querySelector('.value')!;
    expect(box(value).height).toBeGreaterThan(30);
    expect(Math.abs(box(btn).top + 14 - (box(value).top + 10))).toBeLessThanOrEqual(1);
    expect(box(btn).right).toBeLessThanOrEqual(box(it1).right + 0.5);
  });
  it('fires cm-edit, takes edit-label, and is absent without editable', async () => {
    const [a, b] = await mount(`<cm-info-item label="Zip code" editable edit-label="Change the zip code">560076</cm-info-item><cm-info-item label="Country">India</cm-info-item>`);
    let fired = 0; a.addEventListener('cm-edit', () => fired++);
    const btn = a.shadowRoot!.querySelector('.edit') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBe('Change the zip code');
    btn.click();
    expect(fired).toBe(1);
    expect(b.shadowRoot!.querySelector('.edit')).toBeNull();
  });
});
