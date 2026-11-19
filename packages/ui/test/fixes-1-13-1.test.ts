// 1.13.1: cm-text-field used to ignore the browser's email and web address checks (any text was valid) and treated
// text that isn't a number as empty. Typed with the real keyboard, as a person would.
import { describe, it, expect, beforeEach } from 'vitest';
import { userEvent } from '@vitest/browser/context';
import '../src/index.js';
import type { CmTextField } from '../src/index.js';

const field = async (attrs: string) => {
  document.body.innerHTML = `<form><cm-text-field label="Field" ${attrs}></cm-text-field><button>Save</button></form>`;
  const el = document.querySelector('cm-text-field') as CmTextField;
  await el.updateComplete;
  return el;
};
const typeAndLeave = async (el: CmTextField, text: string) => {
  const input = el.shadowRoot!.querySelector('input')!;
  input.focus(); // focus, not click: the real pointer is shared with test files running beside this one
  input.select();
  await userEvent.keyboard('{Backspace}');
  if (text) await userEvent.keyboard(text);
  await userEvent.keyboard('{Tab}');
  await el.updateComplete;
};

describe('cm-text-field type checks (1.13.1)', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('type="email" rejects text that is not an email address, and accepts a real one', async () => {
    const el = await field('type="email" name="email"');
    await typeAndLeave(el, 'not-an-email');
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.typeMismatch).toBe(true);
    expect(el.validationMessage).toBe('Enter an email address like name@example.com.');
    expect((document.querySelector('form') as HTMLFormElement).checkValidity()).toBe(false);
    await typeAndLeave(el, 'ravi@example.com');
    expect(el.checkValidity()).toBe(true);
  });

  it('type="url" rejects text that is not a full web address', async () => {
    const el = await field('type="url"');
    await typeAndLeave(el, 'hello');
    expect(el.validity.typeMismatch).toBe(true);
    expect(el.validationMessage).toBe('Enter a web address like https://example.com.');
    await typeAndLeave(el, 'https://example.com');
    expect(el.checkValidity()).toBe(true);
  });

  it('type="number" says "Enter a number." for text that is not a number, even when not required', async () => {
    const el = await field('type="number"');
    await typeAndLeave(el, '1e');
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.badInput).toBe(true);
    expect(el.validationMessage).toBe('Enter a number.');
    await typeAndLeave(el, '12');
    expect(el.checkValidity()).toBe(true);
  });

  it('an empty optional email or url field stays valid; required still says "fill in"', async () => {
    expect((await field('type="email"')).checkValidity()).toBe(true);
    expect((await field('type="url"')).checkValidity()).toBe(true);
    const req = await field('type="email" required');
    expect(req.checkValidity()).toBe(false);
    expect(req.validity.valueMissing).toBe(true);
  });

  it('an app error still wins over the type check', async () => {
    const el = await field('type="email"');
    await typeAndLeave(el, 'nope');
    el.error = 'This email is already used.'; await el.updateComplete;
    expect(el.validity.customError).toBe(true);
    expect(el.validationMessage).toBe('This email is already used.');
  });
});
