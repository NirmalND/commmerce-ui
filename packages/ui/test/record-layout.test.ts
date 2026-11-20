import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { page } from 'vitest/browser';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import type { CmLayout, CmPageHeader } from '../src/index.js';

// Record page layout (1.7): cm-layout variant="record" with a 320px aside, sticky-aside, cm-info-panel rows,
// cm-page-header back-href.
const frames = (n = 2) => new Promise((r) => { const f = () => (--n ? requestAnimationFrame(f) : r(null)); requestAnimationFrame(f); });
const rect = (el: Element) => el.getBoundingClientRect();
const settle = async (root: Element) => {
  await Promise.all([root, ...root.querySelectorAll('*')].map((c) => (c as any).updateComplete));
  await frames(3);
  await Promise.all([root, ...root.querySelectorAll('*')].map((c) => (c as any).updateComplete));
};

beforeAll(async () => {
  const end = Date.now() + 10_000;
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-20') && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 20));
  }
  document.body.style.margin = '0';
});
beforeEach(async () => { document.body.innerHTML = ''; document.documentElement.dir = ''; scrollTo(0, 0); await page.viewport(1440, 900); });
afterAll(async () => { document.body.style.margin = ''; document.documentElement.dir = ''; await page.viewport(414, 896); });

const record = (attrs = '', mainHeight = 300, asideHeight = 200) => `<cm-page>
  <cm-layout variant="record" ${attrs}>
    <cm-layout-section id="main">
      <cm-card id="m1" heading="Overview"><div style="height:${mainHeight}px"></div></cm-card>
      <cm-card id="m2" heading="Related"><div style="height:40px"></div></cm-card>
    </cm-layout-section>
    <cm-layout-section id="aside" variant="aside">
      <cm-card id="a1" variant="compact" heading="Details"><div style="height:${asideHeight}px"></div></cm-card>
      <cm-card id="a2" variant="compact" heading="Tags"><div style="height:20px"></div></cm-card>
    </cm-layout-section>
  </cm-layout>
</cm-page>`;
const $ = (s: string) => document.querySelector(s) as HTMLElement;
const mount = async (html: string) => { document.body.innerHTML = html; await settle(document.body); return $('cm-layout') as CmLayout; };

describe('cm-layout variant="record"', () => {
  it('at 1440px: main column plus a 320px aside on the end side, 24px apart, tops aligned', async () => {
    await mount(record());
    const main = rect($('#main')), aside = rect($('#aside')), layout = rect($('cm-layout'));
    expect(Math.round(aside.width)).toBe(320);
    expect(Math.round(aside.right)).toBe(Math.round(layout.right));
    expect(Math.round(aside.left - main.right)).toBe(24);
    expect(Math.round(main.left)).toBe(Math.round(layout.left));
    expect(Math.round(main.top)).toBe(Math.round(aside.top));
    // Cards in a section are as far apart as the columns.
    expect(Math.round(rect($('#m2')).top - rect($('#m1')).bottom)).toBe(24);
  });

  it('places the aside beside the main column even when the aside comes first in the source', async () => {
    await mount(`<cm-layout variant="record"><cm-layout-section id="aside" variant="aside"><cm-card heading="Details">x</cm-card></cm-layout-section>
      <cm-layout-section id="main"><cm-card heading="Overview">x</cm-card></cm-layout-section></cm-layout>`);
    expect(Math.round(rect($('#main')).top)).toBe(Math.round(rect($('#aside')).top));
    expect(rect($('#aside')).left).toBeGreaterThan(rect($('#main')).left);
  });

  it('switches at 880px of its own width, not the window: side by side at 880, stacked at 879', async () => {
    await page.viewport(1024, 800);
    await mount(`<div style="width:880px">${record().replace(/<\/?cm-page>/g, '')}</div>`);
    expect(Math.round(rect($('#aside')).width)).toBe(320);
    expect(Math.round(rect($('#main')).top)).toBe(Math.round(rect($('#aside')).top));
    ($('div') as HTMLElement).style.width = '879px';
    await settle(document.body);
    expect(Math.round(rect($('#aside')).width)).toBe(879);
  });

  it('at a 1024px window inside cm-page (976px of layout): side by side, so a laptop with the side navigation keeps the aside beside the content', async () => {
    await page.viewport(1024, 800);
    await mount(record());
    const main = rect($('#main')), aside = rect($('#aside'));
    expect(Math.round(rect($('cm-layout')).width)).toBe(976);
    expect(Math.round(aside.width)).toBe(320);
    expect(Math.round(main.width)).toBe(976 - 320 - 24);
    expect(Math.round(main.top)).toBe(Math.round(aside.top));
  });

  it('at 390px: key facts first (aside above), 16px between the columns and between cards', async () => {
    await page.viewport(390, 800);
    await mount(record());
    const main = rect($('#main')), aside = rect($('#aside'));
    expect(Math.round(aside.width)).toBe(390 - 32);
    expect(aside.top).toBeLessThan(main.top);
    expect(Math.round(main.top - aside.bottom)).toBe(16);
    expect(Math.round(rect($('#m2')).top - rect($('#m1')).bottom)).toBe(16);
    expect(Math.round(rect($('#a2')).top - rect($('#a1')).bottom)).toBe(16);
    // Source order is untouched: the main section still comes first for keyboard and screen reader users.
    expect($('#main').compareDocumentPosition($('#aside')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('aside-position="below" puts the aside under the main content once stacked', async () => {
    await page.viewport(390, 800);
    await mount(record('aside-position="below"'));
    expect(Math.round(rect($('#aside')).top - rect($('#main')).bottom)).toBe(16);
  });

  it('an explicit gap other than 24 is kept on phones', async () => {
    await page.viewport(390, 800);
    await mount(record('gap="32"'));
    expect(Math.round(rect($('#main')).top - rect($('#aside')).bottom)).toBe(32);
  });

  it('in right-to-left pages the aside is on the left', async () => {
    document.documentElement.dir = 'rtl';
    await mount(record());
    const main = rect($('#main')), aside = rect($('#aside')), layout = rect($('cm-layout'));
    expect(Math.round(aside.left)).toBe(Math.round(layout.left));
    expect(Math.round(main.left - aside.right)).toBe(24);
    expect(Math.round(aside.width)).toBe(320);
  });

  it('the default layout is unchanged; an aside section in it is one third', async () => {
    await mount(`<cm-layout style="width:1200px"><cm-layout-section id="main" variant="two-thirds">x</cm-layout-section><cm-layout-section id="aside" variant="aside">y</cm-layout-section></cm-layout>`);
    expect(Math.round(rect($('#aside')).width)).toBe(Math.round((1200 - 5 * 24) / 6 * 2 + 24));
  });
});

describe('cm-layout sticky-aside', () => {
  it('keeps a short aside in view 24px from the top while the main column scrolls', async () => {
    const el = await mount(record('sticky-aside', 3000, 200));
    expect(el.asideSticks).toBe(true);
    scrollTo(0, 1200);
    await frames(2);
    expect(Math.round(rect($('#main')).top)).toBe(24 - 1200);
    expect(Math.round(rect($('#aside')).top)).toBe(24);
  });

  it('honours --cm-layout-sticky-top', async () => {
    await mount(record('sticky-aside style="--cm-layout-sticky-top: 80px"', 3000, 200));
    scrollTo(0, 1200);
    await frames(2);
    expect(Math.round(rect($('#aside')).top)).toBe(80);
  });

  it('lets an aside taller than the window scroll with the page, and sticks again once it fits', async () => {
    const el = await mount(record('sticky-aside', 3000, 1200));
    expect(el.asideSticks).toBe(false);
    scrollTo(0, 1500);
    await frames(2);
    expect(rect($('#aside')).bottom).toBeLessThan(0);
    ($('#a1 div') as HTMLElement).style.height = '200px';
    await settle(document.body);
    expect(el.asideSticks).toBe(true);
  });

  it('does not stick while stacked, or without the attribute', async () => {
    await page.viewport(390, 800);
    const el = await mount(record('sticky-aside', 3000, 100));
    expect(el.asideSticks).toBe(false);
    await page.viewport(1440, 900);
    const plain = await mount(record('', 3000, 100));
    expect(plain.asideSticks).toBe(false);
    plain.stickyAside = true;
    await settle(document.body);
    expect(plain.asideSticks).toBe(true);
  });
});

describe('record header and details', () => {
  it('cm-info-panel variant="compact" layout="rows": 16px padding, 13px labels beside 14px values', async () => {
    await mount(`<div style="width:320px"><cm-info-panel heading="Details" variant="compact" layout="rows">
      <cm-info-item label="Email">asha@example.com</cm-info-item>
      <cm-info-item label="Phone" half>+91 98450 12345</cm-info-item>
    </cm-info-panel></div>`);
    const panel = $('cm-info-panel'), [email, phone] = [...panel.querySelectorAll('cm-info-item')];
    const box = panel.shadowRoot!.querySelector('section')!;
    expect(getComputedStyle(box).paddingTop).toBe('16px');
    const label = email.shadowRoot!.querySelector('.label') as HTMLElement, value = email.shadowRoot!.querySelector('.value') as HTMLElement;
    expect(getComputedStyle(label).fontSize).toBe('13px');
    expect(getComputedStyle(label).lineHeight).toBe('18px');
    expect(getComputedStyle(value).fontSize).toBe('14px');
    expect(getComputedStyle(value).lineHeight).toBe('20px');
    expect(rect(value).left).toBeGreaterThan(rect(label).right);
    expect(Math.abs(rect(value).top - rect(label).top)).toBeLessThan(4);
    // `half` is ignored in rows: every fact has a row of its own.
    expect(Math.round(rect(phone).width)).toBe(Math.round(rect(email).width));
    expect(rect(phone).top).toBeGreaterThan(rect(email).bottom);
    expect(Math.round(rect(phone).top - rect(email).bottom)).toBe(12);
  });

  it('cm-info-panel default: 24px padding like a standard card (1.7.1), label over value', async () => {
    await mount(`<cm-info-panel heading="Order"><cm-info-item label="SKU">OD1</cm-info-item></cm-info-panel>`);
    const item = $('cm-info-item');
    expect(getComputedStyle($('cm-info-panel').shadowRoot!.querySelector('section')!).paddingTop).toBe('24px');
    const label = item.shadowRoot!.querySelector('.label')!, value = item.shadowRoot!.querySelector('.value')!;
    expect(Math.round(rect(value).top - rect(label).bottom)).toBe(4);
  });

  it('cm-page-header back-href shows a back link at every width, beside the title, with the description line', async () => {
    await mount(`<cm-page-header heading="Asha Rao" back-href="#leads" back-label="Leads" description="Owner Ravi Kumar · Created 12 Nov 2026 · Source Website form">
      <cm-badge slot="title-adornment" tone="attention">Qualified</cm-badge>
    </cm-page-header>`);
    const h = $('cm-page-header') as CmPageHeader;
    const back = h.shadowRoot!.querySelector('.back') as HTMLAnchorElement;
    expect(getComputedStyle(back).display).not.toBe('none');
    expect(Math.round(rect(back).width)).toBeGreaterThanOrEqual(36);
    expect(back.getAttribute('href')).toBe('#leads');
    expect(back.getAttribute('aria-label')).toBe('Back to Leads');
    const title = h.shadowRoot!.querySelector('h1')!, badge = $('cm-badge');
    expect(rect(back).right).toBeLessThanOrEqual(rect(title).left);
    expect(Math.abs(rect(badge).top + rect(badge).height / 2 - (rect(title).top + rect(title).height / 2))).toBeLessThan(4);
    const desc = h.shadowRoot!.querySelector('.desc')!;
    expect(getComputedStyle(desc).fontSize).toBe('13px');
    h.backLabel = '';
    await h.updateComplete;
    expect(back.getAttribute('aria-label')).toBe('Back');
  });

  it('on phones a header with a description puts the actions under the meta line', async () => {
    await page.viewport(390, 800);
    await mount(`<cm-page-header heading="Asha Rao" back-href="#leads" back-label="Leads" description="Owner Ravi Kumar · Created 12 Nov 2026">
      <cm-button slot="actions">Log call</cm-button><cm-button slot="actions" variant="primary">Convert</cm-button>
    </cm-page-header>`);
    const h = $('cm-page-header');
    const desc = h.shadowRoot!.querySelector('.desc')!, back = h.shadowRoot!.querySelector('.back')!;
    expect(rect($('cm-button')).top).toBeGreaterThanOrEqual(rect(desc).bottom);
    expect(getComputedStyle(back).display).not.toBe('none');
    expect(Math.round(rect(desc).width)).toBeGreaterThan(250);
  });

  it('without back-href the back link stays a phone-only stand-in for the breadcrumbs', async () => {
    await mount(`<cm-page-header heading="Asha Rao" breadcrumbs='[{"label":"Leads","href":"#leads"}]'></cm-page-header>`);
    const back = $('cm-page-header').shadowRoot!.querySelector('.back')!;
    expect(getComputedStyle(back).display).toBe('none');
  });
});
