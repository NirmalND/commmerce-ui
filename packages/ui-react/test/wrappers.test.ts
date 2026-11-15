import { describe, it, expect, afterEach, vi } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import * as Wrappers from '../src/index';
// The manifest `cem analyze` writes from the components' JSDoc: the same source as the docs properties tables.
import manifest from '../../ui/dist/custom-elements.json';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

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
  const { TextField, Button, Select, Modal, Pagination, Checkbox } = Wrappers;

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

  it('Select takes options as an array property', async () => {
    const options = [{ value: 'a', label: 'Apples' }, { value: 'b', label: 'Bananas' }];
    const el = render(React.createElement(Select, { label: 'Fruit', options, value: 'b' })).firstElementChild as any;
    await el.updateComplete;
    expect(el.options).toBe(options);
    expect(el.value).toBe('b');
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
});
