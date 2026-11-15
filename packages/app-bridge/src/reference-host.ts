import { createHost, type Host, type HostConfig, type HostHandlers } from './host.js';
import type { PickedResource, ResourcePickerOptions, ModalOptions, ModalResult } from './protocol.js';

/**
 * A reference admin-side implementation, built from Commmerce UI components (`cm-toast`, `cm-progress-bar`,
 * `cm-modal`, `cm-save-bar`, `cm-button`, `cm-checkbox`, `cm-radio-group`): load `@commmerce/ui` and `@commmerce/tokens` on the page first.
 * The Commmerce admin uses its own wiring; this shows how each request should look and behave, and is what
 * the docs example runs.
 */
export interface ReferenceHostConfig extends Omit<HostConfig, 'handlers'> {
  /** Where toasts, modals, the save bar and the loading bar are added. Default `document.body`. */
  root?: HTMLElement;
  /** Update the admin's address. Default: `history.pushState` / `replaceState` with `#<path>`. */
  navigate?: (path: string, replace: boolean) => void;
  /** The candidates the resource picker lists. Without it, the picker answers `not-supported`. */
  resources?: (type: ResourcePickerOptions['type']) => Promise<PickedResource[]> | PickedResource[];
  /** Fetch a session token from the admin's backend. Without it, `getSessionToken` answers `not-supported`. */
  sessionToken?: () => Promise<string>;
}

const TYPE_NAMES = { product: 'products', customer: 'customers', collection: 'collections' } as const;

function el<K extends string>(tag: K, attrs: Record<string, string | boolean> = {}, text?: string): HTMLElement {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== false) e.setAttribute(k, v === true ? '' : v);
  if (text !== undefined) e.textContent = text; // app strings are always text, never HTML
  return e;
}

/** Shows `modal` and resolves with how it closed. */
function runModal(root: HTMLElement, heading: string, body: HTMLElement, actions: { label: string; value: string; primary?: boolean }[]) {
  return new Promise<string>((resolve) => {
    const modal = el('cm-modal', { heading }) as HTMLElement & { show(): void; close(): void };
    modal.append(body);
    let value = 'close';
    for (const a of actions) {
      const b = el('cm-button', { slot: 'footer', variant: a.primary ? 'primary' : 'secondary' }, a.label);
      b.addEventListener('click', () => { value = a.value; modal.close(); });
      modal.append(b);
    }
    modal.addEventListener('cm-closed', () => { modal.remove(); resolve(value); });
    root.append(modal);
    modal.show();
  });
}

/** Connects the app in `iframe` to admin-level UI made from Commmerce UI components. */
export function createReferenceHost(config: ReferenceHostConfig): Host {
  const root = config.root ?? document.body;
  let host: Host;

  // Toasts: a cm-toast-region (a polite status region, bottom centre) holding cm-toasts.
  const toasts = el('cm-toast-region', { 'data-app-bridge': 'toasts', max: '1' }) as HTMLElement & { add(t: HTMLElement): HTMLElement };
  // The loading bar: an indeterminate cm-progress-bar along the top edge.
  const bar = el('cm-progress-bar', { label: 'Loading', 'label-hidden': true, size: 'small', hidden: true, 'data-app-bridge': 'loading' });
  bar.style.cssText = 'position:fixed;inset-block-start:0;inset-inline:0;z-index:1000';
  const saveBar = el('cm-save-bar', { 'data-app-bridge': 'save-bar' }) as HTMLElement & Record<string, unknown>;
  saveBar.addEventListener('cm-save', (e) => { e.preventDefault(); host.send('saveBar.save', {}); });
  saveBar.addEventListener('cm-discard', (e) => { e.preventDefault(); host.send('saveBar.discard', {}); });
  root.append(toasts, bar, saveBar);

  const handlers: Partial<HostHandlers> = {
    toast({ message, tone = 'default', duration = 5000 }) {
      const t = el('cm-toast', { 'data-tone': tone }) as HTMLElement & { message: string; tone: string; duration: number };
      t.message = message; // a property, rendered as text: app strings never become HTML
      t.tone = tone === 'critical' ? 'critical' : 'default';
      t.duration = duration;
      toasts.add(t);
    },
    async modal({ title, message, primaryAction, secondaryAction }: ModalOptions) {
      const actions = [];
      if (secondaryAction) actions.push({ label: secondaryAction.label, value: 'secondary' });
      if (primaryAction) actions.push({ label: primaryAction.label, value: 'primary', primary: true });
      return await runModal(root, title, el('p', {}, message), actions) as ModalResult;
    },
    navigate({ path, replace }) {
      if (config.navigate) return config.navigate(path, !!replace);
      const url = `${location.pathname}${location.search}#${path}`;
      if (replace) history.replaceState(history.state, '', url); else history.pushState(history.state, '', url);
    },
    saveBar(options) {
      if (!options) { saveBar.open = false; return; }
      saveBar.message = options.message ?? 'Unsaved changes';
      if (options.saveLabel) saveBar.saveLabel = options.saveLabel;
      if (options.discardLabel) saveBar.discardLabel = options.discardLabel;
      saveBar.loading = !!options.loading;
      saveBar.open = true;
    },
    loading(on) { bar.hidden = !on; },
  };
  if (config.resources) {
    const resources = config.resources;
    handlers.resourcePicker = async ({ type, multiple }) => {
      const items = await resources(type);
      const list = el(multiple ? 'div' : 'cm-radio-group', multiple ? {} : { label: `Choose ${type}` });
      list.style.cssText = 'display:grid;gap:var(--cm-space-10,10px)';
      for (const item of items) list.append(el(multiple ? 'cm-checkbox' : 'cm-radio', { label: item.title, value: item.id }));
      const choice = await runModal(root, `Select ${TYPE_NAMES[type]}`, list, [
        { label: 'Cancel', value: 'secondary' }, { label: 'Select', value: 'primary', primary: true }]);
      if (choice !== 'primary') return null;
      const chosen = [...list.querySelectorAll<HTMLElement & { checked: boolean; value: string }>('cm-checkbox, cm-radio')]
        .filter((c) => c.checked).map((c) => c.value);
      return items.filter((i) => chosen.includes(i.id));
    };
  }
  if (config.sessionToken) handlers.sessionToken = config.sessionToken;

  host = createHost({ ...config, handlers });
  const destroy = host.destroy;
  return Object.assign(Object.create(null), {
    send: host.send,
    get connected() { return host.connected; },
    destroy() { destroy(); toasts.remove(); bar.remove(); saveBar.remove(); },
  }) as Host;
}
