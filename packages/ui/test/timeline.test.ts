import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import { resetStrings } from '../src/index.js';
import type { CmTimeline, CmTimelineItem } from '../src/index.js';

const shadow = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const LONG = 'Hi Asha, thanks for your time on the call today. '.repeat(12);

async function mount(markup: string): Promise<CmTimeline> {
  document.body.innerHTML = markup;
  const el = document.querySelector('cm-timeline') as CmTimeline;
  await el.updateComplete;
  await Promise.all(el.items.map((i) => i.updateComplete));
  await nextFrame();
  await Promise.all(el.items.map((i) => i.updateComplete));
  return el;
}
const item = (attrs: string, body = '') => `<cm-timeline-item ${attrs}>${body}</cm-timeline-item>`;

beforeAll(async () => {
  const end = Date.now() + 10_000; // tokens.css waits for its font import in Firefox and WebKit
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-20') && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 20));
  }
});
beforeEach(async () => { document.body.innerHTML = ''; resetStrings(); await page.viewport(1280, 800); });
afterAll(async () => { resetStrings(); await page.viewport(414, 896); });

describe('cm-timeline: semantics', () => {
  it('is an ordered list: an <ol> named "Activity" with one <li> per item, each item shown in its <li>', async () => {
    const el = await mount(`<cm-timeline>
      ${item(`icon="mail" heading="Email sent" datetime="${ago(2 * HOUR)}"`)}
      ${item(`icon="edit" heading="Status changed" datetime="${ago(3 * HOUR)}"`)}
      <p>Not an item</p>
    </cm-timeline>`);
    const ol = shadow(el, 'ol');
    expect(ol.getAttribute('aria-label')).toBe('Activity');
    const lis = ol.querySelectorAll(':scope > li');
    expect(lis).toHaveLength(2);
    lis.forEach((li, i) => expect((li.querySelector('slot') as HTMLSlotElement).assignedElements()).toEqual([el.items[i]]));
    // The paragraph is not an item: not shown, and the list holds only <li>s.
    expect([...ol.children].every((c) => c.localName === 'li')).toBe(true);
    expect(document.querySelector('p')!.getBoundingClientRect().height).toBe(0);
  });

  it('follows its children: added and removed items update the list', async () => {
    const el = await mount(`<cm-timeline>${item('heading="One"')}</cm-timeline>`);
    el.insertAdjacentHTML('beforeend', item('heading="Two"') + item('heading="Three"'));
    await new Promise((r) => setTimeout(r)); await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('li')).toHaveLength(3);
    const third = (el.shadowRoot!.querySelectorAll('li slot')[2] as HTMLSlotElement).assignedElements()[0] as CmTimelineItem;
    expect(third.heading).toBe('Three');
    el.items[0].remove();
    await new Promise((r) => setTimeout(r)); await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('li')).toHaveLength(2);
  });

  it('the connector line is decoration: drawn by the <li> (not the last), with no text', async () => {
    const el = await mount(`<cm-timeline label="Activity for Asha Rao">${item('icon="mail" heading="A"')}${item('icon="note" heading="B"')}</cm-timeline>`);
    expect(shadow(el, 'ol').getAttribute('aria-label')).toBe('Activity for Asha Rao');
    const [first, last] = el.shadowRoot!.querySelectorAll('li');
    expect(getComputedStyle(first, '::before').content).toBe('""');
    expect(getComputedStyle(first, '::before').display).toBe('block');
    expect(getComputedStyle(last, '::before').display).toBe('none');
    // The icon is hidden from assistive technology.
    expect(shadow(el.items[0], '.icon').getAttribute('aria-hidden')).toBe('true');
  });
});

describe('cm-timeline-item: content', () => {
  it('shows icon, title, badge, meta, body and actions', async () => {
    const el = await mount(`<cm-timeline>${item('icon="mail" tone="information" heading="Email sent" meta="by Rahul Kumar · sent"',
      '<cm-badge slot="badge" tone="information">Email</cm-badge>Your quote is attached.<cm-button slot="actions" size="slim">Read email</cm-button>')}</cm-timeline>`);
    const entry = el.items[0];
    expect(shadow(entry, '.icon cm-icon').getAttribute('name')).toBe('mail');
    expect(shadow(entry, '.icon').classList.contains('information')).toBe(true);
    expect(shadow(entry, '.title').textContent!.trim()).toBe('Email sent');
    expect(shadow(entry, '.meta').hidden).toBe(false);
    expect(shadow(entry, '.meta').textContent!.trim()).toBe('by Rahul Kumar · sent');
    expect((shadow(entry, 'slot[name="badge"]') as HTMLSlotElement).assignedElements()[0].localName).toBe('cm-badge');
    expect(shadow(entry, '.body').hidden).toBe(false);
    expect(shadow(entry, '.actions').hidden).toBe(false);
  });

  it('hides empty parts and shows a dot without an icon', async () => {
    const el = await mount(`<cm-timeline>${item('heading="Record created"')}</cm-timeline>`);
    const entry = el.items[0];
    expect(shadow(entry, '.dot')).toBeTruthy();
    expect(shadow(entry, '.meta').hidden).toBe(true);
    expect(shadow(entry, '.body').hidden).toBe(true);
    expect(shadow(entry, '.actions').hidden).toBe(true);
    expect(shadow(entry, '.toggle')).toBeNull();
    expect(shadow(entry, 'time')).toBeNull();
  });

  it('heading and meta slots take links', async () => {
    const el = await mount(`<cm-timeline>${item('', '<span slot="heading">Task <a href="#t1">Call back</a> completed</span><span slot="meta">by <a href="#u">Meera</a></span>')}</cm-timeline>`);
    const entry = el.items[0];
    expect(shadow(entry, '.meta').hidden).toBe(false);
    expect((shadow(entry, 'slot[name="heading"]') as HTMLSlotElement).assignedElements()).toHaveLength(1);
  });
});

describe('cm-timeline-item: time', () => {
  const timeOf = async (datetime: string, extra = '') => {
    const el = await mount(`<cm-timeline>${item(`heading="X" datetime="${datetime}" ${extra}`)}</cm-timeline>`);
    return el.items[0];
  };

  it('a <time datetime> with relative text, the full date in a tooltip and for screen readers', async () => {
    const iso = ago(2 * HOUR + 5 * MIN);
    const entry = await timeOf(iso);
    const time = shadow(entry, 'time');
    expect(time.getAttribute('datetime')).toBe(iso);
    const full = entry.fullTime;
    expect(full).toMatch(/\d/);
    expect(time.textContent).toBe(`2 hours ago, ${full}`);
    expect(time.querySelector('.sr')!.textContent).toBe(`, ${full}`);
    const tip = time.closest('cm-tooltip') as any;
    expect(tip.content).toBe(full);
    expect(tip.visualOnly).toBe(true); // already read out from the hidden text, so not a second time
    // Focus shows it: keyboard users get the full date too.
    time.focus();
    await tip.updateComplete;
    expect(tip.open).toBe(true);
  });

  it('words the time by distance: just now, minutes, hours, days, then a date; future too', async () => {
    expect((await timeOf(ago(20_000))).relativeTime).toBe('Just now');
    expect((await timeOf(ago(1 * MIN + 5000))).relativeTime).toBe('1 minute ago');
    expect((await timeOf(ago(45 * MIN))).relativeTime).toBe('45 minutes ago');
    expect((await timeOf(ago(1 * HOUR + MIN))).relativeTime).toBe('1 hour ago');
    expect((await timeOf(ago(3 * DAY + HOUR))).relativeTime).toBe('3 days ago');
    expect((await timeOf(ago(-(3 * HOUR + MIN)))).relativeTime).toBe('In 3 hours');
    const old = await timeOf('2026-01-05T10:00:00Z', 'lang="en-GB"');
    expect(old.relativeTime).toBe('5 Jan 2026');
  });

  it('`time` replaces the shown text; the full date stays available', async () => {
    const entry = await timeOf('2026-01-05T10:00:00Z', 'time="Monday morning"');
    expect(shadow(entry, 'time').textContent).toBe(`Monday morning, ${entry.fullTime}`);
    expect(entry.fullTime).not.toBe('');
  });

  it('the wording is localisable: strings property, setStrings and the language', async () => {
    const entry = await timeOf(ago(2 * HOUR + MIN), `strings='{"hoursAgo":{"one":"il y a {count} heure","other":"il y a {count} heures"}}' lang="fr"`);
    expect(entry.relativeTime).toBe('il y a 2 heures');
    expect(entry.fullTime).toMatch(/2026|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche/);
    const { setStrings } = await import('../src/index.js');
    const rtf = new Intl.RelativeTimeFormat('de', { numeric: 'auto' });
    setStrings({ timelineItem: { minutesAgo: ({ count }) => rtf.format(-Number(count), 'minute') } });
    const de = await timeOf(ago(5 * MIN + 1000));
    expect(de.relativeTime).toBe('vor 5 Minuten');
  });
});

describe('cm-timeline-item: body', () => {
  it('a long body is clamped to `lines` with Show all / Show less', async () => {
    const el = await mount(`<cm-timeline style="width:600px">${item('heading="Call logged" lines="2"', LONG)}</cm-timeline>`);
    const entry = el.items[0];
    const body = shadow(entry, '.body');
    expect(body.getBoundingClientRect().height).toBeLessThanOrEqual(41);
    const toggle = shadow(entry, '.toggle') as HTMLButtonElement;
    expect(toggle.textContent!.trim()).toBe('Show all');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe(body.id);
    toggle.click(); await entry.updateComplete;
    expect(entry.expanded).toBe(true);
    expect(body.getBoundingClientRect().height).toBeGreaterThan(60);
    expect(toggle.textContent!.trim()).toBe('Show less');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    toggle.click(); await entry.updateComplete;
    expect(entry.expanded).toBe(false);
  });

  it('a short body, or lines="0", has no toggle', async () => {
    const el = await mount(`<cm-timeline>${item('heading="Note"', 'Short note.')}${item('heading="Note" lines="0"', LONG)}</cm-timeline>`);
    expect(shadow(el.items[0], '.toggle')).toBeNull();
    expect(shadow(el.items[1], '.toggle')).toBeNull();
    expect(shadow(el.items[1], '.body').classList.contains('clamp')).toBe(false);
  });
});

describe('cm-timeline: paging, loading and empty', () => {
  it('Show more fires cm-load-more; while loading it is busy and fires nothing', async () => {
    const el = await mount(`<cm-timeline has-more>${item('heading="A"')}</cm-timeline>`);
    let n = 0;
    el.addEventListener('cm-load-more', () => n++);
    const more = shadow(el, '.more cm-button') as any;
    expect(more.textContent.trim()).toBe('Show more');
    more.click();
    expect(n).toBe(1);
    el.loading = true; await el.updateComplete;
    expect(more.loading).toBe(true);
    expect(shadow(el, 'ol').getAttribute('aria-busy')).toBe('true');
    expect(shadow(el, '[role="status"]').textContent).toBe('Loading activity');
    more.click();
    expect(n).toBe(1);
  });

  it('when the last page arrives, focus moves from Show more to the list', async () => {
    const el = await mount(`<cm-timeline has-more>${item('heading="A"')}</cm-timeline>`);
    const more = shadow(el, '.more cm-button') as any;
    await more.updateComplete;
    more.shadowRoot.querySelector('button').focus();
    el.insertAdjacentHTML('beforeend', item('heading="B"'));
    el.hasMore = false;
    await new Promise((r) => setTimeout(r)); await el.updateComplete;
    expect(shadow(el, '.more')).toBeNull();
    expect(el.shadowRoot!.activeElement).toBe(shadow(el, 'ol'));
  });

  it('loading with no items shows placeholder rows; no items shows the empty slot', async () => {
    const el = await mount(`<cm-timeline loading><cm-empty-state slot="empty" heading="No activity yet"></cm-empty-state></cm-timeline>`);
    expect(el.shadowRoot!.querySelectorAll('.loading cm-skeleton').length).toBeGreaterThan(0);
    expect(shadow(el, '.loading').getAttribute('aria-hidden')).toBe('true');
    expect(shadow(el, 'ol')).toBeNull();
    expect(document.querySelector('cm-empty-state')!.getBoundingClientRect().height).toBe(0);
    el.loading = false; await el.updateComplete;
    expect((shadow(el, 'slot.empty') as unknown as HTMLSlotElement).assignedElements()[0].localName).toBe('cm-empty-state');
    await nextFrame();
    expect(document.querySelector('cm-empty-state')!.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(shadow(el, '[role="status"]').textContent).toBe('');
  });

  it('has-more without items shows no button', async () => {
    const el = await mount('<cm-timeline has-more></cm-timeline>');
    expect(shadow(el, '.more')).toBeNull();
  });
});

describe('cm-timeline: layout', () => {
  it('fits a 320px screen without sideways scrolling', async () => {
    await page.viewport(320, 700);
    const el = await mount(`<cm-timeline has-more>
      ${item(`icon="mail" heading="Email opened by asha.rao@raotextiles.example.com" datetime="${ago(2 * HOUR)}" meta="by Rahul Kumar · sent"`,
        `<cm-badge slot="badge" tone="information">Email</cm-badge>${LONG}<cm-button slot="actions" size="slim">Read email</cm-button>`)}
      ${item(`icon="edit" heading="Status: New → Contacted" datetime="${ago(3 * DAY)}"`)}
    </cm-timeline>`);
    const walk = (root: Document | ShadowRoot, out: string[]) => root.querySelectorAll('*').forEach((n) => {
      if (n.getBoundingClientRect().right > 320.5) out.push(`${n.localName}.${n.className}`);
      if (n.shadowRoot) walk(n.shadowRoot, out);
    });
    const wide: string[] = []; walk(document, wide);
    expect(wide).toEqual([]);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
    const r = el.getBoundingClientRect();
    for (const entry of el.items) expect(entry.getBoundingClientRect().right).toBeLessThanOrEqual(r.right + 0.5);
  });

  it('the line runs from under one icon down to the next', async () => {
    const el = await mount(`<cm-timeline>${item('icon="mail" heading="A"', 'Body')}${item('icon="note" heading="B"')}</cm-timeline>`);
    const [li1] = el.shadowRoot!.querySelectorAll('li');
    const icon1 = shadow(el.items[0], '.icon').getBoundingClientRect(), icon2 = shadow(el.items[1], '.icon').getBoundingClientRect();
    const line = getComputedStyle(li1, '::before');
    const liBox = li1.getBoundingClientRect();
    expect(liBox.top + parseFloat(line.top)).toBeCloseTo(icon1.bottom, 0);
    expect(liBox.bottom).toBeCloseTo(icon2.top, 0);
    expect(liBox.left + parseFloat(line.left) + 1).toBeCloseTo(icon1.left + icon1.width / 2, 0);
  });

  it('keyboard: the time is a Tab stop (for its tooltip) and the toggle is a button', async () => {
    const el = await mount(`<cm-timeline style="width:500px">${item(`heading="Call" datetime="${ago(HOUR)}"`, LONG)}</cm-timeline>`);
    document.body.insertAdjacentHTML('afterbegin', '<button id="before">Before</button>');
    (document.getElementById('before') as HTMLButtonElement).focus();
    await userEvent.tab();
    expect(el.items[0].shadowRoot!.activeElement?.localName).toBe('time');
    // The toggle is a native button (WebKit on macOS leaves buttons out of the Tab order by default, so not tabbed to here).
    const toggle = shadow(el.items[0], '.toggle');
    expect(toggle.localName).toBe('button');
    toggle.focus();
    expect(el.items[0].shadowRoot!.activeElement).toBe(toggle);
  });
});
