import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../src/index.js';
import { showToast, type CmToast, type CmToastRegion, type CmSpinner, type CmProgressBar } from '../src/index.js';

const mount = async <T extends HTMLElement>(markup: string): Promise<T> => {
  document.body.innerHTML = markup;
  const el = document.body.firstElementChild as T;
  await (el as any).updateComplete;
  if (el.localName === 'cm-toast') { // a lone toast fills its live region after a moment
    if (vi.isFakeTimers()) vi.advanceTimersByTime(200); else await settle();
    await (el as any).updateComplete;
  }
  return el;
};
const settle = () => new Promise((r) => setTimeout(r, 200));
const shadow = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;

beforeEach(() => { document.body.innerHTML = ''; });
afterEach(() => { vi.useRealTimers(); });

describe('cm-toast', () => {
  it('alone, puts its text into a live region that already exists, so the first message is read', async () => {
    document.body.innerHTML = '<cm-toast message="Product saved"></cm-toast>';
    const el = document.body.firstElementChild as CmToast;
    await el.updateComplete;
    const live = shadow(el, '[role=status]');
    expect(live.textContent!.trim()).toBe('');
    expect(live.getAttribute('aria-atomic')).toBe('false');
    await settle(); await el.updateComplete;
    expect(shadow(el, '[role=status]')).toBe(live);
    expect(live.textContent).toContain('Product saved');
  });

  it('announces itself in a polite status region when used alone', async () => {
    const el = await mount<CmToast>('<cm-toast message="Product saved"></cm-toast>');
    const live = shadow(el, '[role=status]');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toContain('Product saved');
    expect(shadow(el, '.close').getAttribute('aria-label')).toBe('Dismiss');
  });

  it('clamps the duration to 2–10 s, and stays 10 s by default with an action', async () => {
    const el = await mount<CmToast>('<cm-toast message="Saved"></cm-toast>');
    expect(el.effectiveDuration).toBe(5000);
    el.duration = 500; expect(el.effectiveDuration).toBe(2000);
    el.duration = 60000; expect(el.effectiveDuration).toBe(10000);
    el.duration = undefined; el.actionLabel = 'Undo'; expect(el.effectiveDuration).toBe(10000);
  });

  it('closes after its duration with reason timeout', async () => {
    vi.useFakeTimers();
    const el = await mount<CmToast>('<cm-toast message="Saved" duration="2000"></cm-toast>');
    const reasons: string[] = [];
    el.addEventListener('cm-dismiss', (e) => reasons.push((e as CustomEvent).detail.reason));
    vi.advanceTimersByTime(1900);
    expect(el.open).toBe(true);
    vi.advanceTimersByTime(200);
    expect(el.open).toBe(false);
    expect(reasons).toEqual(['timeout']);
  });

  it('pauses while hovered or focused, and resumes after', async () => {
    vi.useFakeTimers();
    const el = await mount<CmToast>('<cm-toast message="Saved" duration="2000"></cm-toast>');
    vi.advanceTimersByTime(1000);
    el.dispatchEvent(new PointerEvent('pointerenter'));
    vi.advanceTimersByTime(20000);
    expect(el.open).toBe(true);
    el.dispatchEvent(new PointerEvent('pointerleave'));
    vi.advanceTimersByTime(900);
    expect(el.open).toBe(true);
    vi.advanceTimersByTime(200);
    expect(el.open).toBe(false);

    el.open = true; await el.updateComplete;
    (shadow(el, '.close') as HTMLButtonElement).focus();
    vi.advanceTimersByTime(20000);
    expect(el.open).toBe(true);
  });

  it('fires cm-action then closes, unless cancelled; close and dismissal are cancelable', async () => {
    const el = await mount<CmToast>('<cm-toast message="Order archived" action-label="Undo"></cm-toast>');
    const action = shadow(el, '.action') as HTMLButtonElement;
    expect(action.textContent).toBe('Undo');
    el.addEventListener('cm-action', (e) => e.preventDefault(), { once: true });
    action.click();
    expect(el.open).toBe(true);
    const reasons: string[] = [];
    el.addEventListener('cm-dismiss', (e) => reasons.push((e as CustomEvent).detail.reason));
    action.click();
    expect(el.open).toBe(false);
    el.open = true; await el.updateComplete;
    el.addEventListener('cm-dismiss', (e) => e.preventDefault(), { once: true });
    (shadow(el, '.close') as HTMLButtonElement).click();
    expect(el.open).toBe(true);
    (shadow(el, '.close') as HTMLButtonElement).click();
    expect(el.open).toBe(false);
    expect(reasons).toEqual(['action', 'close', 'close']);
  });

  it('shows an icon for critical toasts', async () => {
    const el = await mount<CmToast>('<cm-toast message="Couldn\'t save" tone="critical"></cm-toast>');
    expect(shadow(el, 'cm-icon')).toBeTruthy();
  });
});

describe('showToast()', () => {
  it('creates one polite region and adds toasts to it as text', async () => {
    const t = showToast('<b>Saved</b>');
    const region = document.querySelector('cm-toast-region') as CmToastRegion;
    // A new region is in the page before its first toast, so that toast is announced.
    expect(region).toBeTruthy();
    expect(region.children.length).toBe(0);
    expect(region.getAttribute('aria-atomic')).toBe('false');
    await settle();
    await t.updateComplete;
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(t.parentElement).toBe(region);
    expect(shadow(t, '[role=status]')).toBeNull(); // the region announces, not each toast
    expect(shadow(t, '.message').textContent).toContain('<b>Saved</b>');
    expect(t.querySelector('b')).toBeNull();
    showToast('Second');
    expect(document.querySelectorAll('cm-toast-region').length).toBe(1);
  });

  it('keeps at most three, runs the action, and removes closed toasts', async () => {
    const onAction = vi.fn();
    const toasts = ['One', 'Two', 'Three', 'Four'].map((m, i) => showToast(m, i === 3 ? { action: { label: 'Undo', onAction } } : {}));
    const region = document.querySelector('cm-toast-region')!;
    expect([...region.querySelectorAll('cm-toast')].map((t) => (t as CmToast).message)).toEqual(['Two', 'Three', 'Four']);
    await toasts[3].updateComplete;
    (shadow(toasts[3], '.action') as HTMLButtonElement).click();
    expect(onAction).toHaveBeenCalledOnce();
    await Promise.resolve();
    expect(toasts[3].isConnected).toBe(false);
  });

  it('passes tone and duration on', async () => {
    const t = showToast('Couldn\'t save', { tone: 'critical', duration: 8000 });
    expect(t.tone).toBe('critical');
    expect(t.effectiveDuration).toBe(8000);
  });
});

describe('cm-spinner', () => {
  it('shows a slotted graphic instead of the arc, keeping the status, the label and the size', async () => {
    const el = await mount<CmSpinner>('<cm-spinner size="small" accessible-label="Loading orders"><svg aria-hidden="true" viewBox="0 0 60 10"><rect width="60" height="10"/></svg></cm-spinner>');
    await settle(); await el.updateComplete;
    expect(shadow(el, 'svg')).toBeNull();
    expect(shadow(el, '[role=status]').textContent).toContain('Loading orders');
    const g = el.querySelector('svg')!.getBoundingClientRect();
    expect(g.height).toBe(12);
    expect(g.width).toBe(72);
    el.size = 'large'; await el.updateComplete;
    expect(el.querySelector('svg')!.getBoundingClientRect().height).toBe(20);
    expect(getComputedStyle(el.querySelector('svg')!).getPropertyValue('--cm-spinner-duration').trim()).toBe('0.8s');
    el.innerHTML = ''; await settle(); await el.updateComplete;
    expect(shadow(el, 'svg')).not.toBeNull();
  });
  it('is a status with a text label', async () => {
    const el = await mount<CmSpinner>('<cm-spinner></cm-spinner>');
    expect(shadow(el, '[role=status]').textContent).toContain('Loading');
    expect(shadow(el, 'svg').getAttribute('aria-hidden')).toBe('true');
    el.accessibleLabel = 'Loading orders'; await el.updateComplete;
    expect(shadow(el, '[role=status]').textContent).toContain('Loading orders');
  });
  it('has two sizes', async () => {
    const el = await mount<CmSpinner>('<cm-spinner size="small"></cm-spinner>');
    expect(shadow(el, 'svg').getBoundingClientRect().width).toBe(20);
    el.size = 'large'; await el.updateComplete;
    expect(shadow(el, 'svg').getBoundingClientRect().width).toBe(44);
  });
});

describe('cm-progress-bar', () => {
  it('is a labelled progressbar with its value', async () => {
    const el = await mount<CmProgressBar>('<cm-progress-bar label="Importing products" value="42.4" show-value></cm-progress-bar>');
    const bar = shadow(el, '[role=progressbar]');
    expect(bar.getAttribute('aria-valuenow')).toBe('42');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    const label = el.shadowRoot!.getElementById(bar.getAttribute('aria-labelledby')!)!;
    expect(label.textContent).toBe('Importing products');
    expect(shadow(el, '.value').textContent).toBe('42%');
  });
  it('clamps the value', async () => {
    const el = await mount<CmProgressBar>('<cm-progress-bar label="x" value="140"></cm-progress-bar>');
    expect(shadow(el, '[role=progressbar]').getAttribute('aria-valuenow')).toBe('100');
    el.value = -5; await el.updateComplete;
    expect(shadow(el, '[role=progressbar]').getAttribute('aria-valuenow')).toBe('0');
  });
  it('is indeterminate without a value', async () => {
    const el = await mount<CmProgressBar>('<cm-progress-bar label="Syncing" show-value></cm-progress-bar>');
    const bar = shadow(el, '[role=progressbar]');
    expect(bar.hasAttribute('aria-valuenow')).toBe(false);
    expect(bar.classList.contains('indeterminate')).toBe(true);
    expect(shadow(el, '.value')).toBeNull();
  });
  it('can hide its label visually but keep the name', async () => {
    const el = await mount<CmProgressBar>('<cm-progress-bar label="Uploading" label-hidden value="10"></cm-progress-bar>');
    expect(shadow(el, '.head').classList.contains('vh')).toBe(true);
    expect(shadow(el, '[role=progressbar]').getAttribute('aria-labelledby')).toBeTruthy();
  });
});
