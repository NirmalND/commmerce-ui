import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { page } from '@vitest/browser/context';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import type { CmStack, CmGrid, CmLayout, CmPage } from '../src/index.js';

const mount = async <T extends HTMLElement>(markup: string, width = 1200): Promise<T> => {
  document.body.innerHTML = `<div id="box" style="width:${width}px">${markup}</div>`;
  const el = document.getElementById('box')!.firstElementChild as T;
  await (el as any).updateComplete;
  await Promise.all([...el.querySelectorAll('*')].map((c) => (c as any).updateComplete));
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  return el;
};
const box = (el: Element) => el.getBoundingClientRect();
const setWidth = async (w: number) => {
  document.getElementById('box')!.style.width = `${w}px`;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
};

// tokens.css starts with an @import of the Poppins font; Firefox and WebKit apply none of the sheet's rules until
// that import has loaded (Chromium applies them at once). Wait for the tokens before measuring anything.
beforeAll(async () => {
  const end = Date.now() + 10_000;
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-20') && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 20));
  }
});
beforeEach(() => { document.body.innerHTML = ''; });

describe('cm-stack', () => {
  it('stacks children in a column, space-20 apart by default, and keeps them in light DOM', async () => {
    const el = await mount<CmStack>('<cm-stack><div style="height:10px"></div><div style="height:10px"></div></cm-stack>');
    const cs = getComputedStyle(el);
    expect(cs.display).toBe('flex');
    expect(cs.flexDirection).toBe('column');
    expect(cs.rowGap).toBe('20px');
    const [a, b] = el.children;
    expect(box(b).top - box(a).bottom).toBe(20);
    expect(a.parentElement).toBe(el);
  });
  it('maps gap to spacing tokens and lays out a wrapping row', async () => {
    const el = await mount<CmStack>('<cm-stack direction="inline" gap="10" wrap justify="space-between" align="start"><span>a</span><span>b</span></cm-stack>');
    const cs = getComputedStyle(el);
    expect(cs.flexDirection).toBe('row');
    expect(cs.columnGap).toBe('10px');
    expect(cs.flexWrap).toBe('wrap');
    expect(cs.justifyContent).toBe('space-between');
    expect(cs.alignItems).toBe('flex-start');
    el.gap = '0'; await el.updateComplete;
    expect(getComputedStyle(el).columnGap).toBe('0px');
    el.gap = '30'; await el.updateComplete;
    expect(getComputedStyle(el).columnGap).toBe('30px');
  });
  it('keeps the default gap for a value that is not a spacing step', async () => {
    const el = await mount<CmStack>('<cm-stack gap="17"><i></i></cm-stack>');
    expect(getComputedStyle(el).rowGap).toBe('20px');
  });
});

describe('cm-grid', () => {
  it('makes equal columns and collapses to one column at 640px or less', async () => {
    const el = await mount<CmGrid>('<cm-grid columns="3" gap="10"><div>1</div><div>2</div><div>3</div></cm-grid>', 940);
    const [a, b, c] = el.children;
    expect(box(a).top).toBe(box(c).top);
    expect(Math.round(box(a).width)).toBe(Math.round((940 - 20) / 3));
    expect(box(b).left - box(a).right).toBe(10);
    await setWidth(640);
    expect(box(b).top).toBeGreaterThan(box(a).top);
    expect(Math.round(box(a).width)).toBe(640);
  });
  it('fits as many columns as min-column-width allows', async () => {
    const el = await mount<CmGrid>('<cm-grid min-column-width="200px" gap="20"><div>1</div><div>2</div><div>3</div><div>4</div><div>5</div></cm-grid>', 900);
    const kids = [...el.children];
    expect(kids.filter((k) => box(k).top === box(kids[0]).top).length).toBe(4); // 4 x 200 + 3 x 20 = 860
    await setWidth(300);
    expect(Math.round(box(kids[0]).width)).toBe(300);
    await setWidth(150);
    expect(Math.round(box(kids[0]).width)).toBe(150); // never wider than the grid
  });
});

describe('cm-layout', () => {
  const markup = `<cm-layout>
    <cm-layout-section variant="two-thirds"><div id="m1" style="height:40px"></div><div id="m2" style="height:40px"></div></cm-layout-section>
    <cm-layout-section variant="one-third"><div id="s1" style="height:40px"></div></cm-layout-section>
    <cm-layout-section><div id="f1" style="height:10px"></div></cm-layout-section>
  </cm-layout>`;
  it('puts a two-thirds and a one-third section side by side, and a full section under them', async () => {
    const el = await mount<CmLayout>(markup, 1200);
    const [main, side, full] = el.children;
    expect(box(main).top).toBe(box(side).top);
    expect(Math.round(box(main).width)).toBe(Math.round((1200 - 5 * 20) / 6 * 4 + 3 * 20));
    expect(Math.round(box(side).width)).toBe(Math.round((1200 - 5 * 20) / 6 * 2 + 20));
    expect(Math.round(box(full).width)).toBe(1200);
    expect(box(full).top).toBeGreaterThan(box(main).top);
    // children of a section are stacked space-20 apart
    expect(box(el.querySelector('#m2')!).top - box(el.querySelector('#m1')!).bottom).toBe(20);
  });
  it('stacks sections in source order below 768px of its own width', async () => {
    const el = await mount<CmLayout>(markup, 767);
    const [main, side] = el.children;
    expect(Math.round(box(main).width)).toBe(767);
    expect(box(side).top).toBeGreaterThan(box(main).bottom);
    await setWidth(768);
    expect(box(side).top).toBe(box(main).top);
  });
  it('splits one-half sections evenly and honours gap', async () => {
    const el = await mount<CmLayout>('<cm-layout gap="30"><cm-layout-section variant="one-half">a</cm-layout-section><cm-layout-section variant="one-half">b</cm-layout-section></cm-layout>', 1000);
    const [a, b] = el.children;
    expect(Math.round(box(a).width)).toBe(485);
    expect(box(b).left - box(a).right).toBe(30);
  });
});

describe('cm-page', () => {
  it('runs the header edge to edge and pads and centres the content on bg-page', async () => {
    const el = await mount<CmPage>(`<cm-page><cm-page-header slot="header" heading="Orders"></cm-page-header><div id="c" style="height:10px"></div></cm-page>`, 2000);
    const header = el.querySelector('cm-page-header')!;
    const content = el.querySelector('#c')!;
    expect(Math.round(box(header).width)).toBe(2000);
    expect(Math.round(box(content).width)).toBe(1600);
    expect(Math.round(box(content).left - box(el).left)).toBe(200);
    expect(box(content).top - box(header).bottom).toBe(20);
    expect(getComputedStyle(el).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });
  it('narrow caps the content at 800px and full-width removes the cap', async () => {
    const el = await mount<CmPage>('<cm-page narrow><div id="c">x</div></cm-page>', 2000);
    expect(Math.round(box(el.querySelector('#c')!).width)).toBe(800);
    el.narrow = false; el.fullWidth = true; await el.updateComplete;
    expect(Math.round(box(el.querySelector('#c')!).width)).toBe(2000 - 40);
  });
  it('uses space-10 page padding when the page is 640px wide or less', async () => {
    const el = await mount<CmPage>('<cm-page><div id="c">x</div></cm-page>', 600);
    expect(Math.round(box(el.querySelector('#c')!).left - box(el).left)).toBe(10);
  });
});

describe('cm-page-header on a phone', () => {
  it('wraps two large actions below the title instead of spilling sideways (320px viewport)', async () => {
    await page.viewport(320, 640);
    try {
      document.body.style.margin = '0';
      const el = await mount<HTMLElement>(`<cm-page-header heading="Summer collection launch">
        <cm-button slot="actions" size="large">Save as draft</cm-button>
        <cm-button slot="actions" size="large" variant="primary">Publish to all stores</cm-button></cm-page-header>`, 320);
      const header = el.shadowRoot!.querySelector('header')!;
      expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth);
      for (const b of el.querySelectorAll('cm-button')) expect(box(b).right).toBeLessThanOrEqual(320.5);
    } finally {
      document.body.style.margin = '';
      await page.viewport(414, 896);
    }
  });
});

describe('overlay reopened quickly', () => {
  it('stays open when shown again before the dialog\'s close event arrives', async () => {
    const el = await mount<HTMLElement & { open: boolean; updateComplete: Promise<unknown> }>('<cm-modal heading="Edit" open><p>Body</p></cm-modal>');
    const d = el.shadowRoot!.querySelector('dialog')!;
    expect(d.open).toBe(true);
    el.open = false; await el.updateComplete;
    el.open = true; await el.updateComplete;
    await new Promise((r) => setTimeout(r, 50)); // let the queued close event fire
    expect(el.open).toBe(true);
    expect(d.open).toBe(true);
    el.open = false; await el.updateComplete;
  });
});

describe('cm-header-bar on phones (issue #9)', () => {
  // A 187×40 logo (the CRM's), search, the user and two icon-only buttons in `end`, as the CRM uses it.
  const logo = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="187" height="40"><rect width="187" height="40"/></svg>')}`;
  const markup = `<cm-header-bar user-name="Asha Rao">
      <img slot="logo" src="${logo}" alt="Commmerce CRM" width="187" height="40">
      <cm-global-search slot="search"></cm-global-search>
      <cm-button slot="end" icon-only icon="refresh" label="Refresh"></cm-button>
      <cm-button slot="end" icon-only icon="bell" label="Notifications" count="3"></cm-button>
    </cm-header-bar>`;
  // `large` buttons stand in for touch screens, where icon-only buttons grow to 44px.
  for (const [w, size] of [[320, ''], [360, ''], [390, ''], [360, 'large'], [390, 'large']] as const) {
    it(`fits every control at ${w}px${size ? ' with touch-size buttons' : ''}: nothing past the edge, the logo gives way`, async () => {
      const el = await mount<HTMLElement>(size ? markup.replaceAll('<cm-button slot="end"', `<cm-button slot="end" size="${size}"`) : markup, w);
      await (el as any).updateComplete;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      const bar = box(el);
      const bell = el.querySelector('cm-button[icon="bell"]')!;
      expect(box(bell).right).toBeLessThanOrEqual(bar.right + 0.5);
      expect(box(el.querySelector('cm-button[icon="refresh"]')!).width).toBeGreaterThan(20);
      expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth);
      const img = el.querySelector('img')!;
      expect(box(img).width).toBeGreaterThan(40);
      expect(box(img).right).toBeLessThanOrEqual(box(el.shadowRoot!.querySelector('.end')!).left);
    });
  }
});

describe('cm-page-header title adornment on phones (issue #18)', () => {
  const markup = `<cm-page-header heading="#30412 Printer not printing GST invoice">
      <cm-badge slot="title-adornment" tone="attention">Waiting on customer</cm-badge>
      <cm-badge slot="title-adornment">Customer</cm-badge>
    </cm-page-header>`;
  for (const w of [320, 390]) {
    it(`keeps the page from scrolling sideways at ${w}px: badges wrap under the title`, async () => {
      await page.viewport(w, 700);
      const el = await mount<HTMLElement>(markup, w);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      const head = box(el);
      for (const b of el.querySelectorAll('cm-badge')) expect(box(b).right).toBeLessThanOrEqual(head.right + 0.5);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(w);
      const text = el.shadowRoot!.querySelector('.text')!;
      expect(box(text).width).toBeGreaterThan(80);
      expect(box(el.querySelectorAll('cm-badge')[1]).top).toBeGreaterThan(box(text).top);
    });
  }
  it('stays on one row when it fits (wide header unchanged)', async () => {
    await page.viewport(1280, 800);
    const el = await mount<HTMLElement>(markup, 1200);
    const text = el.shadowRoot!.querySelector('.text')!;
    for (const b of el.querySelectorAll('cm-badge')) expect(Math.abs(box(b).top + box(b).height / 2 - (box(text).top + box(text).height / 2))).toBeLessThan(3);
  });
});

describe('cm-card header on narrow cards (issue #14)', () => {
  const markup = (heading: string) => `<cm-card heading="${heading}">
    <cm-badge slot="title-adornment" tone="critical">1 overdue</cm-badge>
    <cm-badge slot="title-adornment" tone="attention">2 today</cm-badge>
    <cm-badge slot="title-adornment">4 later</cm-badge>
    <cm-button slot="actions" size="slim">View all</cm-button>
    <p style="margin:0">Body</p>
  </cm-card>`;
  /** The heading text's line boxes (a Range over the text, so wrapped lines count separately). */
  const headingLines = (el: Element) => {
    const range = document.createRange();
    range.selectNodeContents(el.shadowRoot!.querySelector('.title .text')!);
    return { rect: range.getBoundingClientRect(), lines: new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size };
  };
  const ch12 = (el: Element) => {
    const probe = document.createElement('span');
    probe.textContent = '000000000000';
    probe.style.cssText = `font: 600 ${getComputedStyle(el.shadowRoot!.querySelector('.title')!).fontSize} var(--cm-font-sans, Poppins); white-space: nowrap; position: absolute`;
    document.body.append(probe);
    const w = probe.getBoundingClientRect().width;
    probe.remove();
    return w;
  };

  for (const width of [320, 360, 390]) {
    it(`at ${width}px the badges move under the heading instead of squeezing it`, async () => {
      await document.fonts.ready;
      for (const heading of ['Partner tasks', 'Desk tickets', 'Customer follow-ups due this week']) {
        const el = await mount<HTMLElement>(markup(heading), width);
        const card = box(el);
        const { rect, lines } = headingLines(el);
        const badges = [...el.querySelectorAll('cm-badge')].map(box);
        const button = box(el.querySelector('cm-button')!);
        // Short headings stay on one line; a long one keeps at least ~12 characters per line.
        if (heading.length <= 13) expect(lines, heading).toBe(1);
        if (lines > 1) expect(rect.width, heading).toBeGreaterThan(ch12(el) * 0.9);
        // Badges sit below the heading text, never beside it on its line.
        for (const b of badges) expect(b.top, heading).toBeGreaterThanOrEqual(rect.bottom - 1);
        // Nothing overflows the card or overlaps.
        for (const r of [...badges, button, rect]) {
          expect(r.left).toBeGreaterThanOrEqual(card.left);
          expect(r.right).toBeLessThanOrEqual(card.right + 0.5);
        }
        expect(button.left >= rect.right || button.top >= rect.bottom).toBe(true);
        expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth);
      }
    });
  }

  it('at 1200px everything stays on one row, as before 1.2: heading, badges 10px apart, actions at the end', async () => {
    await document.fonts.ready;
    const el = await mount<HTMLElement>(markup('Partner tasks'), 1200);
    const card = box(el);
    const { rect, lines } = headingLines(el);
    const badges = [...el.querySelectorAll('cm-badge')].map(box);
    const button = box(el.querySelector('cm-button')!);
    expect(lines).toBe(1);
    expect(Math.round(rect.left - card.left)).toBe(21);
    expect(Math.round(badges[0].left - rect.right)).toBe(10);
    expect(Math.round(badges[1].left - badges[0].right)).toBe(10);
    for (const b of badges) expect(Math.abs((b.top + b.bottom) / 2 - (rect.top + rect.bottom) / 2)).toBeLessThan(2);
    expect(Math.round(card.right - button.right)).toBe(21);
    expect(Math.round(button.top - card.top)).toBe(21);
    // One row: the header is as tall as its tallest item (the exact px depends on the fonts installed).
    expect(box(el.shadowRoot!.querySelector('header')!).height).toBeLessThanOrEqual(Math.max(button.height, box(el.shadowRoot!.querySelector('[role=heading]')!).height, ...badges.map((x) => x.height)) + 1);
  });

  it('at 1200px a long description keeps the actions beside it, and a card that shrinks to fit keeps one row', async () => {
    const el = await mount<HTMLElement>(`<cm-card heading="Shipping" description="${'How this product is weighed and shipped. '.repeat(8)}"><cm-button slot="actions" size="slim">Edit</cm-button>x</cm-card>`, 1200);
    const button = box(el.querySelector('cm-button')!);
    expect(Math.round(button.top - box(el).top)).toBe(21);
    expect(Math.round(box(el).right - button.right)).toBe(21);
    const fit = await mount<HTMLElement>('<div style="display:flex"><cm-card heading="Shrink to fit"><cm-button slot="actions" size="slim">Edit</cm-button>body</cm-card></div>', 1200);
    const card = fit.querySelector('cm-card')!;
    expect(Math.round(box(card.querySelector('cm-button')!).top - box(card).top)).toBe(21);
  });

  it('with no adornment there is no extra gap after the heading', async () => {
    const el = await mount<HTMLElement>('<cm-card heading="Pricing">x</cm-card>', 390);
    expect((el.shadowRoot!.querySelector('.adornment') as HTMLElement).hidden).toBe(true);
    expect(el.shadowRoot!.querySelector('[role=heading]')!.textContent!.trim()).toBe('Pricing');
  });
});
