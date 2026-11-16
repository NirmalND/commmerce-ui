// 1.2 additions for the CRM rebuild: the phone icon, button tones and the inline empty state.
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { userEvent } from '@vitest/browser/context';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import type { CmButton, CmEmptyState } from '../src/index.js';

const mount = async <T extends HTMLElement>(markup: string, attrs = ''): Promise<T> => {
  document.body.innerHTML = `<div id="away" style="height:40px"></div><div id="box" ${attrs} style="width:360px;padding:16px;background:var(--cm-bg-surface)">${markup}</div>`;
  await userEvent.hover(document.getElementById('away')!); // the pointer stays where the last test left it
  const el = document.getElementById('box')!.firstElementChild as T;
  await (el as any).updateComplete;
  await Promise.all([...el.querySelectorAll('*'), ...(el.shadowRoot?.querySelectorAll('*') ?? [])].map((c) => (c as any).updateComplete));
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  return el;
};
const shadow = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
const inner = (el: Element) => shadow(el, '.btn');

// Colours as computed by the browser ("rgb(…)" or, for color-mix, "color(srgb …)") -> WCAG contrast.
const rgb = (c: string): number[] => {
  const m = c.match(/^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)/);
  if (m) return [m[1], m[2], m[3]].map(Number);
  return c.match(/[\d.]+/g)!.slice(0, 3).map((v) => Number(v) / 255);
};
const lum = (c: number[]) => c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a: string, b: string) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
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
beforeEach(() => { document.body.innerHTML = ''; });

describe('@commmerce/icons 1.2: phone', () => {
  it('exists and draws inside the 24px grid with the standard stroke', async () => {
    const { icons, iconNames } = await import('@commmerce/icons');
    expect(iconNames).toContain('phone');
    expect(iconNames).not.toContain('whatsapp');
    const el = await mount<HTMLElement>('<cm-icon name="phone" size="24"></cm-icon>');
    const svg = el.shadowRoot!.querySelector('svg')!;
    expect(svg.getAttribute('stroke-width')).toBe('1.6');
    expect(svg.querySelector('path')!.getAttribute('d')).toBe((icons as Record<string, string>).phone);
    const box = (svg.querySelector('path') as SVGPathElement).getBBox();
    expect(box.x).toBeGreaterThanOrEqual(2);
    expect(box.y).toBeGreaterThanOrEqual(2);
    expect(box.x + box.width).toBeLessThanOrEqual(22);
    expect(box.y + box.height).toBeLessThanOrEqual(22);
    expect(box.width * box.height).toBeGreaterThan(200);
  });
  it('is not mirrored in right-to-left text (a handset does not point along the line)', async () => {
    const el = await mount<HTMLElement>('<cm-icon name="phone"></cm-icon>', 'dir="rtl"');
    expect(getComputedStyle(el.shadowRoot!.querySelector('svg')!).transform).toBe('none');
  });
});

describe('cm-button tone (1.2)', () => {
  it('default rendering is unchanged without tone', async () => {
    const el = await mount<CmButton>('<cm-button>Save</cm-button>');
    expect(el.hasAttribute('tone')).toBe(false);
    expect(el.tone).toBeUndefined();
    const cs = getComputedStyle(inner(el));
    // 1.5: secondary is white with the field outline (border-input), no longer grey with a black outline.
    expect(cs.backgroundColor).toBe(token('bg-surface'));
    expect(cs.color).toBe(token('text-default'));
    expect(cs.borderTopColor).toBe(token('border-input'));
    expect(inner(el).getBoundingClientRect().height).toBe(matchMedia('(pointer: coarse)').matches ? 44 : 36);
    const p = await mount<CmButton>('<cm-button variant="primary">Save</cm-button>');
    expect(getComputedStyle(inner(p)).backgroundColor).toBe(token('action-primary'));
    expect(getComputedStyle(inner(p)).color).toBe(token('action-primary-text'));
  });
  it('reflects tone and keeps the native button, name and size', async () => {
    const el = await mount<CmButton>('<cm-button tone="critical" size="slim">Not interested</cm-button>');
    expect(el.getAttribute('tone')).toBe('critical');
    expect(inner(el).tagName).toBe('BUTTON');
    expect(inner(el).getBoundingClientRect().height).toBe(matchMedia('(pointer: coarse)').matches ? 44 : 32);
    el.tone = 'success'; await el.updateComplete;
    expect(el.getAttribute('tone')).toBe('success');
  });

  for (const theme of ['light', 'dark']) {
    const attrs = `data-cm-theme="${theme}"`;
    it(`secondary tones (${theme}): tone text, icon and outline on bg-surface, AA contrast`, async () => {
      for (const [tone, text, border] of [['critical', 'text-critical', 'border-critical'], ['success', 'text-success', 'text-success']]) {
        const el = await mount<CmButton>(`<cm-button tone="${tone}" icon="check">Done</cm-button>`, attrs);
        const cs = getComputedStyle(inner(el));
        expect(cs.backgroundColor, tone).toBe(token('bg-surface'));
        expect(cs.color, tone).toBe(token(text));
        expect(cs.borderTopColor, tone).toBe(token(border));
        const icon = inner(el).querySelector('cm-icon')!;
        expect(getComputedStyle(icon).color, tone).toBe(token(text));
        expect(contrast(cs.color, cs.backgroundColor), tone).toBeGreaterThanOrEqual(4.5);
        for (const surface of ['bg-surface', 'bg-page']) expect(contrast(cs.borderTopColor, token(surface)), `${tone} on ${surface}`).toBeGreaterThanOrEqual(3);
      }
    });
    it(`primary tones (${theme}): filled in the tone with a readable label, darker-or-lighter hover keeps AA`, async () => {
      for (const [tone, fill] of [['critical', 'text-critical'], ['success', 'text-success']]) {
        const el = await mount<CmButton>(`<cm-button variant="primary" tone="${tone}">Go</cm-button>`, attrs);
        const cs = getComputedStyle(inner(el));
        expect(cs.backgroundColor, tone).toBe(token(fill));
        expect(cs.color, tone).toBe(token('action-primary-text'));
        const restBg = cs.backgroundColor; // computed styles are live: keep the value before hovering
        const rest = contrast(cs.color, restBg);
        expect(rest, tone).toBeGreaterThanOrEqual(4.5);
        await userEvent.hover(inner(el));
        const hover = getComputedStyle(inner(el));
        expect(hover.backgroundColor, tone).not.toBe(restBg);
        expect(contrast(hover.color, hover.backgroundColor), tone).toBeGreaterThanOrEqual(rest);
        await userEvent.unhover(inner(el));
      }
    });
  }
  it('secondary hover fills with the soft tone', async () => {
    const el = await mount<CmButton>('<cm-button tone="critical">Not interested</cm-button>');
    await userEvent.hover(inner(el));
    expect(getComputedStyle(inner(el)).backgroundColor).toBe(token('bg-critical'));
    const s = await mount<CmButton>('<cm-button tone="success">Sale closed</cm-button>');
    await userEvent.hover(inner(s));
    expect(getComputedStyle(inner(s)).backgroundImage).toContain('gradient');
    await userEvent.unhover(inner(s));
  });
  it('disabled and loading look the same with or without a tone', async () => {
    for (const v of ['secondary', 'primary']) {
      for (const state of ['disabled', 'loading']) {
        const el = await mount<CmButton>(`<cm-button variant="${v}" tone="critical" ${state}>Delete</cm-button>`);
        const cs = getComputedStyle(inner(el));
        expect(cs.backgroundColor, `${v} ${state}`).toBe(token('action-disabled'));
        expect(cs.color, `${v} ${state}`).toBe(token('action-disabled-text'));
      }
    }
  });
  it('an unknown tone falls back to the standard look', async () => {
    const el = await mount<CmButton>('<cm-button variant="primary" tone="warning">Go</cm-button>');
    expect(getComputedStyle(inner(el)).backgroundColor).toBe(token('action-primary'));
  });
  it('keeps the focus ring of the other buttons', async () => {
    const el = await mount<CmButton>('<cm-button tone="success">Sale closed</cm-button>');
    await userEvent.tab();
    const cs = getComputedStyle(inner(el));
    expect(cs.outlineStyle).toBe('solid');
    expect(cs.outlineColor).toBe(token('border-strong'));
  });
});

describe('cm-empty-state size="inline" (1.2)', () => {
  it('default (large) rendering is unchanged: the circle, centred, no text action', async () => {
    const el = await mount<CmEmptyState>('<cm-empty-state heading="No products"></cm-empty-state>');
    expect(el.size).toBe('large');
    expect(shadow(el, '.circle').getBoundingClientRect().width).toBe(innerWidth > 640 ? 160 : 120);
    expect(getComputedStyle(shadow(el, '.wrap')).alignItems).toBe('center');
    expect(shadow(el, '.text-action')).toBeNull();
    expect(el.shadowRoot!.querySelectorAll('.actions').length).toBe(1);
  });
  it('is one line: no circle, a 20px icon, start-aligned, heading still a heading', async () => {
    const el = await mount<CmEmptyState>('<cm-empty-state size="inline" icon="tasks" heading="Nothing due today." heading-level="3">4 later.</cm-empty-state>');
    expect(shadow(el, '.circle')).toBeNull();
    const icon = shadow(el, '.icon');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getBoundingClientRect().width).toBe(20);
    expect(icon.getBoundingClientRect().height).toBe(20);
    expect((icon.querySelector('cm-icon') as any).size).toBe(20);
    const heading = shadow(el, '[role=heading]');
    expect(heading.getAttribute('aria-level')).toBe('3');
    const host = el.getBoundingClientRect();
    expect(host.height).toBeLessThanOrEqual(24);
    // Starts at the left edge of its container (no centring, no padding).
    expect(Math.round(icon.getBoundingClientRect().left)).toBe(Math.round(host.left));
    // Heading and text share the line.
    const text = shadow(el, '.text');
    expect(text.hidden).toBe(false);
    expect(Math.abs(heading.getBoundingClientRect().top - text.getBoundingClientRect().top)).toBeLessThan(4);
    expect(getComputedStyle(heading).fontWeight).toBe('500');
    expect(getComputedStyle(text).color).toBe(token('text-tertiary'));
  });
  it('is much shorter than size="small", and wraps to two lines inside a narrow card', async () => {
    const small = await mount<CmEmptyState>('<cm-empty-state size="small" heading="Nothing due today."></cm-empty-state>');
    const smallH = small.getBoundingClientRect().height;
    const el = await mount<CmEmptyState>('<cm-empty-state size="inline" icon="" heading="No follow-ups.">Customers you call back appear here when they are due.</cm-empty-state>');
    const h = el.getBoundingClientRect().height;
    expect(smallH).toBeGreaterThan(150); // 120px circle + heading (1.5.0 scale)
    expect(h).toBeGreaterThan(30);
    expect(h).toBeLessThanOrEqual(48);
    expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth + 1);
  });
  it('icon="" leaves text only', async () => {
    const el = await mount<CmEmptyState>('<cm-empty-state size="inline" icon="" heading="No chats waiting."></cm-empty-state>');
    expect(shadow(el, '.icon').hidden).toBe(true);
    expect(Math.round(shadow(el, '[role=heading]').getBoundingClientRect().left)).toBe(Math.round(el.getBoundingClientRect().left));
  });
  it('a text action is a real button that fires cm-action, at least 24px tall', async () => {
    const el = await mount<CmEmptyState>('<cm-empty-state size="inline" heading="Nothing due today." action="Add task"></cm-empty-state>');
    const btn = shadow(el, '.text-action');
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('type')).toBe('button');
    expect(btn.textContent).toBe('Add task');
    expect(btn.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
    expect(getComputedStyle(btn).textDecorationLine).toBe('underline');
    let fired = 0;
    document.body.addEventListener('cm-action', () => fired++);
    await userEvent.click(btn);
    expect(fired).toBe(1);
  });
  it('action-href makes it a link', async () => {
    const el = await mount<CmEmptyState>('<cm-empty-state size="inline" heading="No tasks." action="View all" action-href="/tasks"></cm-empty-state>');
    const a = shadow(el, '.text-action') as HTMLAnchorElement;
    expect(a.tagName).toBe('A');
    expect(a.getAttribute('href')).toBe('/tasks');
  });
  it('the actions slot still works inline', async () => {
    const el = await mount<CmEmptyState>('<cm-empty-state size="inline" heading="No tasks."><cm-button slot="actions" size="slim">Add</cm-button></cm-empty-state>');
    expect(shadow(el, '.actions').hidden).toBe(false);
  });
  it('lays out right to left', async () => {
    const el = await mount<CmEmptyState>('<cm-empty-state size="inline" icon="tasks" heading="Nothing due today."></cm-empty-state>', 'dir="rtl"');
    const host = el.getBoundingClientRect();
    expect(Math.round(shadow(el, '.icon').getBoundingClientRect().right)).toBe(Math.round(host.right));
  });
});
