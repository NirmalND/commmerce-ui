import { describe, it, expect, afterEach, vi } from 'vitest';
import '@commmerce/ui';
import { createReferenceHost, type Host } from '../src/index';
import { frame, win, until } from './helpers';

let host: Host | undefined;
afterEach(() => { host?.destroy(); host = undefined; document.body.replaceChildren(); history.replaceState(null, '', location.pathname + location.search); });

const shadowButton = (el: Element, text: string) =>
  [...(el.shadowRoot?.querySelectorAll('cm-button') ?? [])].find((b) => b.textContent?.trim() === text) as HTMLElement | undefined;

describe('reference host (Commmerce UI components)', () => {
  it('shows a toast as text in a polite status region', async () => {
    const f = await frame();
    host = createReferenceHost({ iframe: f, appOrigin: location.origin });
    const app = win(f).createApp({ hostOrigin: location.origin });
    await app.toast.show('<img src=x onerror=alert(1)> Saved', { tone: 'success' });
    const region = document.querySelector('[data-app-bridge="toasts"]')!;
    expect(region.localName).toBe('cm-toast-region');
    expect(region.getAttribute('role')).toBe('status');
    const toast = await until(() => region.querySelector('cm-toast')) as HTMLElement & { message: string; updateComplete: Promise<unknown> };
    await toast.updateComplete;
    expect(toast.message).toBe('<img src=x onerror=alert(1)> Saved');
    expect(toast.shadowRoot!.textContent).toContain('<img src=x onerror=alert(1)> Saved');
    expect(toast.shadowRoot!.querySelector('img')).toBeNull();
  });

  it('opens a cm-modal and resolves with the action chosen', async () => {
    const f = await frame();
    host = createReferenceHost({ iframe: f, appOrigin: location.origin });
    const app = win(f).createApp({ hostOrigin: location.origin });
    const result = app.modal.open({ title: 'Delete product?', message: 'This can\'t be undone.', primaryAction: { label: 'Delete' }, secondaryAction: { label: 'Cancel' } });
    const modal = await until(() => document.querySelector('cm-modal'));
    await until(() => modal.hasAttribute('open'));
    expect(modal.getAttribute('heading')).toBe('Delete product?');
    const buttons = [...modal.querySelectorAll('cm-button')];
    expect(buttons.map((b) => b.textContent)).toEqual(['Cancel', 'Delete']);
    (buttons[1] as HTMLElement).click();
    expect(await result).toBe('primary');
    await until(() => !document.querySelector('cm-modal'));
  });

  it('drives cm-save-bar and sends save to the app', async () => {
    const f = await frame();
    host = createReferenceHost({ iframe: f, appOrigin: location.origin });
    const app = win(f).createApp({ hostOrigin: location.origin });
    const save = vi.fn();
    app.on('saveBar.save', save);
    await app.saveBar.show({ message: 'Unsaved product' });
    const bar = document.querySelector('cm-save-bar') as HTMLElement & { open: boolean; updateComplete: Promise<unknown> };
    await bar.updateComplete;
    expect(bar.open).toBe(true);
    shadowButton(bar, 'Save')!.click();
    await until(() => save.mock.calls.length);
    await app.saveBar.hide();
    expect(bar.open).toBe(false);
  });

  it('updates the admin address and shows the loading bar', async () => {
    const f = await frame();
    host = createReferenceHost({ iframe: f, appOrigin: location.origin });
    const app = win(f).createApp({ hostOrigin: location.origin });
    await app.navigate('/reviews/9');
    expect(location.hash).toBe('#/reviews/9');
    await app.loading.start();
    expect((document.querySelector('[data-app-bridge="loading"]') as HTMLElement).hidden).toBe(false);
    await app.loading.stop();
    expect((document.querySelector('[data-app-bridge="loading"]') as HTMLElement).hidden).toBe(true);
  });

  it('picks resources in a modal, and returns null on cancel', async () => {
    const f = await frame();
    host = createReferenceHost({ iframe: f, appOrigin: location.origin, resources: () => [{ id: 'p1', title: 'Blue mug' }, { id: 'p2', title: 'Red mug' }] });
    const app = win(f).createApp({ hostOrigin: location.origin });
    const picked = app.resourcePicker({ type: 'product', multiple: true });
    const modal = await until(() => document.querySelector('cm-modal'));
    expect(modal.getAttribute('heading')).toBe('Select products');
    const boxes = await until(() => { const b = modal.querySelectorAll('cm-checkbox'); return b.length === 2 && b; });
    (boxes[1] as HTMLElement & { checked: boolean }).checked = true;
    (modal.querySelectorAll('cm-button')[1] as HTMLElement).click();
    expect(await picked).toEqual([{ id: 'p2', title: 'Red mug' }]);
    await until(() => !document.querySelector('cm-modal'));
    const cancelled = app.resourcePicker({ type: 'customer' });
    const m2 = await until(() => document.querySelector('cm-modal'));
    (m2.querySelectorAll('cm-button')[0] as HTMLElement).click();
    expect(await cancelled).toBeNull();
  });

  it('hands the #hash path back on connect and reports Back and Forward, but not the app\'s own moves', async () => {
    history.replaceState(null, '', location.pathname + location.search + '#/reviews/9');
    const f = await frame();
    host = createReferenceHost({ iframe: f, appOrigin: location.origin });
    const app = win(f).createApp({ hostOrigin: location.origin });
    expect((await app.ready).path).toBe('/reviews/9');
    const seen: string[] = [];
    app.on('path.change', ({ path }) => seen.push(path));
    await app.navigate('/reviews/10');
    expect(location.hash).toBe('#/reviews/10');
    history.back();
    await until(() => seen.length > 0);
    expect(seen).toEqual(['/reviews/9']);
    await new Promise((r) => setTimeout(r, 100));
    expect(seen).toEqual(['/reviews/9']); // navigate() itself was never echoed
  });

  it('sends / when the admin address has no app path', async () => {
    const f = await frame();
    host = createReferenceHost({ iframe: f, appOrigin: location.origin });
    expect((await win(f).createApp({ hostOrigin: location.origin }).ready).path).toBe('/');
  });
});
