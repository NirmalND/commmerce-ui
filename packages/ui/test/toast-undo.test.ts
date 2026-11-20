import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { userEvent } from '@vitest/browser/context';
import '../src/index.js';
import { showToast, undoable, setStrings, resetStrings, type CmToast, type CmToastRegion } from '../src/index.js';

/** "Undo instead of confirm" (1.7): toast actions, `closed`, keyboard reach, the undoable() helper. */

const shadow = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
const deepActive = () => {
  let a = document.activeElement as Element | null;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a;
};
/** A page with a field and an existing toast region, so showToast() adds toasts at once. */
const page = async (dir = 'ltr') => {
  // The real pointer is shared with test files running beside this one: if it rests where a toast appears, the
  // toast counts as hovered and pauses its timer, so a timeout test waits forever (CI, 19 Nov 2026). Hover is
  // tested with dispatched pointer events, which pointer-events: none doesn't block.
  document.body.innerHTML = `<style>cm-toast { pointer-events: none; }</style><div dir="${dir}"><input id="f" aria-label="Lead name"><cm-toast-region></cm-toast-region></div>`;
  const region = document.querySelector('cm-toast-region') as CmToastRegion;
  await region.updateComplete;
  return { region, input: document.getElementById('f') as HTMLInputElement, root: document.querySelector('div') as HTMLElement };
};
const show = async (message: string, opts: Parameters<typeof showToast>[1] = {}, root?: HTMLElement) => {
  const t = showToast(message, { root, ...opts });
  await t.updateComplete;
  return t;
};

beforeEach(() => { document.body.innerHTML = ''; });
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

describe('toast action and closed', () => {
  it('pressing the action runs the handler, closes the toast and resolves closed with action', async () => {
    const { root } = await page();
    const onAction = vi.fn();
    const t = await show('Lead archived', { action: { label: 'Undo', onAction } }, root);
    const closed = t.closed;
    expect(shadow(t, '.action').textContent).toBe('Undo');
    shadow(t, '.action').click();
    expect(onAction).toHaveBeenCalledOnce();
    await expect(closed).resolves.toBe('action');
    await Promise.resolve();
    expect(t.isConnected).toBe(false);
  });

  it('times out after its duration (10 s by default with an action) and resolves closed with timeout', async () => {
    vi.useFakeTimers();
    const { root } = await page();
    const onAction = vi.fn();
    const t = await show('Lead archived', { action: { label: 'Undo', onAction } }, root);
    const closed = t.closed;
    vi.advanceTimersByTime(9900);
    expect(t.open).toBe(true);
    vi.advanceTimersByTime(200);
    await expect(closed).resolves.toBe('timeout');
    expect(onAction).not.toHaveBeenCalled();
  });

  it('dismiss() closes it with close; a toast pushed out by newer ones resolves removed', async () => {
    const { root } = await page();
    const a = await show('One', {}, root);
    const closedA = a.closed;
    expect(a.dismiss()).toBe(true);
    await expect(closedA).resolves.toBe('close');
    await expect(a.closed).resolves.toBe('close'); // asked again after closing

    const first = await show('Lead archived', { action: { label: 'Undo', onAction: () => {} } }, root);
    const closedFirst = first.closed;
    for (const m of ['Two', 'Three', 'Four']) await show(m, {}, root);
    await expect(closedFirst).resolves.toBe('removed');
  });

  it('pauses its timer while hovered or focused', async () => {
    vi.useFakeTimers();
    const { root } = await page();
    const t = await show('Lead archived', { action: { label: 'Undo', onAction: () => {} } }, root);
    vi.advanceTimersByTime(5000);
    t.dispatchEvent(new PointerEvent('pointerenter'));
    vi.advanceTimersByTime(60000);
    expect(t.open).toBe(true);
    t.dispatchEvent(new PointerEvent('pointerleave'));
    vi.advanceTimersByTime(4900);
    expect(t.open).toBe(true);
    shadow(t, '.action').focus();
    vi.advanceTimersByTime(60000);
    expect(t.open).toBe(true);
    shadow(t, '.action').blur();
    vi.advanceTimersByTime(1100); // at least 1 s is left after a pause
    expect(t.open).toBe(false);
  });
});

describe('toast keyboard reach', () => {
  it('F6 moves focus to the newest toast action and back; Enter on it returns focus', async () => {
    const { input, root } = await page();
    const onAction = vi.fn();
    const t = await show('Lead archived', { action: { label: 'Undo', onAction } }, root);
    input.focus();
    await userEvent.keyboard('{F6}');
    expect(deepActive()).toBe(shadow(t, '.action'));
    await userEvent.keyboard('{F6}');
    expect(document.activeElement).toBe(input);
    await userEvent.keyboard('{F6}');
    await userEvent.keyboard('{Enter}');
    expect(onAction).toHaveBeenCalledOnce();
    await Promise.resolve(); await Promise.resolve();
    expect(t.isConnected).toBe(false);
    expect(document.activeElement).toBe(input); // focus is not lost when the toast goes
  });

  it('Esc closes the focused toast and gives focus back', async () => {
    const { input, root } = await page();
    const t = await show('Lead archived', { action: { label: 'Undo', onAction: () => {} } }, root);
    const closed = t.closed;
    input.focus();
    await userEvent.keyboard('{F6}');
    await userEvent.keyboard('{Escape}');
    await expect(closed).resolves.toBe('close');
    await Promise.resolve(); await Promise.resolve();
    expect(document.activeElement).toBe(input);
  });

  it('with several toasts, F6 picks the newest one that has an action; focus survives it being pushed out', async () => {
    const { input, region, root } = await page();
    await show('Saved', {}, root);
    const undo = await show('Lead archived', { action: { label: 'Undo', onAction: () => {} } }, root);
    await show('Note added', {}, root);
    input.focus();
    expect(region.focusToast()).toBe(true);
    expect(deepActive()).toBe(shadow(undo, '.action'));
    for (const m of ['A', 'B']) await show(m, {}, root); // pushes the focused toast out (max 3)
    expect(undo.isConnected).toBe(false);
    expect(document.activeElement).toBe(input);
  });

  it('F6 does nothing (and is not swallowed) when no toast is open', async () => {
    const { input, region } = await page();
    input.focus();
    expect(region.focusToast()).toBe(false);
    const ev = new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true });
    input.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });
});

describe('toast announcement', () => {
  it('is announced politely by the labelled region, with the action and how to reach it', async () => {
    const { region, root } = await page();
    const t = await show('Lead archived', { action: { label: 'Undo', onAction: () => {} } }, root);
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('aria-label')).toBe('Notifications');
    expect(shadow(t, '.message').textContent).toContain('Lead archived');
    expect(shadow(t, '.action').getAttribute('aria-keyshortcuts')).toBe('F6');
    expect(shadow(t, '.hint').textContent).toBe('Press F6 to reach it.');
    // Visually hidden, not display: none, so it is read.
    expect(shadow(t, '.hint').getBoundingClientRect().width).toBeLessThanOrEqual(1);
    const plain = await show('Saved', {}, root);
    expect(shadow(plain, '.hint')).toBeNull();
  });

  it('the action button is 32px tall inside the toast and the toast keeps one row', async () => {
    const { root } = await page();
    const t = await show('Lead archived', { action: { label: 'Undo', onAction: () => {} } }, root);
    expect(shadow(t, '.action').getBoundingClientRect().height).toBeGreaterThanOrEqual(32);
    expect(shadow(t, '.toast').getBoundingClientRect().height).toBeLessThanOrEqual(56);
  });
});

describe('toast right to left', () => {
  it('puts the message on the right, then the action, then Dismiss on the far left', async () => {
    const { root } = await page('rtl');
    const t = await show('Lead archived', { action: { label: 'Undo', onAction: () => {} } }, root);
    const x = (sel: string) => shadow(t, sel).getBoundingClientRect().left;
    expect(x('.message')).toBeGreaterThan(x('.action'));
    expect(x('.action')).toBeGreaterThan(x('.close'));
  });
});

describe('undoable()', () => {
  it('acts at once, shows the message with Undo, and undoes on Undo', async () => {
    const { root } = await page();
    const doIt = vi.fn(); const undoIt = vi.fn();
    const done = undoable(doIt, undoIt, { message: 'Lead archived', root });
    expect(doIt).toHaveBeenCalledOnce();
    await Promise.resolve(); await Promise.resolve();
    const t = root.querySelector('cm-toast') as CmToast;
    await t.updateComplete;
    expect(t.message).toBe('Lead archived');
    expect(shadow(t, '.action').textContent).toBe('Undo');
    shadow(t, '.action').click();
    await expect(done).resolves.toBe('action');
    expect(undoIt).toHaveBeenCalledOnce();
  });

  it('does not undo on timeout; takes another label; shows nothing if the action fails', async () => {
    vi.useFakeTimers();
    const { root } = await page();
    const undoIt = vi.fn();
    const done = undoable(() => {}, undoIt, { message: 'Task marked done', undoLabel: 'Reopen', duration: 2000, root });
    await vi.advanceTimersByTimeAsync(0);
    const t = root.querySelector('cm-toast') as CmToast;
    await t.updateComplete;
    expect(shadow(t, '.action').textContent).toBe('Reopen');
    await vi.advanceTimersByTimeAsync(2100);
    await expect(done).resolves.toBe('timeout');
    expect(undoIt).not.toHaveBeenCalled();

    await expect(undoable(() => { throw new Error('offline'); }, undoIt, { message: 'Lead archived', root })).rejects.toThrow('offline');
    expect(root.querySelectorAll('cm-toast').length).toBe(0);
  });

  it('uses the translated Undo and keyboard hint', async () => {
    const { root } = await page();
    setStrings({ toast: { undo: 'Rückgängig', shortcut: 'Mit F6 erreichbar.' } });
    try {
      undoable(() => {}, () => {}, { message: 'Lead archiviert', root });
      await Promise.resolve(); await Promise.resolve();
      const t = root.querySelector('cm-toast') as CmToast;
      await t.updateComplete;
      expect(shadow(t, '.action').textContent).toBe('Rückgängig');
      expect(shadow(t, '.hint').textContent).toBe('Mit F6 erreichbar.');
    } finally { resetStrings(); }
  });
});
