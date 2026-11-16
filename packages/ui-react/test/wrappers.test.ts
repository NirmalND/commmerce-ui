import { describe, it, expect, afterEach, vi } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { version as reactDomVersion } from 'react-dom';
import { act } from 'react';
import * as Wrappers from '../src/index';
// The manifest `cem analyze` writes from the components' JSDoc: the same source as the docs properties tables.
import manifest from '../../ui/dist/custom-elements.json';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
declare const __EXPECTED_REACT_MAJOR__: string; // set by vitest.config.ts (18) and vitest.react19.config.ts (19)

it(`runs on React ${__EXPECTED_REACT_MAJOR__} (react and react-dom)`, () => {
  expect(React.version.split('.')[0]).toBe(__EXPECTED_REACT_MAJOR__);
  expect(reactDomVersion).toBe(React.version);
});

type Member = { kind: string; name: string; static?: boolean; privacy?: string; readonly?: boolean; type?: { text: string } };
type Decl = { tagName?: string; name: string; members?: Member[]; events?: { name: string; description?: string }[] };

const declarations = new Map<string, Decl>();
for (const mod of (manifest as any).modules) {
  for (const d of (mod.declarations ?? []) as Decl[]) if (d.tagName) declarations.set(d.tagName, d);
}

const wrappers = Object.entries(Wrappers).filter(([, v]) => typeof v === 'object' && v !== null && '$$typeof' in (v as object)) as [string, React.ComponentType<any>][];

let root: Root | undefined;
let host: HTMLElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = host = undefined;
});

function render(node: React.ReactElement): HTMLElement {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  act(() => root!.render(node));
  return host;
}

/** `cm-page-change` -> `onPageChange`, `change` -> `onChange`: the naming rule every wrapper follows. */
const handlerName = (event: string) =>
  'on' + event.replace(/^cm-/, '').split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('');

/** A value different from the default for a property's declared type, or undefined if the type is not a primitive. */
function sampleValue(type: string): unknown {
  const t = type.replace(/\s*\|\s*(undefined|null)\b/g, '').trim();
  if (t === 'string') return 'test-value';
  if (t === 'boolean') return true;
  if (t === 'number') return 7;
  const literals = t.split('|').map((s) => s.trim());
  if (literals.length > 1 && literals.every((s) => /^'[^']*'$/.test(s))) return literals[literals.length - 1].slice(1, -1);
  return undefined;
}

const tagOf = (Wrapper: React.ComponentType<any>) => render(React.createElement(Wrapper)).firstElementChild!.localName;

describe('React wrappers', () => {
  const tags = new Map<string, string>();
  for (const [name, Wrapper] of wrappers) {
    tags.set(name, tagOf(Wrapper));
    act(() => root?.unmount());
    host?.remove();
  }

  it('there is one wrapper for every component in the manifest', () => {
    const wrapped = [...tags.values()].sort();
    expect(new Set(wrapped).size).toBe(wrapped.length);
    expect(wrapped).toEqual([...declarations.keys()].sort());
  });

  for (const [name, Wrapper] of wrappers) {
    const tag = tags.get(name)!;
    const decl = declarations.get(tag);
    if (!decl) continue;
    const props = (decl.members ?? []).filter(
      (m) => m.kind === 'field' && !m.static && !m.readonly && (m.privacy ?? 'public') === 'public' && !m.name.startsWith('_') && m.type,
    );
    // Documented events only (`@fires`). The analyzer also lists `name` where a helper dispatches a variable event
    // name, and native `click` is React's own `onClick` (a synthetic event, checked separately below).
    const events = [...new Set((decl.events ?? []).filter((e) => e.description && e.name !== 'click').map((e) => e.name))];

    describe(`${name} (<${tag}>)`, () => {
      it('passes every primitive property through to the element', () => {
        const values: Record<string, unknown> = {};
        for (const p of props) {
          const v = sampleValue(p.type!.text);
          if (v !== undefined) values[p.name] = v;
        }
        const el = render(React.createElement(Wrapper, values)).firstElementChild as any;
        for (const [k, v] of Object.entries(values)) expect(el[k], `${tag}.${k}`).toBe(v);
      });

      it('passes array and object properties by reference, not as attributes', () => {
        const values: Record<string, unknown> = {};
        for (const p of props) {
          if (sampleValue(p.type!.text) !== undefined) continue;
          if (/\[\]$|^Array</.test(p.type!.text.trim())) values[p.name] = [];
        }
        const el = render(React.createElement(Wrapper, values)).firstElementChild as any;
        for (const [k, v] of Object.entries(values)) {
          expect(el[k], `${tag}.${k}`).toBe(v);
          expect(el.getAttribute(k)).toBeNull();
        }
      });

      if (events.length) {
        it(`maps ${events.join(', ')} to ${events.map(handlerName).join(', ')}`, () => {
          const handlers: Record<string, ReturnType<typeof vi.fn>> = {};
          for (const e of events) handlers[handlerName(e)] = vi.fn();
          const el = render(React.createElement(Wrapper, handlers)).firstElementChild!;
          for (const e of events) {
            const event = new CustomEvent(e, { detail: { test: true }, bubbles: true, composed: true });
            el.dispatchEvent(event);
            const fn = handlers[handlerName(e)];
            expect(fn, `${tag} ${e}`).toHaveBeenCalledTimes(1);
            expect(fn.mock.calls[0][0]).toBe(event);
          }
        });
      }
    });
  }
});

describe('React behaviour', () => {
  const { TextField, Button, Select, Modal, Pagination, Checkbox, Combobox, DatePicker, DateRangePicker, GlobalSearch, NotificationPanel, HeaderBar } = Wrappers;

  it('renders children into the element (slots) and passes className, id and style', () => {
    const el = render(
      React.createElement(Button, { className: 'primary-cta', id: 'save', style: { marginTop: '3px' }, variant: 'primary' }, 'Save'),
    ).firstElementChild as HTMLElement;
    expect(el.localName).toBe('cm-button');
    expect(el.textContent).toBe('Save');
    expect(el.className).toBe('primary-cta');
    expect(el.id).toBe('save');
    expect(el.style.marginTop).toBe('3px');
  });

  it('forwards refs to the custom element', () => {
    const ref = React.createRef<HTMLElement>();
    render(React.createElement(TextField, { ref, label: 'Title' }));
    expect(ref.current?.localName).toBe('cm-text-field');
    expect((ref.current as any).label).toBe('Title');
  });

  it('controlled value: re-rendering with a new prop updates the element', () => {
    const el = render(React.createElement(TextField, { label: 'Title', value: 'one' })).firstElementChild as any;
    expect(el.value).toBe('one');
    act(() => root!.render(React.createElement(TextField, { label: 'Title', value: 'two' })));
    expect(el.value).toBe('two');
  });

  it('a state-driven component updates from its own events', async () => {
    function Field() {
      const [value, setValue] = React.useState('');
      return React.createElement(React.Fragment, null,
        React.createElement(TextField, { label: 'Title', value, onInput: (e: Event) => setValue((e.target as any).value) }),
        React.createElement('output', null, value));
    }
    const h = render(React.createElement(Field));
    const el = h.querySelector('cm-text-field') as any;
    await el.updateComplete;
    const input = el.shadowRoot.querySelector('input') as HTMLInputElement;
    act(() => {
      input.value = 'Shoes';
      input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    });
    expect(h.querySelector('output')!.textContent).toBe('Shoes');
    expect(el.value).toBe('Shoes');
  });

  it('icon-only Button with a count: props reach the element and name the inner button', async () => {
    const el = render(React.createElement(Button, { iconOnly: true, icon: 'bell', label: 'Notifications', count: 4 })).firstElementChild as any;
    await el.updateComplete;
    expect(el.hasAttribute('icon-only')).toBe(true);
    expect(el.shadowRoot.querySelector('button').getAttribute('aria-label')).toBe('Notifications, 4 unread');
    act(() => root!.render(React.createElement(Button, { iconOnly: true, icon: 'bell', label: 'Notifications' })));
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('.count')).toBeNull();
    expect(el.shadowRoot.querySelector('button').getAttribute('aria-label')).toBe('Notifications');
  });

  it('native click reaches onClick', () => {
    const onClick = vi.fn();
    const el = render(React.createElement(Button, { onClick }, 'Save')).firstElementChild as HTMLElement;
    act(() => el.click());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('swapping a handler on re-render calls only the new one', () => {
    const first = vi.fn();
    const second = vi.fn();
    const el = render(React.createElement(Pagination, { page: 1, total: 50, onPageChange: first })).firstElementChild!;
    act(() => root!.render(React.createElement(Pagination, { page: 1, total: 50, onPageChange: second })));
    el.dispatchEvent(new CustomEvent('cm-page-change', { detail: { page: 2 } }));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  // React 19 sets properties on custom elements itself and listens for `on*` props; the wrappers must behave the
  // same as under React 18, where @lit/react does all of it. These checks run in both (vitest.react19.config.ts).
  it('aria-*, data-* and unknown attributes stay attributes; known properties never become attributes', () => {
    const el = render(React.createElement(Button, { 'aria-label': 'Save product', 'data-testid': 'save', title: 'Save', variant: 'primary' }, 'Save'))
      .firstElementChild as any;
    expect(el.getAttribute('aria-label')).toBe('Save product');
    expect(el.getAttribute('data-testid')).toBe('save');
    expect(el.getAttribute('title')).toBe('Save');
    expect(el.variant).toBe('primary');
    expect(el.hasAttribute('onClick')).toBe(false);
  });

  it('turning a boolean property off and dropping a property both reach the element', async () => {
    const el = render(React.createElement(Button, { disabled: true, variant: 'primary' }, 'Save')).firstElementChild as any;
    await el.updateComplete;
    expect(el.disabled).toBe(true);
    expect(el.hasAttribute('disabled')).toBe(true);
    act(() => root!.render(React.createElement(Button, { disabled: false }, 'Save')));
    await el.updateComplete;
    expect(el.disabled).toBe(false);
    expect(el.hasAttribute('disabled')).toBe(false);
    expect(el.variant ?? undefined).toBeUndefined(); // dropped props are unset, as @lit/react documents
  });

  it('removing an event handler on re-render stops the calls, and an event is handled once', () => {
    const fn = vi.fn();
    const el = render(React.createElement(Pagination, { page: 1, total: 50, onPageChange: fn })).firstElementChild!;
    el.dispatchEvent(new CustomEvent('cm-page-change', { detail: { page: 2 } }));
    expect(fn).toHaveBeenCalledTimes(1); // not twice (React 19 also listens for on* props on custom elements)
    act(() => root!.render(React.createElement(Pagination, { page: 1, total: 50 })));
    el.dispatchEvent(new CustomEvent('cm-page-change', { detail: { page: 3 } }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('a callback ref gets the element on mount and null on unmount; children update', () => {
    const seen: (HTMLElement | null)[] = [];
    const ref = (node: HTMLElement | null) => { seen.push(node); };
    const h = render(React.createElement(Button, { ref }, 'Save'));
    const el = h.firstElementChild as HTMLElement;
    expect(seen).toEqual([el]);
    act(() => root!.render(React.createElement(Button, { ref }, 'Saved')));
    expect(el.textContent).toBe('Saved');
    act(() => root!.render(React.createElement('div')));
    expect(seen[seen.length - 1]).toBeNull();
  });

  it('Select takes options as an array property', async () => {
    const options = [{ value: 'a', label: 'Apples' }, { value: 'b', label: 'Bananas' }];
    const el = render(React.createElement(Select, { label: 'Fruit', options, value: 'b' })).firstElementChild as any;
    await el.updateComplete;
    expect(el.options).toBe(options);
    expect(el.value).toBe('b');
  });

  it('Combobox: options and values as array properties; onSearch and onChange fire from typing and choosing', async () => {
    const onSearch = vi.fn();
    const onChange = vi.fn();
    const options = [{ value: 'cotton', label: 'Cotton' }, { value: 'silk', label: 'Silk' }];
    const values = ['silk'];
    const el = render(React.createElement(Combobox, { label: 'Tags', name: 'tags', multiple: true, options, values, onSearch, onChange })).firstElementChild as any;
    await el.updateComplete;
    expect(el.options).toBe(options);
    expect(el.values).toBe(values);
    expect(el.getAttribute('options')).toBeNull();
    const input = el.shadowRoot.querySelector('input') as HTMLInputElement;
    act(() => { input.value = 'cot'; input.dispatchEvent(new Event('input', { bubbles: true, composed: true })); });
    await el.updateComplete;
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch.mock.calls[0][0].detail).toEqual({ query: 'cot' });
    act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true })); });
    await el.updateComplete;
    act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true })); });
    await el.updateComplete;
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(el.values).toEqual(['silk', 'cotton']);
  });

  it('GlobalSearch: results by reference; onSearch from typing and onSelect (cancelable) from choosing', async () => {
    const onSearch = vi.fn();
    const onSelect = vi.fn((e: CustomEvent) => e.preventDefault());
    const results = [{ label: 'Leads', total: 3, href: '#leads', items: [{ title: 'Ravi Stores', description: 'Lead', href: '#lead-1' }] }];
    const el = render(React.createElement(GlobalSearch, { label: 'Search the CRM', results, onSearch, onSelect })).firstElementChild as any;
    await el.updateComplete;
    expect(el.results).toBe(results);
    expect(el.getAttribute('results')).toBeNull();
    const input = el.shadowRoot.querySelector('input') as HTMLInputElement;
    act(() => { input.value = 'ravi'; input.dispatchEvent(new Event('input', { bubbles: true, composed: true })); });
    await el.updateComplete;
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch.mock.calls[0][0].detail).toEqual({ query: 'ravi' });
    act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true, cancelable: true })); });
    await el.updateComplete;
    act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true })); });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].detail).toEqual({ href: '#lead-1', item: results[0].items[0], group: results[0] });
    expect(location.hash).not.toBe('#lead-1');
  });

  it('NotificationPanel: markAllRead, loading and onMarkAllRead; HeaderBar takes a search child', async () => {
    const onMarkAllRead = vi.fn();
    const items = [{ label: 'Call Ravi Stores', description: 'Follow-up due at 4 pm', icon: 'clock', unread: true }];
    const el = render(React.createElement(NotificationPanel, { items, markAllRead: true, onMarkAllRead })).firstElementChild as any;
    await el.updateComplete;
    expect(el.markAllRead).toBe(true);
    act(() => el.show());
    await el.updateComplete;
    act(() => el.shadowRoot.querySelector('.mark').click());
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
    expect(el.shadowRoot.querySelector('.desc').textContent).toBe('Follow-up due at 4 pm');
    act(() => el.close());
    act(() => root!.unmount());
    host!.remove();
    const bar = render(React.createElement(HeaderBar, { userName: 'Asha' }, React.createElement(GlobalSearch, { slot: 'search' }))).firstElementChild as any;
    await bar.updateComplete;
    expect(bar.querySelector(':scope > cm-global-search[slot="search"]')).toBeTruthy();
  });

  it('DatePicker: controlled value, disabledDates by reference and onChange when a date is picked', async () => {
    const onChange = vi.fn();
    const disabledDates = ['2026-11-20'];
    const el = render(React.createElement(DatePicker, { label: 'Ship by', locale: 'en-GB', value: '2026-11-15', disabledDates, onChange })).firstElementChild as any;
    await el.updateComplete;
    expect(el.disabledDates).toBe(disabledDates);
    expect(el.shadowRoot.querySelector('input').value).toBe('15/11/2026');
    act(() => root!.render(React.createElement(DatePicker, { label: 'Ship by', locale: 'en-GB', value: '2026-11-16', disabledDates, onChange })));
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('input').value).toBe('16/11/2026');
    act(() => el.shadowRoot.querySelector('.trigger').click());
    await el.updateComplete;
    act(() => el.shadowRoot.querySelector('td[data-date="2026-11-18"]').click());
    await el.updateComplete;
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(el.value).toBe('2026-11-18');
  });

  it('DateRangePicker: presets as an array property and onChange from a preset', async () => {
    const onChange = vi.fn();
    const presets = [{ label: 'Diwali week', start: '2026-11-06', end: '2026-11-12' }];
    const el = render(React.createElement(DateRangePicker, { label: 'Orders', presets, onChange })).firstElementChild as any;
    await el.updateComplete;
    expect(el.presets).toBe(presets);
    act(() => el.shadowRoot.querySelector('.trigger').click());
    await el.updateComplete;
    act(() => el.shadowRoot.querySelector('.preset').click());
    await el.updateComplete;
    expect(onChange).toHaveBeenCalledTimes(1);
    expect([el.start, el.end]).toEqual(['2026-11-06', '2026-11-12']);
  });

  it('Checkbox onChange fires when the user clicks it', async () => {
    const onChange = vi.fn();
    const el = render(React.createElement(Checkbox, { label: 'Track stock', onChange })).firstElementChild as any;
    await el.updateComplete;
    act(() => (el.shadowRoot.querySelector('input') as HTMLInputElement).click());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(el.checked).toBe(true);
  });

  it('Modal opens from the open prop and onClose can keep it open', async () => {
    const onClose = vi.fn((e: Event) => e.preventDefault());
    const el = render(React.createElement(Modal, { heading: 'Delete product?', open: true, onClose }, 'This cannot be undone.'))
      .firstElementChild as any;
    await el.updateComplete;
    expect(el.open).toBe(true);
    act(() => (el.shadowRoot.querySelector('button.x') as HTMLButtonElement).click());
    await el.updateComplete;
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose.mock.calls[0][0].detail.reason).toBe('close-button');
    expect(el.open).toBe(true);
  });

  it('AppFrame places the parts by slot, and SideNavigation reports onCollapse so the app can keep the choice', async () => {
    const { AppFrame, SideNavigation, NavItemElement: NavItem, BottomNavigation } = Wrappers;
    const onCollapse = vi.fn();
    const onMenuToggle = vi.fn();
    function Shell() {
      const [collapsed, setCollapsed] = React.useState(false);
      return React.createElement(AppFrame, { menuItem: 'more', onMenuToggle },
        React.createElement(SideNavigation, { slot: 'navigation', collapsible: true, collapsed,
          onCollapse: (e: CustomEvent<{ collapsed: boolean }>) => { onCollapse(e.detail.collapsed); setCollapsed(e.detail.collapsed); } },
          React.createElement(NavItem, { label: 'Orders', icon: 'bag', href: '#orders' })),
        React.createElement('p', null, 'Page'),
        React.createElement(BottomNavigation, { slot: 'bottom-navigation' }, React.createElement(NavItem, { label: 'More', icon: 'more', value: 'more' })));
    }
    const h = render(React.createElement(Shell));
    const frame = h.querySelector('cm-app-frame') as any, nav = h.querySelector('cm-side-navigation') as any;
    await frame.updateComplete; await nav.updateComplete;
    expect(frame.menuItem).toBe('more');
    expect((frame.shadowRoot.querySelector('main slot') as HTMLSlotElement).assignedElements()[0].localName).toBe('p');
    act(() => (nav.shadowRoot.querySelector('[part="collapse-button"]') as HTMLButtonElement).click());
    await nav.updateComplete;
    expect(onCollapse).toHaveBeenCalledWith(true);
    expect(nav.collapsed).toBe(true);
    const bottom = h.querySelector('cm-bottom-navigation') as any;
    await bottom.updateComplete;
    act(() => (bottom.shadowRoot.querySelector('.item') as HTMLButtonElement).click());
    expect(onMenuToggle).toHaveBeenCalledTimes(1);
    expect(onMenuToggle.mock.calls[0][0].detail.open).toBe(true);
  });
});
